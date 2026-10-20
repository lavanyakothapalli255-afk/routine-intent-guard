"""Tests for the deterministic routine-validation engine."""

from pathlib import Path
import sys

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.guard import validate_routine, SECURITY_SENSITIVE_ACTIONS
from app.models import (
    Device,
    ProposedAction,
    RoutineProposal,
    ValidationResult,
    ValidationStatus,
    ViolationCode,
)


@pytest.fixture
def sample_devices() -> dict[str, Device]:
    """Standard device registry fixture for unit tests."""
    return {
        "living_room_light": Device(
            id="living_room_light",
            room="living_room",
            supported_actions=["turn_on", "turn_off", "set_brightness"],
            current_state={"power": "off", "brightness": 0},
        ),
        "bedroom_light": Device(
            id="bedroom_light",
            room="bedroom",
            supported_actions=["turn_on", "turn_off"],
            current_state={"power": "off"},
        ),
        "living_room_thermostat": Device(
            id="living_room_thermostat",
            room="living_room",
            supported_actions=["set_temperature", "turn_off"],
            current_state={"target_temperature": 70},
        ),
        "front_door_lock": Device(
            id="front_door_lock",
            room="entryway",
            supported_actions=["lock", "unlock"],
            current_state={"locked": True},
        ),
    }


