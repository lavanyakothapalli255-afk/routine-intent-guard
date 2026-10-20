"""Deterministic routine-validation engine.

Validates proposed smart-home routines against device capabilities,
explicit room/device exclusions, explicit inclusion scopes, and
security policies requiring human approval.

Pure functional implementation:
- No LLM calls
- No external APIs or n8n dependencies
- Independent of HTTP routes and web frameworks
- Deterministic and idempotent
"""

from __future__ import annotations

from typing import Iterable, Mapping, Sequence, Union
from app.models import (
    Device,
    ProposedAction,
    RoutineProposal,
    ValidationResult,
    ValidationStatus,
    ViolationCode,
)

# Documented Human Approval Rule:
# Smart-home actions that modify physical entry points or disarm security systems
# (such as unlocking doors, opening garages/gates, or disarming alarms) carry
# significant real-world physical security risks.
# In accordance with smart-home safety principles, automated routines proposing
# these actions must never execute autonomously without explicit human approval.
SECURITY_SENSITIVE_ACTIONS: frozenset[str] = frozenset({
    "unlock",
    "disarm",
    "open_garage",
    "open_door",
    "open_gate",
})


def validate_routine(
    proposal: Union[RoutineProposal, dict],
    devices: Union[Mapping[str, Union[Device, dict]], Sequence[Union[Device, dict]]],
) -> ValidationResult:
    """Validate a proposed routine against devices and safety constraints.

    Evaluates:
    1. Unknown device IDs.
    2. Explicitly excluded devices.
    3. Explicitly excluded rooms.
    4. Out-of-scope actions (when included_rooms or included_devices are specified).
    5. Actions unsupported by known devices.
    6. Security-sensitive actions requiring human approval.

    Precedence:
    Any hard validation violation (1-5) immediately results in a BLOCKED status,
    taking absolute precedence over any approval requirement.

    Args:
        proposal: RoutineProposal object or equivalent dictionary.
        devices: Mapping of device_id -> Device, or sequence of Device objects.

    Returns:
        ValidationResult with status (VALID, NEEDS_APPROVAL, or BLOCKED),
        stable violation codes, human-readable explanations, and affected device IDs.
    """
    # Defensive input parsing
    if isinstance(proposal, dict):
        proposal = RoutineProposal(**proposal)

    # Normalize device registry to dict[str, Device]
    device_map: dict[str, Device] = {}
    if isinstance(devices, Mapping):
        for key, val in devices.items():
            device_map[key] = val if isinstance(val, Device) else Device(**val)
    elif isinstance(devices, Iterable):
        for item in devices:
            dev = item if isinstance(item, Device) else Device(**item)
            device_map[dev.id] = dev

    # Normalization of scope and exclusion sets for fast lookup
    excluded_devices = set(proposal.excluded_devices)
    excluded_rooms = set(proposal.excluded_rooms)
    included_devices = (
        set(proposal.included_devices) if proposal.included_devices is not None else None
    )
    included_rooms = (
        set(proposal.included_rooms) if proposal.included_rooms is not None else None
    )

    hard_violations: list[tuple[ViolationCode, str, str]] = []
    approval_triggers: list[tuple[ViolationCode, str, str]] = []

    for action in proposal.actions:
        dev_id = action.device_id
        act_name = action.action

        # Check 1: Unknown device ID
        if dev_id not in device_map:
            hard_violations.append((
                ViolationCode.UNKNOWN_DEVICE,
                f"Device '{dev_id}' is not recognized in the device registry.",
                dev_id,
            ))
            # If the unknown device was also explicitly excluded, note it as well
            if dev_id in excluded_devices:
                hard_violations.append((
                    ViolationCode.EXCLUDED_DEVICE,
                    f"Action '{act_name}' targets device '{dev_id}', which is explicitly excluded.",
                    dev_id,
                ))
            # If device scope was restricted, check that too
            if included_devices is not None and dev_id not in included_devices:
                hard_violations.append((
                    ViolationCode.OUT_OF_SCOPE,
                    f"Action '{act_name}' targets device '{dev_id}', which is outside the specified scope of included devices: {proposal.included_devices}.",
                    dev_id,
                ))
            # Unknown device cannot have room or supported actions inspected
            continue

        device = device_map[dev_id]
        dev_room = device.room

        # Check 2: Explicitly excluded device
        if dev_id in excluded_devices:
            hard_violations.append((
                ViolationCode.EXCLUDED_DEVICE,
                f"Action '{act_name}' targets device '{dev_id}', which is explicitly excluded.",
                dev_id,
            ))

        # Check 3: Explicitly excluded room
        if dev_room in excluded_rooms:
            hard_violations.append((
                ViolationCode.EXCLUDED_ROOM,
                f"Action '{act_name}' targets device '{dev_id}' in room '{dev_room}', which is explicitly excluded.",
                dev_id,
            ))

        # Check 4: Scope restrictions (out-of-scope room or device)
        if included_rooms is not None and dev_room not in included_rooms:
            hard_violations.append((
                ViolationCode.OUT_OF_SCOPE,
                f"Action '{act_name}' targets device '{dev_id}' in room '{dev_room}', which is outside the specified scope of included rooms: {proposal.included_rooms}.",
                dev_id,
            ))

        if included_devices is not None and dev_id not in included_devices:
            hard_violations.append((
                ViolationCode.OUT_OF_SCOPE,
                f"Action '{act_name}' targets device '{dev_id}', which is outside the specified scope of included devices: {proposal.included_devices}.",
                dev_id,
            ))

        # Check 5: Action unsupported by known device
        if act_name not in device.supported_actions:
            supported = sorted(list(device.supported_actions))
            hard_violations.append((
                ViolationCode.UNSUPPORTED_ACTION,
                f"Action '{act_name}' is not supported by device '{dev_id}'. Supported actions: {supported}.",
                dev_id,
            ))

        # Check 6: Documented human approval rule for security-sensitive actions
        if act_name.lower() in SECURITY_SENSITIVE_ACTIONS:
            approval_triggers.append((
                ViolationCode.REQUIRES_APPROVAL,
                f"Action '{act_name}' on device '{dev_id}' is a security-sensitive operation requiring explicit human approval.",
                dev_id,
            ))

    # Determine final outcome status according to precedence rules:
    # 1. Hard violations always result in BLOCKED, overriding any approval requirement.
    # 2. In absence of hard violations, security-sensitive actions trigger NEEDS_APPROVAL.
    # 3. Otherwise, routine is VALID.
    if hard_violations:
        status = ValidationStatus.BLOCKED
        violation_codes = list(dict.fromkeys(code.value for code, _, _ in hard_violations))
        explanations = [exp for _, exp, _ in hard_violations]
        affected_device_ids = list(dict.fromkeys(dev_id for _, _, dev_id in hard_violations))
    elif approval_triggers:
        status = ValidationStatus.NEEDS_APPROVAL
        violation_codes = list(dict.fromkeys(code.value for code, _, _ in approval_triggers))
        explanations = [exp for _, exp, _ in approval_triggers]
        affected_device_ids = list(dict.fromkeys(dev_id for _, _, dev_id in approval_triggers))
    else:
        status = ValidationStatus.VALID
        violation_codes = []
        explanations = []
        affected_device_ids = []

    return ValidationResult(
        status=status,
        violation_codes=violation_codes,
        explanations=explanations,
        affected_device_ids=affected_device_ids,
    )
