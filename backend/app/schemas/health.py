from datetime import datetime
from typing import Dict
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    version: str = Field(..., examples=["1.0.0"])
    environment: str = Field(..., examples=["development"])
    timestamp: datetime
    services: Dict[str, str] = Field(
        ...,
        examples=[{"database": "connected", "api": "ready"}]
    )
    uptime_seconds: float
