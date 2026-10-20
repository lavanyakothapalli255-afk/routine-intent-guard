from fastapi import FastAPI
from pydantic import BaseModel

from app.guard import validate_routine
from app.models import RoutineValidationRequest, ValidationResult


class HealthResponse(BaseModel):
    status: str
    service: str


app = FastAPI(
    title="Routine Intent Guard",
    description="Simulated smart-home routine validation system",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return the health status of the service."""
    return HealthResponse(
        status="ok",
        service="routine-intent-guard",
    )


@app.post(
    "/routine/validate",
    response_model=ValidationResult,
    summary="Validate smart-home routine proposal",
    description="Deterministically validates a routine proposal against device capabilities and safety constraints.",
)
def post_validate_routine(request: RoutineValidationRequest) -> ValidationResult:
    """Validate a routine proposal against simulated devices and constraints."""
    return validate_routine(proposal=request.proposal, devices=request.devices)

