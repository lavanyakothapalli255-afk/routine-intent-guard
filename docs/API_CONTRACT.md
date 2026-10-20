# Routine Intent Guard – Backend API Contract

This document provides the authoritative API specification for the Routine Intent Guard backend service based directly on the implementation in [`backend/app/main.py`](file:///backend/app/main.py), [`backend/app/models.py`](file:///backend/app/models.py), and [`backend/app/guard.py`](file:///backend/app/guard.py).

---

## 1. Getting Started & Running the Server

### Prerequisites & Setup
The backend requires Python 3.10+ and dependencies installed from `backend/requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`).

### Starting the Server
From the project root directory, run Uvicorn using the virtual environment:

```powershell
# Using the workspace virtual environment
.\backend\.venv\Scripts\uvicorn app.main:app --app-dir backend --reload --port 8000
```

Alternatively, from the `backend/` directory:

```bash
uvicorn app.main:app --reload --port 8000
```

### Server URLs & Interactive Documentation
- **Base URL:** `http://localhost:8000` (or `http://127.0.0.1:8000`)
- **Swagger UI (OpenAPI):** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **OpenAPI Schema (JSON):** `http://localhost:8000/openapi.json`

---

## 2. API Endpoints

### 2.1 Health Check

Checks if the service is running.

- **Method:** `GET`
- **Path:** `/health`
- **Authentication:** None
- **Response Model:** `HealthResponse`

#### Response: `200 OK`
```json
{
  "status": "ok",
  "service": "routine-intent-guard"
}
```

---

### 2.2 Validate Routine Proposal

Deterministically evaluates a structured routine proposal against a provided device catalogue and security guardrails.

- **Method:** `POST`
- **Path:** `/routine/validate`
- **Authentication:** None
- **Headers:** `Content-Type: application/json`
- **Request Model:** `RoutineValidationRequest`
- **Response Model:** `ValidationResult`

---

## 3. Request & Response Specifications

### 3.1 Request Payload (`RoutineValidationRequest`)

The request body bundles two core objects:
1. `proposal`: A structured routine proposal.
2. `devices`: A simulated device catalogue (supported as a list of device objects or as a key-value dictionary mapping `device_id` to device object).

#### Field Definitions

#### `proposal` (`RoutineProposal`)
| Field | Type | Required | Description |
|---|---|---|---|
| `routine_id` | `string` | **Yes** | Unique non-empty identifier for the routine. |
| `user_instruction` | `string` | **Yes** | Original non-empty user instruction string (also accepts alias `original_user_instruction`). |
| `included_rooms` | `list[string]` \| `null` | No (default: `null`) | Scope restriction: if set, actions targeting devices in rooms not listed here are blocked. |
| `included_devices` | `list[string]` \| `null` | No (default: `null`) | Scope restriction: if set, actions targeting devices not listed here are blocked. |
| `excluded_rooms` | `list[string]` | No (default: `[]`) | Explicitly prohibited rooms. Actions in these rooms are blocked. |
| `excluded_devices` | `list[string]` | No (default: `[]`) | Explicitly prohibited devices. Actions targeting these devices are blocked. |
| `actions` | `list[ProposedAction]` | No (default: `[]`) | Sequence of proposed device actions to validate. |
| `force` / `approved` | `boolean` | No (default: `false`) | Optional client flags; **strictly ignored** by the validator. Cannot bypass blocked status. |

#### `actions[]` (`ProposedAction`)
| Field | Type | Required | Description |
|---|---|---|---|
| `device_id` | `string` | **Yes** | Target device identifier (non-empty string). |
| `action` | `string` | **Yes** | Action name to execute (non-empty string, e.g., `"turn_on"`, `"unlock"`). |
| `parameters` | `object` | No (default: `{}`) | Optional action arguments/parameters. |

#### `devices` (`list[Device]` or `dict[string, Device]`)
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Stable unique device ID (auto-populated from dictionary key if dictionary format is used). |
| `room` | `string` | **Yes** | Room location of the device (non-empty string). |
| `supported_actions` | `list[string]` | No (default: `[]`) | List of actions valid for this device. |
| `current_state` | `object` | No (default: `{}`) | Key-value dictionary representing device state (e.g., `{"power": "on"}`). |

---

### 3.2 Response Payload (`ValidationResult`)

| Field | Type | Description |
|---|---|---|
| `status` | `string` | Validation outcome: `"VALID"`, `"NEEDS_APPROVAL"`, or `"BLOCKED"`. |
| `violation_codes` | `list[string]` | Stable machine-readable violation or approval trigger codes. |
| `explanations` | `list[string]` | Human-readable explanation messages for each finding. |
| `affected_device_ids` | `list[string]` | List of device IDs associated with violations or approval triggers. |