# 1. Valid routine test
def test_valid_routine(sample_devices: dict[str, Device]) -> None:
    """A routine with valid actions within permitted scope returns VALID."""
    proposal = RoutineProposal(
        routine_id="routine-valid-1",
        user_instruction="Turn off living room light and set thermostat to 68",
        included_rooms=["living_room"],
        actions=[
            ProposedAction(device_id="living_room_light", action="turn_off"),
            ProposedAction(device_id="living_room_thermostat", action="set_temperature"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.VALID
    assert result.is_valid is True
    assert result.is_blocked is False
    assert result.is_needs_approval is False
    assert result.violation_codes == []
    assert result.explanations == []
    assert result.affected_device_ids == []


# 2. Explicitly excluded device test
def test_explicitly_excluded_device(sample_devices: dict[str, Device]) -> None:
    """An action targeting an explicitly excluded device returns BLOCKED."""
    proposal = RoutineProposal(
        routine_id="routine-excluded-dev",
        user_instruction="Turn off lights but leave living room light untouched",
        excluded_devices=["living_room_light"],
        actions=[
            ProposedAction(device_id="bedroom_light", action="turn_off"),
            ProposedAction(device_id="living_room_light", action="turn_off"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.EXCLUDED_DEVICE.value in result.violation_codes
    assert "living_room_light" in result.affected_device_ids
    assert any("living_room_light" in exp for exp in result.explanations)


# 3. Explicitly excluded room test
def test_explicitly_excluded_room(sample_devices: dict[str, Device]) -> None:
    """An action targeting a device in an explicitly excluded room returns BLOCKED."""
    proposal = RoutineProposal(
        routine_id="routine-excluded-room",
        user_instruction="Do not touch the bedroom",
        excluded_rooms=["bedroom"],
        actions=[
            ProposedAction(device_id="bedroom_light", action="turn_off"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.EXCLUDED_ROOM.value in result.violation_codes
    assert "bedroom_light" in result.affected_device_ids
    assert any("bedroom" in exp for exp in result.explanations)


# 4. Out-of-scope action tests
def test_out_of_scope_room_action(sample_devices: dict[str, Device]) -> None:
    """An action targeting a room outside included_rooms returns BLOCKED."""
    proposal = RoutineProposal(
        routine_id="routine-scope-room",
        user_instruction="Only manage living room",
        included_rooms=["living_room"],
        actions=[
            ProposedAction(device_id="bedroom_light", action="turn_off"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.OUT_OF_SCOPE.value in result.violation_codes
    assert "bedroom_light" in result.affected_device_ids
    assert any("outside the specified scope of included rooms" in exp for exp in result.explanations)


def test_out_of_scope_device_action(sample_devices: dict[str, Device]) -> None:
    """An action targeting a device outside included_devices returns BLOCKED."""
    proposal = RoutineProposal(
        routine_id="routine-scope-dev",
        user_instruction="Only adjust the thermostat",
        included_devices=["living_room_thermostat"],
        actions=[
            ProposedAction(device_id="living_room_light", action="turn_off"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.OUT_OF_SCOPE.value in result.violation_codes
    assert "living_room_light" in result.affected_device_ids
    assert any("outside the specified scope of included devices" in exp for exp in result.explanations)


# 5. Unknown device test
def test_unknown_device(sample_devices: dict[str, Device]) -> None:
    """An action targeting an unmapped device returns BLOCKED without crashing."""
    proposal = RoutineProposal(
        routine_id="routine-unknown-dev",
        user_instruction="Turn off nonexistent device",
        actions=[
            ProposedAction(device_id="phantom_lamp_999", action="turn_off"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.UNKNOWN_DEVICE.value in result.violation_codes
    assert "phantom_lamp_999" in result.affected_device_ids
    assert any("phantom_lamp_999" in exp for exp in result.explanations)


# 6. Unsupported action test
def test_unsupported_action(sample_devices: dict[str, Device]) -> None:
    """An action not supported by the target device returns BLOCKED."""
    proposal = RoutineProposal(
        routine_id="routine-unsupported-act",
        user_instruction="Set temperature on a light bulb",
        actions=[
            ProposedAction(device_id="living_room_light", action="set_temperature"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.is_blocked is True
    assert ViolationCode.UNSUPPORTED_ACTION.value in result.violation_codes
    assert "living_room_light" in result.affected_device_ids
    assert any("not supported" in exp for exp in result.explanations)


# 7. Deterministic repeatability test
def test_deterministic_repeatability(sample_devices: dict[str, Device]) -> None:
    """Validation is pure and returns identical results across repeated runs."""
    proposals = [
        # Valid proposal
        RoutineProposal(
            routine_id="r1",
            user_instruction="Turn on bedroom light",
            actions=[ProposedAction(device_id="bedroom_light", action="turn_on")],
        ),
        # Blocked proposal
        RoutineProposal(
            routine_id="r2",
            user_instruction="Turn off excluded light",
            excluded_devices=["bedroom_light"],
            actions=[ProposedAction(device_id="bedroom_light", action="turn_off")],
        ),
        # Needs approval proposal
        RoutineProposal(
            routine_id="r3",
            user_instruction="Unlock the front door",
            actions=[ProposedAction(device_id="front_door_lock", action="unlock")],
        ),
    ]

    for proposal in proposals:
        baseline = validate_routine(proposal, sample_devices)
        for _ in range(50):
            repeated = validate_routine(proposal, sample_devices)
            assert repeated.status == baseline.status
            assert repeated.violation_codes == baseline.violation_codes
            assert repeated.explanations == baseline.explanations
            assert repeated.affected_device_ids == baseline.affected_device_ids


# 8. Blocked result cannot be changed to VALID by client flag
def test_blocked_cannot_be_overridden_by_unrelated_flag(sample_devices: dict[str, Device]) -> None:
    """A client boolean flag (force, approved, etc.) cannot bypass a BLOCKED result."""
    proposal = RoutineProposal(
        routine_id="routine-bypass-attempt",
        user_instruction="Turn off excluded device with force flag",
        excluded_devices=["living_room_light"],
        actions=[
            ProposedAction(device_id="living_room_light", action="turn_off"),
        ],
        force=True,
        approved=True,
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert result.status != ValidationStatus.VALID
    assert ViolationCode.EXCLUDED_DEVICE.value in result.violation_codes


# 9. Hard violation takes precedence over any approval requirement
def test_hard_violation_takes_precedence_over_approval(sample_devices: dict[str, Device]) -> None:
    """A hard violation takes absolute precedence over an approval requirement."""
    # Scenario A: Security-sensitive action (unlock) targeting an excluded device
    proposal_excluded_dev = RoutineProposal(
        routine_id="prec-1",
        user_instruction="Unlock excluded front door lock",
        excluded_devices=["front_door_lock"],
        actions=[
            ProposedAction(device_id="front_door_lock", action="unlock"),
        ],
    )
    result_a = validate_routine(proposal_excluded_dev, sample_devices)
    assert result_a.status == ValidationStatus.BLOCKED
    assert result_a.status != ValidationStatus.NEEDS_APPROVAL
    assert ViolationCode.EXCLUDED_DEVICE.value in result_a.violation_codes

    # Scenario B: Security-sensitive action in an excluded room
    proposal_excluded_room = RoutineProposal(
        routine_id="prec-2",
        user_instruction="Unlock front door when entryway is excluded",
        excluded_rooms=["entryway"],
        actions=[
            ProposedAction(device_id="front_door_lock", action="unlock"),
        ],
    )
    result_b = validate_routine(proposal_excluded_room, sample_devices)
    assert result_b.status == ValidationStatus.BLOCKED
    assert result_b.status != ValidationStatus.NEEDS_APPROVAL
    assert ViolationCode.EXCLUDED_ROOM.value in result_b.violation_codes

    # Scenario C: Security-sensitive action outside included rooms scope
    proposal_out_of_scope = RoutineProposal(
        routine_id="prec-3",
        user_instruction="Scope restricted to living room only",
        included_rooms=["living_room"],
        actions=[
            ProposedAction(device_id="front_door_lock", action="unlock"),
        ],
    )
    result_c = validate_routine(proposal_out_of_scope, sample_devices)
    assert result_c.status == ValidationStatus.BLOCKED
    assert result_c.status != ValidationStatus.NEEDS_APPROVAL
    assert ViolationCode.OUT_OF_SCOPE.value in result_c.violation_codes

    # Scenario D: Valid unlock mixed with an unknown device
    proposal_with_unknown = RoutineProposal(
        routine_id="prec-4",
        user_instruction="Unlock front door and trigger mystery device",
        actions=[
            ProposedAction(device_id="front_door_lock", action="unlock"),
            ProposedAction(device_id="mystery_device_007", action="activate"),
        ],
    )
    result_d = validate_routine(proposal_with_unknown, sample_devices)
    assert result_d.status == ValidationStatus.BLOCKED
    assert result_d.status != ValidationStatus.NEEDS_APPROVAL
    assert ViolationCode.UNKNOWN_DEVICE.value in result_d.violation_codes


# Additional test: Documented approval rule verification
def test_needs_approval_for_security_sensitive_action(sample_devices: dict[str, Device]) -> None:
    """Security-sensitive actions require human approval when no hard violations exist."""
    proposal = RoutineProposal(
        routine_id="routine-approval-1",
        user_instruction="Unlock front door for guest",
        actions=[
            ProposedAction(device_id="front_door_lock", action="unlock"),
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.NEEDS_APPROVAL
    assert result.is_needs_approval is True
    assert result.is_valid is False
    assert result.is_blocked is False
    assert ViolationCode.REQUIRES_APPROVAL.value in result.violation_codes
    assert "front_door_lock" in result.affected_device_ids
    assert any("human approval" in exp.lower() for exp in result.explanations)


# Additional test: Multiple hard violations across actions
def test_multiple_hard_violations_collected(sample_devices: dict[str, Device]) -> None:
    """Multiple hard violations across different actions are comprehensively collected."""
    proposal = RoutineProposal(
        routine_id="routine-multi-violation",
        user_instruction="Complex routine with multiple violations",
        excluded_devices=["living_room_light"],
        excluded_rooms=["bedroom"],
        actions=[
            ProposedAction(device_id="living_room_light", action="turn_off"),  # Excluded device
            ProposedAction(device_id="bedroom_light", action="turn_off"),      # Excluded room
            ProposedAction(device_id="unknown_sensor", action="read"),         # Unknown device
        ],
    )

    result = validate_routine(proposal, sample_devices)

    assert result.status == ValidationStatus.BLOCKED
    assert ViolationCode.EXCLUDED_DEVICE.value in result.violation_codes
    assert ViolationCode.EXCLUDED_ROOM.value in result.violation_codes
    assert ViolationCode.UNKNOWN_DEVICE.value in result.violation_codes
    assert "living_room_light" in result.affected_device_ids
    assert "bedroom_light" in result.affected_device_ids
    assert "unknown_sensor" in result.affected_device_ids


# Additional test: Support sequence and dictionary device inputs
def test_device_input_formats(sample_devices: dict[str, Device]) -> None:
    """Validator handles Sequence[Device], Mapping[str, Device], or raw dicts."""
    proposal = RoutineProposal(
        routine_id="routine-formats",
        user_instruction="Turn off bedroom light",
        actions=[ProposedAction(device_id="bedroom_light", action="turn_off")],
    )

    # 1. As list of Device models
    res_list = validate_routine(proposal, list(sample_devices.values()))
    assert res_list.status == ValidationStatus.VALID

    # 2. As raw dict of dicts
    devices_raw = {k: v.model_dump() for k, v in sample_devices.items()}
    res_raw = validate_routine(proposal, devices_raw)
    assert res_raw.status == ValidationStatus.VALID
