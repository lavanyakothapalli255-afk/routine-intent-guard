# Routine Intent Guard

> **Deterministic Safety & Intent Policy Verification for AI-Generated Smart-Home Routines**<br>
> *Built for the Amazon Developer Hackathon 2026 — Alexa+ Track*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20FastMCP-009688.svg)](backend/)
[![Frontend: React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Tailwind-61DAFB.svg)](frontend/)
[![Protocol: MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP%20(2025--11--25)-orange.svg)](backend/app/mcp_server.py)
[![Tests: 34 Tests Passed](https://img.shields.io/badge/Tests-34%20Tests%20Passed-brightgreen.svg)](backend/tests/)

---

## Overview

**Routine Intent Guard** is an authoritative, deterministic safety guardrail engine and simulated execution prototype designed to protect smart-home environments from misaligned, hazardous, or unauthorized AI-generated automation routines.

As next-generation conversational assistants like **Alexa+** synthesize complex, multi-device routines from freeform user instructions, probabilistic Large Language Models (LLMs) can inadvertently propose unsafe operations—such as preheating an oven unattended, disabling perimeter cameras during away hours, or unlocking deadbolts without explicit authorization.

Routine Intent Guard solves this by decoupling generative routine synthesis from safety policy verification:
1. **Model Context Protocol (MCP) Server:** Exposes standardized device discovery (`get_device_catalogue`) and deterministic policy validation (`validate_smart_home_routine`) over Streamable HTTP for AI agent planners.
2. **Interactive Homeowner Dashboard:** A responsive React 19 web application providing visual verification, real-time action editing, explicit homeowner approval gates for perimeter access, and virtual device state simulation with a chronological session audit log.

---

## Problem & Value Proposition

### The Problem
- **Probabilistic Hallucinations:** Generative AI models cannot guarantee physical safety constraints when composing automation steps across disparate IoT hardware.
- **Silent Intent Drift:** A user prompt like *"Save energy while I'm away"* can be misinterpreted into turning off essential security cameras or adjusting climate beyond safe ranges.
- **Perimeter & Thermal Hazards:** Actions modifying physical entry barriers (smart locks, garage bays, alarms) or thermal heating appliances carry catastrophic real-world risks if triggered autonomously without explicit confirmation.

### The Solution
Routine Intent Guard enforces a **pure-functional, zero-LLM deterministic policy engine**:
- **Deterministic Validation (No LLM in the Validation Path):** Safety evaluations run through deterministic policy checks against the device catalogue, supported capabilities, explicit user exclusions, and room-scope constraints.
- **Strict Precedence:** Critical safety violations (`BLOCKED`) take absolute priority and cannot be overridden by prompt injections, approval flags, or client overrides.
- **Human-in-the-Loop Governance:** Security-sensitive perimeter modifications pause execution in a `NEEDS_APPROVAL` state, requiring explicit homeowner confirmation before simulation.

---

## Architecture

```text
                      Natural-Language Voice / Text
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  Alexa+ / Agentic LLM Planner │
                   └───────────────┬───────────────┘
                                   │
              MCP Tool Call (Streamable HTTP / SSE)
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ROUTINE INTENT GUARD                            │
│                                                                        │
│   FastAPI Backend  ─── mounted at /mcp ───  FastMCP Server (1.30.0)    │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Deterministic Policy Guard Engine                │   │
│   │                                                                │   │
│   │   1. Device Registry Verification (UNKNOWN_DEVICE)             │   │
│   │   2. Explicit Prohibitions (EXCLUDED_DEVICE, EXCLUDED_ROOM)    │   │
│   │   3. Scope Boundary Enforcement (OUT_OF_SCOPE)                 │   │
│   │   4. Device Capability Limit Verification (UNSUPPORTED_ACTION) │   │
│   │   5. Perimeter Security Rules (REQUIRES_APPROVAL)              │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│                        Deterministic Verdict                           │
│                     ┌──────────────┼──────────────┐                    │
│                     ▼              ▼              ▼                    │
│                  VALID       NEEDS_APPROVAL    BLOCKED                 │
│                 (Safe)      (Human Override)  (Locked)                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                          Vite /api Proxy Forward
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Interactive React 19 Dashboard                        │
│                                                                        │
│  - Real-Time Action Editor & Live Parameter Synchronization            │
│  - Explicit Homeowner Approval Gate Checkbox                           │
│  - Single-Run Simulation Lock (Prevents Duplicate Triggering)          │
│  - Pure State Virtual Device Actuation & Chronological Audit Log       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Policy Evaluation Rules & Precedence

The authoritative engine evaluates routines against six deterministic validation checks:

| Policy Check | Violation Code | Description | Default Verdict |
|:---|:---:|:---|:---:|
| **Unknown Device** | `UNKNOWN_DEVICE` | Target device ID does not exist in the authoritative inventory. | **BLOCKED** |
| **Excluded Device** | `EXCLUDED_DEVICE` | Action targets a device explicitly marked as prohibited (e.g. security camera). | **BLOCKED** |
| **Excluded Room** | `EXCLUDED_ROOM` | Action targets a room explicitly marked as excluded from automation. | **BLOCKED** |
| **Scope Boundary** | `OUT_OF_SCOPE` | Target device or room falls outside the user's declared routine scope. | **BLOCKED** |
| **Hardware Limits** | `UNSUPPORTED_ACTION` | Operation is not supported by device hardware (e.g. unattended oven preheating). | **BLOCKED** |
| **Human Approval** | `REQUIRES_APPROVAL` | Security-sensitive actions (`unlock`, `disarm`, `open_garage`, `open_door`, `open_gate`). | **NEEDS_APPROVAL** |

### Absolute Precedence & Anti-Bypass
If a proposal triggers both a hard violation (1–5) and an approval rule (6), the engine **strictly enforces `BLOCKED`**. Caller-supplied arguments (such as `force=True`, `approved=True`, or `override=True`) are ignored by the engine, preventing prompt injection attacks or faulty client assumptions from bypassing physical safety guardrails.

---

## Demo Scenario Walkthroughs

The frontend prototype includes three canonical scenarios demonstrating the safety lifecycle:

### 1. Good Night Routine (`VALID`)
- **User Instruction:** *"Good Night: Dim living room lights to 15%, set thermostat to 68°F, and turn on the bedroom nightlight."*
- **Target Devices:** Living Room Ceiling Lights (`dim`), Hallway Smart Thermostat (`set_temperature`), Bedroom Nightlight (`turn_on`).
- **Engine Verdict:** `VALID` (0 policy violations).
- **Execution:** Permitted immediately for simulated execution. Updates virtual device states and appends a timestamped audit record.

### 2. Courier Delivery Access (`NEEDS_APPROVAL`)
- **User Instruction:** *"Courier Delivery: Unlock the front door, open garage door slightly, and disarm perimeter alarm for 10 minutes."*
- **Target Devices:** Front Door Smart Lock (`unlock`), 2-Car Garage Door (`open_garage`), Perimeter Alarm System (`disarm`).
- **Engine Verdict:** `NEEDS_APPROVAL` (`REQUIRES_APPROVAL` for physical barrier modifications).
- **Safeguard Enforcement:**
  - Execute button is locked (`disabled=true`) with `cursor-not-allowed`.
  - Displays a dedicated **Homeowner Override Authorization Required** warning.
  - Requires the homeowner to explicitly check the authorization checkbox.
  - Once executed, the button locks to `Executed (Simulation Complete)` to prevent accidental repeat actuation.

### 3. Hazardous Energy Saver (`BLOCKED`)
- **User Instruction:** *"Away Routine: Turn on kitchen oven to 450°F to preheat dinner and turn off all exterior security cameras."*
- **Target Devices:** Kitchen Smart Oven (`preheat`), Backyard Security Camera (`turn_off`).
- **Engine Verdict:** `BLOCKED` with critical violations:
  - `UNSUPPORTED_ACTION`: Kitchen oven capability specifications do not permit unattended automated preheating (`turn_off` and `check_status` only).
  - `EXCLUDED_DEVICE`: Backyard camera is explicitly prohibited from deactivation during away hours.
- **Interactive Remediation:** Homeowner can click the **Edit** tool on proposed actions to reconfigure the oven element to `OFF` and remove camera deactivation, immediately re-evaluating the routine to `VALID`.

---

## Authoritative Device Catalogue

The backend inventory serves as the single source of truth for both the REST API and the MCP tool:

| Device ID | Device Name | Room Location | Type | Supported Action Commands |
|:---|:---|:---|:---:|:---|
| `dev-lock-entry` | Front Door Smart Lock | Entryway | Lock | `lock`, `unlock` |
| `dev-light-living` | Living Room Ceiling Lights | Living Room | Light | `turn_on`, `turn_off`, `dim` |
| `dev-thermo-hall` | Hallway Smart Thermostat | Hallway | Thermostat | `set_temperature`, `set_mode` |
| `dev-cam-backyard` | Backyard Security Camera | Exterior | Camera | `stream`, `record` *(no turn_off)* |
| `dev-oven-kitchen` | Kitchen Smart Oven | Kitchen | Oven | `turn_off`, `check_status` *(no preheat)* |
| `dev-garage-main` | 2-Car Garage Door | Garage | Garage | `open_garage`, `close_garage`, `lock`, `unlock` |
| `dev-light-bed` | Master Bedroom Nightlight | Master Bedroom | Light | `turn_on`, `turn_off`, `dim` |
| `dev-alarm-system` | Perimeter Alarm System | Security Hub | Alarm | `arm`, `disarm` |

---

## Model Context Protocol (MCP) Integration

Routine Intent Guard exposes a standards-compliant MCP server mounted directly inside the FastAPI ASGI lifecycle.

- **MCP Endpoint:** `http://127.0.0.1:8000/mcp/mcp`
- **Transport:** Streamable HTTP (Server-Sent Events over HTTP POST / GET)
- **Protocol Version:** `2025-11-25`
- **SDK:** `mcp==1.30.0` (FastMCP)

### Available MCP Tools

#### 1. `get_device_catalogue`
Returns the complete list of 8 smart-home devices, including room locations, device types, current virtual states, and supported action commands.

#### 2. `validate_smart_home_routine`
Validates a proposed routine proposal against the authoritative policy engine.

**Input Arguments:**
```json
{
  "routine_id": "routine-good-night",
  "user_instruction": "Good Night: lock doors, arm alarm, turn off lights",
  "actions": [
    { "device_id": "dev-lock-entry", "action": "lock" },
    { "device_id": "dev-alarm-system", "action": "arm" },
    { "device_id": "dev-light-living", "action": "turn_off" }
  ],
  "excluded_devices": [],
  "excluded_rooms": []
}
```

**Output Result:**
```json
{
  "status": "VALID",
  "violation_codes": [],
  "explanations": [],
  "affected_device_ids": []
}
```

---

## Repository Structure

```text
routine-intent-guard/
├── LICENSE                          # MIT License
├── README.md                        # Project documentation
├── backend/
│   ├── requirements.txt             # Python dependencies (pinned mcp==1.30.0)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI application & MCP endpoint mount
│   │   ├── guard.py                 # Pure deterministic validation engine
│   │   ├── models.py                # Pydantic schemas & enum definitions
│   │   ├── catalogue.py             # Authoritative 8-device hardware inventory
│   │   └── mcp_server.py            # FastMCP Streamable HTTP server & tools
│   └── tests/
│       ├── test_api.py              # REST API endpoint tests (12 tests)
│       ├── test_guard.py            # Guard logic & edge-case unit tests (13 tests)
│       ├── test_health.py           # Health check verification (1 test)
│       └── test_mcp.py              # MCP session, tools/list, & anti-bypass (8 tests)
└── frontend/
    ├── package.json                 # React 19 dependencies & scripts
    ├── vite.config.ts               # Vite bundler config with /api reverse proxy
    ├── index.html                   # HTML entry point
    └── src/
        ├── App.tsx                  # Dashboard layout & error banner
        ├── main.tsx                 # React DOM mount point
        ├── components/
        │   ├── audit/               # AuditHistory log viewer
        │   ├── devices/             # DeviceCard & DeviceGrid inventory views
        │   ├── execution/           # ExecutionPanel with approval gates & locks
        │   ├── layout/              # Navbar with live backend connectivity badge
        │   ├── routine/             # RoutineInputPanel, ActionEditModal, ActionsList
        │   └── validation/          # ValidationBanner & ViolationList cards
        ├── context/
        │   └── RoutineContext.tsx   # React state management & pure state updater
        ├── mocks/
        │   ├── devices.ts           # Frontend device definitions
        │   └── scenarios.ts         # Preset scenarios (Valid, Approval, Blocked)
        ├── services/
        │   └── routineService.ts    # Backend API client & verdict mapper
        └── types/
            ├── backend.ts           # TypeScript interfaces matching backend models
            └── routine.ts           # Frontend UI state and action types
```

---

## Getting Started

### Prerequisites
- **Python 3.10+** (Python 3.13 verified)
- **Node.js 18+** and **npm**

---

### Backend Setup

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI backend:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

The backend services will be available at:
- **REST Health Check:** `http://127.0.0.1:8000/health`
- **Validation Endpoint:** `http://127.0.0.1:8000/routine/validate`
- **MCP Streamable HTTP Endpoint:** `http://127.0.0.1:8000/mcp/mcp`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

---

### Frontend Setup

1. Open a separate terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser. The navbar will display **Python Guard: Online** indicating active connection to the backend through the Vite reverse proxy.

---

### Running Automated Tests

Run the complete backend test suite using `pytest`:
```bash
# From the repository root (with virtualenv activated)
python -m pytest backend/tests -v
```

**Test Suite Coverage (34 Tests, 100% Pass Rate):**
- **`test_api.py` (12 tests):** Valid proposals, excluded devices/rooms, malformed JSON handling, client override flag rejection, dictionary device inputs.
- **`test_guard.py` (13 tests):** Scope boundaries, unsupported device actions, deterministic repeatability, multi-violation collection, precedence of hard violations over approval.
- **`test_health.py` (1 test):** Endpoint availability and service metadata.
- **`test_mcp.py` (8 tests):** Device catalogue consistency, capability boundaries, MCP tool outcomes (`VALID`, `NEEDS_APPROVAL`, `BLOCKED`), anti-bypass validation, and real Streamable HTTP ASGI protocol handshake.

---

### Building for Production

Compile TypeScript and build optimized client assets:
```bash
cd frontend
npm run build
```
Generates clean static assets in `frontend/dist/` with zero TypeScript compiler errors.

---

## Hackathon Compliance & Submission Notice

- **Track:** Amazon Developer Hackathon 2026 — Alexa+ Track.
- **Standard Protocol:** Implements the official Model Context Protocol (MCP) using Streamable HTTP transport and JSON-RPC 2.0.
- **Simulation Prototype Notice:** Routine Intent Guard is a safety verification architecture and interactive simulation prototype. All device state transitions and routine executions are strictly simulated in-memory. The project does not control live physical home hardware or claim direct production cloud linking to proprietary Alexa accounts.
- **License:** Open-source software released under the [MIT License](LICENSE).
