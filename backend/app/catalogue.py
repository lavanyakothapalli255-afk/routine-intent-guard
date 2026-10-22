"""Authoritative smart-home device catalogue for Routine Intent Guard.

This module provides the standard inventory of known devices, rooms,
capabilities, and default states. It serves as the authoritative reference
for device discovery by MCP tools and agent planning.
"""

from __future__ import annotations

from typing import Any
from app.models import Device

# Authoritative device inventory aligned with frontend device definitions
STANDARD_DEVICE_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "dev-lock-entry",
        "name": "Front Door Smart Lock",
        "room": "Entryway",
        "type": "lock",
        "supported_actions": ["lock", "unlock"],
        "current_state": {"locked": True},
    },
    {
        "id": "dev-light-living",
        "name": "Living Room Ceiling Lights",
        "room": "Living Room",
        "type": "light",
        "supported_actions": ["turn_on", "turn_off", "dim"],
        "current_state": {"power": True, "brightness": 75},
    },
    {
        "id": "dev-thermo-hall",
        "name": "Hallway Smart Thermostat",
        "room": "Hallway",
        "type": "thermostat",
        "supported_actions": ["set_temperature", "set_mode"],
        "current_state": {"temperature": 71, "targetTemperature": 72, "mode": "cool"},
    },
    {
        "id": "dev-cam-backyard",
        "name": "Backyard Security Camera",
        "room": "Exterior",
        "type": "camera",
        "supported_actions": ["stream", "record"],
        "current_state": {"streaming": True, "motionDetected": False},
    },
    {
        "id": "dev-oven-kitchen",
        "name": "Kitchen Smart Oven",
        "room": "Kitchen",
        "type": "oven",
        "supported_actions": ["turn_off", "check_status"],
        "current_state": {"power": False, "temperature": 0, "active": False},
    },
    {
        "id": "dev-garage-main",
        "name": "2-Car Garage Door",
        "room": "Garage",
        "type": "garage",
        "supported_actions": ["close_garage", "open_garage", "lock", "unlock"],
        "current_state": {"closed": True, "locked": True},
    },
    {
        "id": "dev-light-bed",
        "name": "Master Bedroom Nightlight",
        "room": "Master Bedroom",
        "type": "light",
        "supported_actions": ["turn_on", "turn_off", "dim"],
        "current_state": {"power": False, "brightness": 20},
    },
    {
        "id": "dev-alarm-system",
        "name": "Perimeter Alarm System",
        "room": "Security Hub",
        "type": "alarm",
        "supported_actions": ["arm", "disarm"],
        "current_state": {"armed": True, "mode": "home"},
    },
]


def get_default_catalogue() -> list[Device]:
    """Return standard catalogue as validated Device model instances."""
    return [
        Device(
            id=d["id"],
            room=d["room"],
            supported_actions=d["supported_actions"],
            current_state=d["current_state"],
        )
        for d in STANDARD_DEVICE_DEFINITIONS
    ]


def get_default_catalogue_dict() -> list[dict[str, Any]]:
    """Return standard catalogue definitions as clean dictionary representations."""
    return [dict(d) for d in STANDARD_DEVICE_DEFINITIONS]