---

## 4. Status Outcomes & Decision Logic

The validation engine is pure and deterministic. It evaluates the following status outcomes:

| Status | Meaning | Conditions |
|---|---|---|
| `VALID` | Safe to execute automatically. | No hard validation violations exist, and no actions trigger approval rules. |
| `NEEDS_APPROVAL` | Human confirmation required. | No hard violations exist, but one or more actions trigger a documented safety policy (security-sensitive actions). |
| `BLOCKED` | Request prohibited. | At least one hard validation violation exists. **Hard violations take absolute precedence** over approval requirements. |

### Precedence Rule
If a routine contains both an action requiring approval (e.g. `unlock`) and a hard violation (e.g. targeting an excluded room or unknown device), the engine **always returns `BLOCKED`**. The approval requirement is superseded and never overrides a hard violation.

---

## 5. Violation Codes & Documented Rules

### Hard Violations (Result in `BLOCKED`)
| Code | Trigger Condition | Example Explanation |
|---|---|---|
| `UNKNOWN_DEVICE` | An action targets a `device_id` not found in the `devices` catalogue. Reported safely without server error. | `Device 'lamp_99' is not recognized in the device registry.` |
| `EXCLUDED_DEVICE` | An action targets a `device_id` listed in `proposal.excluded_devices`. | `Action 'turn_off' targets device 'living_room_light', which is explicitly excluded.` |
| `EXCLUDED_ROOM` | An action targets a device located in a room listed in `proposal.excluded_rooms`. | `Action 'turn_off' targets device 'bedroom_light' in room 'bedroom', which is explicitly excluded.` |
| `OUT_OF_SCOPE` | An action targets a device or room outside explicitly specified `included_rooms` or `included_devices`. | `Action 'turn_off' targets device 'bedroom_light' in room 'bedroom', which is outside the specified scope of included rooms: ['living_room'].` |
| `UNSUPPORTED_ACTION` | An action is not listed in the device's `supported_actions`. | `Action 'set_temperature' is not supported by device 'living_room_light'. Supported actions: ['turn_off', 'turn_on'].` |

### Documented Approval Rule (Results in `NEEDS_APPROVAL`)
| Code | Trigger Condition |
|---|---|
| `REQUIRES_APPROVAL` | An action is present in `SECURITY_SENSITIVE_ACTIONS`: `{"unlock", "disarm", "open_garage", "open_door", "open_gate"}`. In smart-home security, operations altering physical entry barriers or disarming alarms carry safety risks and require human sign-off before execution. |

---

## 6. Request & Response Examples

### Example 1: Valid Routine (`VALID`)

#### Request
```json
POST /routine/validate
Content-Type: application/json

{
  "proposal": {
    "routine_id": "routine-evening",
    "user_instruction": "Turn off living room light",
    "included_rooms": ["living_room"],
    "actions": [
      {
        "device_id": "living_room_light",
        "action": "turn_off"
      }
    ]
  },
  "devices": [
    {
      "id": "living_room_light",
      "room": "living_room",
      "supported_actions": ["turn_on", "turn_off"],
      "current_state": {"power": "on"}
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "status": "VALID",
  "violation_codes": [],
  "explanations": [],
  "affected_device_ids": []
}
```

---

### Example 2: Security-Sensitive Action (`NEEDS_APPROVAL`)

#### Request
```json
POST /routine/validate
Content-Type: application/json

{
  "proposal": {
    "routine_id": "routine-welcome-guest",
    "user_instruction": "Unlock front door for guest",
    "actions": [
      {
        "device_id": "front_door_lock",
        "action": "unlock"
      }
    ]
  },
  "devices": [
    {
      "id": "front_door_lock",
      "room": "entryway",
      "supported_actions": ["lock", "unlock"],
      "current_state": {"locked": true}
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "status": "NEEDS_APPROVAL",
  "violation_codes": [
    "REQUIRES_APPROVAL"
  ],
  "explanations": [
    "Action 'unlock' on device 'front_door_lock' is a security-sensitive operation requiring explicit human approval."
  ],
  "affected_device_ids": [
    "front_door_lock"
  ]
}
```

---

### Example 3: Excluded Device (`BLOCKED`)

#### Request
```json
POST /routine/validate
Content-Type: application/json

{
  "proposal": {
    "routine_id": "routine-sleep",
    "user_instruction": "Turn off all lights, but leave nightlight on",
    "excluded_devices": ["hallway_nightlight"],
    "actions": [
      {
        "device_id": "hallway_nightlight",
        "action": "turn_off"
      }
    ]
  },
  "devices": [
    {
      "id": "hallway_nightlight",
      "room": "hallway",
      "supported_actions": ["turn_on", "turn_off"],
      "current_state": {"power": "on"}
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "status": "BLOCKED",
  "violation_codes": [
    "EXCLUDED_DEVICE"
  ],
  "explanations": [
    "Action 'turn_off' targets device 'hallway_nightlight', which is explicitly excluded."
  ],
  "affected_device_ids": [
    "hallway_nightlight"
  ]
}
```

