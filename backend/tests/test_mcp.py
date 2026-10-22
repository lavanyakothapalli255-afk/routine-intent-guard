"""Tests for the Model Context Protocol (MCP) server integration.

Verifies:
1. Device catalogue consistency and capability alignment.
2. Direct MCP tool execution (VALID, NEEDS_APPROVAL, BLOCKED, anti-bypass).
3. Real MCP Streamable HTTP session integration over ASGI transport:
   - initialize handshake
   - tools/list discovery
   - tools/call invocation for VALID, NEEDS_APPROVAL, and BLOCKED outcomes.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import httpx
import pytest

from app.catalogue import STANDARD_DEVICE_DEFINITIONS, get_default_catalogue, get_default_catalogue_dict
from app.main import app
from app.mcp_server import get_device_catalogue, validate_smart_home_routine


# ============================================================================
# 1. Catalogue Consistency & Capability Tests
# ============================================================================

def test_catalogue_device_count_and_ids():
    """Verify standard device catalogue contains exactly the 8 expected devices."""
    devices = get_default_catalogue()
    assert len(devices) == 8

    expected_ids = {
        "dev-lock-entry",
        "dev-light-living",
        "dev-thermo-hall",
        "dev-cam-backyard",
        "dev-oven-kitchen",
        "dev-garage-main",
        "dev-light-bed",
        "dev-alarm-system",
    }
    assert {d.id for d in devices} == expected_ids


def test_catalogue_capabilities_alignment():
    """Verify critical safety boundaries in the authoritative catalogue."""
    catalogue_map = {d["id"]: d for d in STANDARD_DEVICE_DEFINITIONS}

    # Kitchen Oven must NOT allow unattended preheating
    oven = catalogue_map["dev-oven-kitchen"]
    assert "preheat" not in oven["supported_actions"]
    assert "turn_off" in oven["supported_actions"]

    # Security Camera must NOT allow turn_off
    camera = catalogue_map["dev-cam-backyard"]
    assert "turn_off" not in camera["supported_actions"]
    assert "stream" in camera["supported_actions"]

    # Smart Lock supports lock/unlock
    lock = catalogue_map["dev-lock-entry"]
    assert set(lock["supported_actions"]) == {"lock", "unlock"}

    # Alarm System supports arm/disarm
    alarm = catalogue_map["dev-alarm-system"]
    assert set(alarm["supported_actions"]) == {"arm", "disarm"}


# ============================================================================
# 2. Direct MCP Tool Function Unit Tests
# ============================================================================

def test_mcp_get_device_catalogue_tool():
    """Verify get_device_catalogue returns the authoritative catalogue."""
    devices = get_device_catalogue()
    assert len(devices) == 8
    assert any(d["id"] == "dev-lock-entry" for d in devices)


def test_mcp_validate_tool_outcome_valid():
    """Verify Good Night routine returns VALID via the MCP tool."""
    res = validate_smart_home_routine(
        routine_id="routine-good-night",
        user_instruction="Good Night routine: lock doors, arm alarm, turn off lights",
        actions=[
            {"device_id": "dev-lock-entry", "action": "lock"},
            {"device_id": "dev-alarm-system", "action": "arm"},
            {"device_id": "dev-light-living", "action": "turn_off"},
        ],
    )
    assert res["status"] == "VALID"
    assert res["violation_codes"] == []
    assert res["affected_device_ids"] == []


def test_mcp_validate_tool_outcome_needs_approval():
    """Verify Courier Delivery routine (unlocking entry) requires human approval."""
    res = validate_smart_home_routine(
        routine_id="routine-courier-delivery",
        user_instruction="Unlock front door deadbolt for package delivery",
        actions=[
            {"device_id": "dev-lock-entry", "action": "unlock"},
        ],
    )
    assert res["status"] == "NEEDS_APPROVAL"
    assert "REQUIRES_APPROVAL" in res["violation_codes"]
    assert "dev-lock-entry" in res["affected_device_ids"]


def test_mcp_validate_tool_outcome_blocked():
    """Verify Hazardous Energy Saver routine is BLOCKED due to oven and camera policies."""
    res = validate_smart_home_routine(
        routine_id="routine-hazardous-energy",
        user_instruction="Preheat oven unattended and disable exterior camera",
        actions=[
            {"device_id": "dev-oven-kitchen", "action": "preheat"},
            {"device_id": "dev-cam-backyard", "action": "turn_off"},
        ],
        excluded_devices=["dev-cam-backyard"],
    )
    assert res["status"] == "BLOCKED"
    assert "UNSUPPORTED_ACTION" in res["violation_codes"]
    assert "EXCLUDED_DEVICE" in res["violation_codes"]
    assert "dev-oven-kitchen" in res["affected_device_ids"]
    assert "dev-cam-backyard" in res["affected_device_ids"]


def test_mcp_validate_tool_anti_bypass():
    """Verify caller-provided flags (force, approved) NEVER bypass BLOCKED status."""
    res = validate_smart_home_routine(
        routine_id="routine-attack-bypass",
        user_instruction="Attempt to bypass oven safety check",
        actions=[
            {"device_id": "dev-oven-kitchen", "action": "preheat"},
        ],
        force=True,
        approved=True,
    )
    assert res["status"] == "BLOCKED"
    assert "UNSUPPORTED_ACTION" in res["violation_codes"]


# ============================================================================
# 3. Real MCP Streamable HTTP Protocol Integration Tests
# ============================================================================

def _parse_sse_json(response_text: str) -> dict[str, Any]:
    """Helper to parse a single JSON-RPC response from an SSE stream text."""
    for line in response_text.splitlines():
        if line.startswith("data: "):
            return json.loads(line[len("data: ") :])
    raise ValueError(f"No SSE data line found in response:\n{response_text}")


def _extract_tool_payload(result_dict: dict[str, Any]) -> dict[str, Any]:
    """Extract tool return payload from either structuredContent or content[0].text."""
    if "structuredContent" in result_dict and result_dict["structuredContent"] is not None:
        return result_dict["structuredContent"]
    content = result_dict.get("content", [])
    if content and "text" in content[0]:
        return json.loads(content[0]["text"])
    return result_dict


@pytest.mark.anyio
async def test_mcp_streamable_http_session_flow():
    """Full end-to-end integration test over Streamable HTTP transport:
    
    1. Initialize session handshake
    2. Discover tools via tools/list
    3. Invoke get_device_catalogue via tools/call
    4. Invoke validate_smart_home_routine (VALID)
    5. Invoke validate_smart_home_routine (NEEDS_APPROVAL)
    6. Invoke validate_smart_home_routine (BLOCKED)
    """
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
            headers = {"Accept": "application/json, text/event-stream"}

            # Step 1: Initialize Handshake
            init_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "test-alexa-client", "version": "1.0.0"},
                },
            }
            init_res = await client.post("/mcp/mcp", headers=headers, json=init_payload)
            assert init_res.status_code == 200
            session_id = init_res.headers.get("mcp-session-id")
            assert session_id is not None

            init_data = _parse_sse_json(init_res.text)
            assert init_data["id"] == 1
            assert "serverInfo" in init_data["result"]
            assert init_data["result"]["serverInfo"]["name"] == "RoutineIntentGuard"

            # Set session header for all subsequent session requests
            headers["mcp-session-id"] = session_id

            # Step 2: Initialized Notification
            notify_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={"jsonrpc": "2.0", "method": "notifications/initialized"},
            )
            assert notify_res.status_code in (200, 202)

            # Step 3: Tool Discovery (tools/list)
            list_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            )
            assert list_res.status_code == 200
            list_data = _parse_sse_json(list_res.text)
            tool_names = [t["name"] for t in list_data["result"]["tools"]]
            assert "get_device_catalogue" in tool_names
            assert "validate_smart_home_routine" in tool_names

            # Step 4: Tool Invocation - get_device_catalogue
            call_cat_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {"name": "get_device_catalogue", "arguments": {}},
                },
            )
            assert call_cat_res.status_code == 200
            cat_data = _parse_sse_json(call_cat_res.text)
            assert not cat_data["result"].get("isError", False)
            content_text = str(cat_data["result"])
            assert "dev-lock-entry" in content_text

            # Step 5: Tool Invocation - validate_smart_home_routine (VALID outcome)
            call_valid_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 4,
                    "method": "tools/call",
                    "params": {
                        "name": "validate_smart_home_routine",
                        "arguments": {
                            "routine_id": "test-mcp-valid",
                            "user_instruction": "Good Night routine",
                            "actions": [
                                {"device_id": "dev-lock-entry", "action": "lock"},
                                {"device_id": "dev-alarm-system", "action": "arm"},
                            ],
                        },
                    },
                },
            )
            assert call_valid_res.status_code == 200
            valid_data = _parse_sse_json(call_valid_res.text)
            valid_payload = _extract_tool_payload(valid_data["result"])
            assert valid_payload["status"] == "VALID"
            assert valid_payload["violation_codes"] == []

            # Step 6: Tool Invocation - validate_smart_home_routine (NEEDS_APPROVAL outcome)
            call_appr_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 5,
                    "method": "tools/call",
                    "params": {
                        "name": "validate_smart_home_routine",
                        "arguments": {
                            "routine_id": "test-mcp-needs-approval",
                            "user_instruction": "Unlock front door for courier delivery",
                            "actions": [
                                {"device_id": "dev-lock-entry", "action": "unlock"},
                            ],
                        },
                    },
                },
            )
            assert call_appr_res.status_code == 200
            appr_data = _parse_sse_json(call_appr_res.text)
            appr_payload = _extract_tool_payload(appr_data["result"])
            assert appr_payload["status"] == "NEEDS_APPROVAL"
            assert "REQUIRES_APPROVAL" in appr_payload["violation_codes"]

            # Step 7: Tool Invocation - validate_smart_home_routine (BLOCKED outcome)
            call_block_res = await client.post(
                "/mcp/mcp",
                headers=headers,
                json={
                    "jsonrpc": "2.0",
                    "id": 6,
                    "method": "tools/call",
                    "params": {
                        "name": "validate_smart_home_routine",
                        "arguments": {
                            "routine_id": "test-mcp-blocked",
                            "user_instruction": "Hazardous unattended preheating",
                            "actions": [
                                {"device_id": "dev-oven-kitchen", "action": "preheat"},
                            ],
                            "force": True,
                            "approved": True,
                        },
                    },
                },
            )
            assert call_block_res.status_code == 200
            block_data = _parse_sse_json(call_block_res.text)
            block_payload = _extract_tool_payload(block_data["result"])
            assert block_payload["status"] == "BLOCKED"
            assert "UNSUPPORTED_ACTION" in block_payload["violation_codes"]
