"""Data models for Routine Intent Guard."""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ValidationStatus(str, Enum):
    """Validation outcome status for a routine proposal."""

    VALID = "VALID"
    NEEDS_APPROVAL = "NEEDS_APPROVAL"
    BLOCKED = "BLOCKED"


class ViolationCode(str, Enum):
    """Stable violation and policy trigger codes."""

    UNKNOWN_DEVICE = "UNKNOWN_DEVICE"
    UNSUPPORTED_ACTION = "UNSUPPORTED_ACTION"
    EXCLUDED_DEVICE = "EXCLUDED_DEVICE"
    EXCLUDED_ROOM = "EXCLUDED_ROOM"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    REQUIRES_APPROVAL = "REQUIRES_APPROVAL"


class Device(BaseModel):
    """Simulated smart-home device representation with state and capabilities."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., min_length=1, description="Stable unique device ID")
    room: str = Field(..., min_length=1, description="Room where the device is located")
    supported_actions: list[str] = Field(
        default_factory=list,
        description="List of action names supported by this device",
    )
    current_state: dict[str, Any] = Field(
        default_factory=dict,
        description="Current state properties of the device",
    )

    @field_validator("id", "room", mode="before")
    @classmethod
    def strip_and_validate_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Value must not be empty or whitespace only")
        return v


class ProposedAction(BaseModel):
    """A proposed action targeting a specific smart-home device."""

    model_config = ConfigDict(extra="ignore")

    device_id: str = Field(..., min_length=1, description="Target device ID")
    action: str = Field(..., min_length=1, description="Action name to execute")
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional action parameters",
    )

    @field_validator("device_id", "action", mode="before")
    @classmethod
    def strip_and_validate_strings(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Value must not be empty or whitespace only")
        return v


class RoutineProposal(BaseModel):
    """A proposed routine submitted for deterministic validation."""

    model_config = ConfigDict(extra="ignore")

    routine_id: str = Field(..., min_length=1, description="Unique routine identifier")
    user_instruction: str = Field(
        ...,
        min_length=1,
        description="Original user instruction that prompted this routine proposal",
    )
    included_rooms: list[str] | None = Field(
        default=None,
        description="Explicitly allowed rooms scope, or None if unconstrained",
    )
    included_devices: list[str] | None = Field(
        default=None,
        description="Explicitly allowed devices scope, or None if unconstrained",
    )
    excluded_rooms: list[str] = Field(
        default_factory=list,
        description="Explicitly excluded rooms",
    )
    excluded_devices: list[str] = Field(
        default_factory=list,
        description="Explicitly excluded devices",
    )
    actions: list[ProposedAction] = Field(
        default_factory=list,
        description="Proposed sequence of device actions",
    )

    # Optional fields for compatibility with arbitrary client flags (never bypasses validation)
    force: bool = Field(default=False, description="Ignored flag, cannot bypass guard")
    approved: bool = Field(default=False, description="Ignored flag, cannot bypass guard")

    @model_validator(mode="before")
    @classmethod
    def normalize_instruction_fields(cls, data: Any) -> Any:
        """Allow original_user_instruction or original_instruction aliases."""
        if isinstance(data, dict):
            if "user_instruction" not in data:
                if "original_user_instruction" in data:
                    data["user_instruction"] = data["original_user_instruction"]
                elif "original_instruction" in data:
                    data["user_instruction"] = data["original_instruction"]
        return data

    @property
    def original_user_instruction(self) -> str:
        """Alias for user_instruction."""
        return self.user_instruction

    @property
    def original_instruction(self) -> str:
        """Alias for user_instruction."""
        return self.user_instruction


class ValidationResult(BaseModel):
    """Structured result returned by the routine-validation engine."""

    model_config = ConfigDict(extra="ignore")

    status: ValidationStatus = Field(
        ...,
        description="Validation outcome: VALID, NEEDS_APPROVAL, or BLOCKED",
    )
    violation_codes: list[str] = Field(
        default_factory=list,
        description="Stable codes for violations or approval triggers",
    )
    explanations: list[str] = Field(
        default_factory=list,
        description="Human-readable explanations for all detected violations or approval needs",
    )
    affected_device_ids: list[str] = Field(
        default_factory=list,
        description="Device IDs involved in violations or approval triggers",
    )

    @property
    def is_valid(self) -> bool:
        """Return True if routine is completely valid without requiring approval."""
        return self.status == ValidationStatus.VALID

    @property
    def is_blocked(self) -> bool:
        """Return True if routine has at least one hard violation."""
        return self.status == ValidationStatus.BLOCKED

    @property
    def is_needs_approval(self) -> bool:
        """Return True if routine requires human approval."""
        return self.status == ValidationStatus.NEEDS_APPROVAL


class RoutineValidationRequest(BaseModel):
    """Request payload for validating a routine proposal."""

    model_config = ConfigDict(extra="ignore")

    proposal: RoutineProposal = Field(
        ...,
        description="Structured routine proposal containing actions and constraints",
    )
    devices: list[Device] | dict[str, Device] = Field(
        ...,
        description="Simulated device catalogue as a list of devices or mapping of device_id -> Device",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_request(cls, data: Any) -> Any:
        """Normalize request payload to handle dictionary devices and alias keys."""
        if isinstance(data, dict):
            # If devices is a dict with missing 'id' inside values, inject key as id
            devs = data.get("devices")
            if isinstance(devs, dict):
                for k, v in devs.items():
                    if isinstance(v, dict) and "id" not in v:
                        v["id"] = k

            # Support 'routine' as alias for 'proposal'
            if "proposal" not in data:
                if "routine" in data:
                    data["proposal"] = data["routine"]
                elif "routine_id" in data and "actions" in data:
                    # Flattened payload where proposal fields are top-level
                    proposal_fields = {
                        k: v for k, v in data.items() if k != "devices"
                    }
                    data = {"proposal": proposal_fields, "devices": devs}
        return data

