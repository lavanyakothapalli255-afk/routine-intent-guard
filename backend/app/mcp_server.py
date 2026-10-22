"""Model Context Protocol (MCP) server for Routine Intent Guard.

Exposes authoritative smart-home routine intent and safety guardrails
as standardized MCP tools over Streamable HTTP transport, complying
with the Model Context Protocol (spec 2025-11-25+).
"""

from __future__ import annotations

from typing import Any
from mcp.server.fastmcp import FastMCP

from app.catalogue import get_default_catalogue, get_default_catalogue_dict
from app.guard import validate_routine
from app.models import ProposedAction, RoutineProposal

mcp_server = FastMCP(
    "RoutineIntentGuard",
    instructions=(
        "Authoritative smart-home routine intent and physical safety guardrail validator. "
        "Allows AI agents (such as Alexa+ assistant planners) to discover smart-home devices, "
        "inspect capability boundaries, and deterministically validate proposed automation routines "
        "against user exclusions, unattended appliance safety, and perimeter security policies."
    ),
)


@mcp_server.tool()
def get_device_catalogue() -> list[dict[str, Any]]:
    """Retrieve the authoritative inventory of smart-home devices, rooms, and supported action capabilities.

    Returns:
        List of device objects detailing device ID, room location, type, current state,
        and supported action commands (e.g. lock/unlock, arm/disarm, turn_on/turn_off).
    """
    return get_default_catalogue_dict()


@mcp_server.tool()
def validate_smart_home_routine(
    routine_id: str,
    user_instruction: str,
    actions: list[dict[str, Any]],
    excluded_devices: list[str] = [],
    excluded_rooms: list[str] = [],
    included_devices: list[str] | None = None,
    included_rooms: list[str] | None = None,
    devices: list[dict[str, Any]] | None = None,
    force: bool = False,
    approved: bool = False,
) -> dict[str, Any]:
    """Validate a proposed smart-home automation routine against device capabilities and safety constraints.

    Evaluates:
    1. Unknown device IDs.
    2. Explicitly excluded devices.
    3. Explicitly excluded rooms.
    4. Scope restrictions (included_rooms / included_devices).
    5. Actions unsupported by known device hardware (e.g. preheating unattended).
    6. Security-sensitive perimeter modifications requiring human approval (unlocking, disarming).

    CRITICAL SAFEGUARD:
    Hard policy violations (1-5) always result in BLOCKED status. Caller-provided flags
    (e.g. force=True or approved=True) are strictly ignored and cannot override BLOCKED.

    Args:
        routine_id: Unique routine identifier string.
        user_instruction: The user's natural-language instruction or routine title.
        actions: Sequence of proposed device actions with 'device_id', 'action', and optional 'parameters'.
        excluded_devices: Explicitly prohibited device IDs.
        excluded_rooms: Explicitly prohibited rooms.
        included_devices: Optional scope constraint for allowed devices.
        included_rooms: Optional scope constraint for allowed rooms.
        devices: Optional catalogue of devices. If omitted, uses the authoritative default catalogue.
        force: Ignored client flag; cannot bypass policy violations.
        approved: Ignored client flag; cannot bypass policy violations.

    Returns:
        Dictionary containing:
        - status: "VALID", "NEEDS_APPROVAL", or "BLOCKED"
        - violation_codes: list of policy violation codes (e.g. "UNSUPPORTED_ACTION", "EXCLUDED_DEVICE", "REQUIRES_APPROVAL")
        - explanations: human-readable safety explanations for each violation
        - affected_device_ids: list of device IDs that triggered policy violations
    """
    # Parse proposed actions defensibly
    parsed_actions = [
        ProposedAction(
            device_id=act.get("device_id", ""),
            action=act.get("action", ""),
            parameters=act.get("parameters", {}),
        )
        for act in actions
    ]

    proposal = RoutineProposal(
        routine_id=routine_id,
        user_instruction=user_instruction,
        actions=parsed_actions,
        excluded_devices=excluded_devices,
        excluded_rooms=excluded_rooms,
        included_devices=included_devices,
        included_rooms=included_rooms,
    )

    devices_to_use = (
        devices
        if (devices is not None and len(devices) > 0)
        else get_default_catalogue()
    )

    # Invoke the single authoritative guard engine directly
    result = validate_routine(proposal=proposal, devices=devices_to_use)

    return {
        "status": result.status.value if hasattr(result.status, "value") else str(result.status),
        "violation_codes": [
            code.value if hasattr(code, "value") else str(code)
            for code in result.violation_codes
        ],
        "explanations": result.explanations,
        "affected_device_ids": result.affected_device_ids,
    }
