"""API tests for Routine Intent Guard FastAPI endpoints."""

from pathlib import Path
import sys

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def sample_payload() -> dict:
    """Standard valid payload containing a routine proposal and device catalogue."""
    return {
        "proposal": {
            "routine_id": "routine-goodnight",
            "user_instruction": "Turn off living room light and lock front door",
            "included_rooms": ["living_room", "entryway"],
            "actions": [
                {"device_id": "living_room_light", "action": "turn_off"},
                {"device_id": "front_door_lock", "action": "lock"},
            ],
        },
        "devices": [
            {
                "id": "living_room_light",
                "room": "living_room",
                "supported_actions": ["turn_on", "turn_off", "set_brightness"],
                "current_state": {"power": "on"},
            },
            {
                "id": "front_door_lock",
                "room": "entryway",
                "supported_actions": ["lock", "unlock"],
                "current_state": {"locked": False},
            },
        ],
    }


# 1. Valid routine returning VALID
def test_api_valid_routine_returns_valid(sample_payload: dict) -> None:
    """A valid routine proposal returns HTTP 200 with status VALID."""
    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "VALID"
    assert data["violation_codes"] == []
    assert data["explanations"] == []
    assert data["affected_device_ids"] == []


# 2. Explicitly excluded device returning BLOCKED
def test_api_explicitly_excluded_device_returns_blocked(sample_payload: dict) -> None:
    """An action targeting an explicitly excluded device returns HTTP 200 with status BLOCKED."""
    sample_payload["proposal"]["excluded_devices"] = ["living_room_light"]

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert "EXCLUDED_DEVICE" in data["violation_codes"]
    assert "living_room_light" in data["affected_device_ids"]
    assert any("living_room_light" in exp for exp in data["explanations"])


# 3. Unknown device returning BLOCKED
def test_api_unknown_device_returns_blocked(sample_payload: dict) -> None:
    """An action targeting an unknown device returns HTTP 200 with status BLOCKED without crashing."""
    sample_payload["proposal"]["actions"].append(
        {"device_id": "phantom_lamp_999", "action": "turn_off"}
    )

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert "UNKNOWN_DEVICE" in data["violation_codes"]
    assert "phantom_lamp_999" in data["affected_device_ids"]


# 4. Security-sensitive action returning NEEDS_APPROVAL
def test_api_security_sensitive_action_returns_needs_approval(sample_payload: dict) -> None:
    """An action with security implications returns HTTP 200 with status NEEDS_APPROVAL."""
    # Action 'unlock' is in SECURITY_SENSITIVE_ACTIONS
    sample_payload["proposal"]["actions"] = [
        {"device_id": "front_door_lock", "action": "unlock"}
    ]

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NEEDS_APPROVAL"
    assert "REQUIRES_APPROVAL" in data["violation_codes"]
    assert "front_door_lock" in data["affected_device_ids"]
    assert any("human approval" in exp.lower() for exp in data["explanations"])


# 5. Hard violation taking precedence over security-sensitive action
def test_api_hard_violation_takes_precedence_over_approval(sample_payload: dict) -> None:
    """A hard violation takes absolute precedence over an approval requirement, returning BLOCKED."""
    # 'unlock' requires approval, but 'front_door_lock' is explicitly excluded
    sample_payload["proposal"]["excluded_devices"] = ["front_door_lock"]
    sample_payload["proposal"]["actions"] = [
        {"device_id": "front_door_lock", "action": "unlock"}
    ]

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["status"] != "NEEDS_APPROVAL"
    assert "EXCLUDED_DEVICE" in data["violation_codes"]


# 6. Malformed requests return appropriate 4xx responses
def test_api_malformed_missing_devices(sample_payload: dict) -> None:
    """Missing the devices catalogue field returns HTTP 422."""
    del sample_payload["devices"]
    response = client.post("/routine/validate", json=sample_payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_api_malformed_missing_proposal(sample_payload: dict) -> None:
    """Missing the proposal field returns HTTP 422."""
    del sample_payload["proposal"]
    response = client.post("/routine/validate", json=sample_payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_api_malformed_empty_instruction(sample_payload: dict) -> None:
    """An empty user instruction in proposal returns HTTP 422."""
    sample_payload["proposal"]["user_instruction"] = ""
    response = client.post("/routine/validate", json=sample_payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_api_malformed_empty_action_name(sample_payload: dict) -> None:
    """An empty action name in an action returns HTTP 422."""
    sample_payload["proposal"]["actions"] = [{"device_id": "living_room_light", "action": ""}]
    response = client.post("/routine/validate", json=sample_payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_api_malformed_invalid_json() -> None:
    """Non-JSON body returns HTTP 422."""
    response = client.post(
        "/routine/validate",
        content="this is not valid json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422


# 7. Client override flags do not bypass BLOCKED status
def test_api_client_override_flags_ignored(sample_payload: dict) -> None:
    """Supplying force=True or approved=True in payload does not change BLOCKED to VALID."""
    sample_payload["proposal"]["excluded_devices"] = ["living_room_light"]
    sample_payload["proposal"]["force"] = True
    sample_payload["proposal"]["approved"] = True
    sample_payload["force"] = True
    sample_payload["approved"] = True

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["status"] != "VALID"
    assert "EXCLUDED_DEVICE" in data["violation_codes"]


# 8. Device catalogue supplied as a dictionary
def test_api_devices_as_dictionary(sample_payload: dict) -> None:
    """Supplying devices as a mapping of device_id to device object is supported."""
    dev_dict = {d["id"]: d for d in sample_payload["devices"]}
    sample_payload["devices"] = dev_dict

    response = client.post("/routine/validate", json=sample_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "VALID"