---

### Example 4: Hard Violation Taking Precedence Over Approval (`BLOCKED`)

#### Request
Even though `"unlock"` would normally require approval, the target device is explicitly excluded.

```json
POST /routine/validate
Content-Type: application/json

{
  "proposal": {
    "routine_id": "routine-override-attempt",
    "user_instruction": "Force unlock front door",
    "excluded_devices": ["front_door_lock"],
    "force": true,
    "approved": true,
    "actions": [
      {
        "device_id": "front_door_lock",
        "action": "unlock"
      }
    ]
  },
  "devices": [
    {
      "id": "front_door_lock",
      "room": "entryway",
      "supported_actions": ["lock", "unlock"],
      "current_state": {"locked": true}
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "status": "BLOCKED",
  "violation_codes": [
    "EXCLUDED_DEVICE"
  ],
  "explanations": [
    "Action 'unlock' targets device 'front_door_lock', which is explicitly excluded."
  ],
  "affected_device_ids": [
    "front_door_lock"
  ]
}
```

---

## 7. HTTP Status Codes & Error Handling

| HTTP Status | Reason | Response Format |
|---|---|---|
| `200 OK` | Validation evaluated successfully. The validation decision (`VALID`, `NEEDS_APPROVAL`, `BLOCKED`) is in the response body. | `ValidationResult` JSON object |
| `422 Unprocessable Entity` | Malformed request, missing required fields, empty string in required fields, or invalid types. | FastAPI standard validation error detail object |

### Example: HTTP 422 (Missing Required Field)
If `devices` is omitted:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "devices"],
      "msg": "Field required",
      "input": {
        "proposal": {
          "routine_id": "r1",
          "user_instruction": "turn off lights"
        }
      }
    }
  ]
}
```

---

## 8. Frontend Integration Example (`fetch`)

Below is a complete JavaScript/TypeScript snippet for integrating with the endpoint:

```typescript
interface ValidationResult {
  status: "VALID" | "NEEDS_APPROVAL" | "BLOCKED";
  violation_codes: string[];
  explanations: string[];
  affected_device_ids: string[];
}

async function validateRoutine(
  proposal: Record<string, any>,
  devices: Array<Record<string, any>>
): Promise<ValidationResult> {
  const response = await fetch("http://localhost:8000/routine/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ proposal, devices }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      `Request failed with HTTP ${response.status}: ${JSON.stringify(errorBody)}`
    );
  }

  const result: ValidationResult = await response.json();
  return result;
}

// Example usage:
const proposal = {
  routine_id: "evening-routine-1",
  user_instruction: "Lock front door and turn off living room light",
  actions: [
    { device_id: "front_door_lock", action: "lock" },
    { device_id: "living_room_light", action: "turn_off" },
  ],
};

const devices = [
  {
    id: "front_door_lock",
    room: "entryway",
    supported_actions: ["lock", "unlock"],
    current_state: { locked: false },
  },
  {
    id: "living_room_light",
    room: "living_room",
    supported_actions: ["turn_on", "turn_off"],
    current_state: { power: "on" },
  },
];

validateRoutine(proposal, devices)
  .then((result) => {
    switch (result.status) {
      case "VALID":
        console.log("Routine approved for automatic execution.");
        break;
      case "NEEDS_APPROVAL":
        console.warn("Human approval required:", result.explanations);
        break;
      case "BLOCKED":
        console.error("Routine blocked:", result.violation_codes, result.explanations);
        break;
    }
  })
  .catch((err) => console.error("Validation API error:", err));
```

---

## 9. Current System Boundaries & Unimplemented Features

Based directly on inspection of the codebase:

- **Natural-Language Parsing:** **NOT implemented.** The backend accepts pre-structured JSON proposals. It does not call an LLM or use NLP to parse raw text instructions into actions.
- **Human Approval Workflow Endpoints:** **NOT implemented.** There are no endpoints to submit, manage, or record human approval decisions (e.g., `POST /routine/approve`).
- **Routine Execution:** **NOT implemented.** The backend only evaluates safety; it does not issue commands to physical devices or simulate state mutation upon validation.
- **Workflow Orchestration (n8n / webhooks):** **NOT implemented.** No integration with n8n, webhooks, or third-party automation tools exists.
- **Persistent Storage & Database:** **NOT implemented.** Validation is purely in-memory and stateless.
- **Authentication & Authorization:** **NOT implemented.** All endpoints are currently unauthenticated.
