from typing import Optional, List
from datetime import datetime, timezone
from fastapi import (
    APIRouter, Depends, Query, status, WebSocket, WebSocketDisconnect, HTTPException
)
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_user, require_roles
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.tracking import (
    GPSLocationPayload,
    LiveBusTelemetry,
    LiveTrackingListResponse,
    SimulationStepResponse,
    StopEtaInfo
)
from app.services.tracking import TrackingService, tracking_hub

router = APIRouter(prefix="/tracking", tags=["Live Tracking & Telematics"])


@router.get(
    "/live",
    response_model=LiveTrackingListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Live Fleet Positions & Telemetry",
    description="Returns live coordinate positions, speeds, headings, and stop ETAs tailored per user role."
)
async def get_live_tracking(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TrackingService.get_live_tracking_for_user(db=db, current_user=current_user)


@router.get(
    "/bus/{bus_identifier}",
    response_model=LiveBusTelemetry,
    status_code=status.HTTP_200_OK,
    summary="Get Single Bus Live Telemetry",
    description="Retrieves live telemetry, heading, speed, and next stop info for a specific bus."
)
async def get_bus_telemetry(
    bus_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TrackingService.get_bus_telemetry(
        db=db, bus_identifier=bus_identifier, current_user=current_user
    )


@router.get(
    "/bus/{bus_id}/stops",
    response_model=List[StopEtaInfo],
    status_code=status.HTTP_200_OK,
    summary="Get Route Stop ETAs for Bus",
    description="Calculates detailed Haversine distance and arrival ETAs for all stops along the bus's route."
)
async def get_bus_stop_etas(
    bus_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TrackingService.get_route_stop_etas(db=db, bus_id=bus_id)


@router.post(
    "/location",
    response_model=LiveBusTelemetry,
    status_code=status.HTTP_200_OK,
    summary="Ingest GPS Telemetry Ping",
    description="Receives real-time coordinate pings from physical hardware GPS trackers or driver cabin mobile apps."
)
async def ingest_location(
    payload: GPSLocationPayload,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    return TrackingService.ingest_location(
        db=db, payload=payload, reported_by_user_id=current_user.id
    )


@router.post(
    "/simulate-step",
    response_model=SimulationStepResponse,
    status_code=status.HTTP_200_OK,
    summary="Step Fleet Movement Simulator",
    description="Advances running and delayed fleet buses along their sequence of route stops with realistic telemetry."
)
async def simulate_movement_step(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return TrackingService.simulate_movement_step(db=db)


# --- Dedicated WebSocket Streaming Endpoint ---

@router.websocket("/ws")
async def websocket_tracking_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """
    Real-time streaming WebSocket endpoint.
    Clients receive instantaneous coordinate updates and fleet simulation ticks.
    """
    # Authenticate token if provided
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
        except JWTError:
            pass  # Allow public read or unauthenticated map views if needed

    await tracking_hub.connect(websocket)
    try:
        # Send initial welcome & connection confirmation
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to CampusRide Telematics Stream",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        while True:
            # Handle incoming ping / pong or client subscription events
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            elif msg_type == "SIMULATE_REQUEST":
                # Allow authorized client to request a simulator step
                db = SessionLocal()
                try:
                    res = TrackingService.simulate_movement_step(db=db)
                    await websocket.send_json({
                        "type": "SIMULATION_SUCCESS",
                        "buses_moved": res.buses_moved
                    })
                finally:
                    db.close()
    except WebSocketDisconnect:
        tracking_hub.disconnect(websocket)
    except Exception:
        tracking_hub.disconnect(websocket)
