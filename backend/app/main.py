from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.guard import validate_routine
from app.mcp_server import mcp_server
from app.models import RoutineValidationRequest, ValidationResult


class HealthResponse(BaseModel):
    status: str
    service: str


# Initialize the FastMCP Streamable HTTP ASGI sub-application
mcp_app = mcp_server.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage lifecycle for both FastAPI and the mounted MCP session manager."""
    async with mcp_server.session_manager.run():
        yield


app = FastAPI(
    title="Routine Intent Guard",
    description="Simulated smart-home routine validation system with Model Context Protocol (MCP) server",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


# Mount the Model Context Protocol (MCP) Streamable HTTP endpoint at /mcp
app.mount("/mcp", mcp_app)
