from typing import Optional, List
from datetime import datetime, timezone
from fastapi import (
    APIRouter, Depends, Query, status, WebSocket, WebSocketDisconnect, HTTPException
)
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.safety import (
    EmergencyTriggerRequest,
    EmergencyIncidentUpdate,
    EmergencyIncidentResponse,
    EmergencyIncidentListResponse,
    EmergencySummaryResponse,
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    SafetyInstructionCreate,
    SafetyInstructionResponse,
    SafetyInstructionListResponse,
    AcknowledgmentResponse
)
from app.services.safety import (
    EmergencyService,
    NotificationService,
    SafetyInstructionService,
    notif_hub
)

router = APIRouter(tags=["Safety, Emergency & Notifications"])


# ==================== EMERGENCY / SOS ENDPOINTS ====================

@router.get(
    "/emergency/summary",
    response_model=EmergencySummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Emergency Incident Summary",
    description="Returns aggregate counts of active SOS incidents, dispatched units, and resolved emergencies."
)
async def get_emergency_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return EmergencyService.get_summary(db=db)


@router.get(
    "/emergency",
    response_model=EmergencyIncidentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Emergency Incidents",
    description="Retrieves emergency incidents with status and severity filters."
)
async def list_emergency_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    bus_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = EmergencyService.list_incidents(
        db=db, status=status_filter, severity=severity, bus_id=bus_id
    )
    return EmergencyIncidentListResponse(total=len(items), items=items)


@router.post(
    "/emergency",
    response_model=EmergencyIncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger Emergency SOS Alert",
    description="Instantly triggers an emergency event, notifies command center, marks bus status, and broadcasts SOS."
)
async def trigger_emergency_sos(
    data: EmergencyTriggerRequest,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    return EmergencyService.trigger_sos(
        db=db, data=data, reported_by_user_id=current_user.id
    )


@router.put(
    "/emergency/{incident_id}",
    response_model=EmergencyIncidentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Emergency Incident Status",
    description="Updates dispatch status, assigns rescue bus, or marks emergency resolved."
)
async def update_emergency_incident(
    incident_id: int,
    data: EmergencyIncidentUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return EmergencyService.update_incident(
        db=db, incident_id=incident_id, data=data
    )


# ==================== NOTIFICATIONS ENDPOINTS ====================

@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List User Notifications",
    description="Retrieves notifications tailored to the user's role and assigned bus with read receipts."
)
async def list_notifications(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return NotificationService.list_notifications_for_user(
        db=db, current_user=current_user, category=category
    )


@router.post(
    "/notifications",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Broadcast Operational Notification",
    description="Publishes a broadcast alert or targeted announcement across student and fleet crew streams."
)
async def create_notification(
    data: NotificationCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return NotificationService.create_notification(
        db=db, data=data, created_by_id=current_user.id
    )


@router.post(
    "/notifications/{notification_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
    description="Records user acknowledgment of a notification."
)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    NotificationService.mark_as_read(
        db=db, notification_id=notification_id, user_id=current_user.id
    )
    return {"message": "Notification marked as read", "notification_id": notification_id}


@router.post(
    "/notifications/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read",
    description="Clears unread notifications badge for current user."
)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = NotificationService.mark_all_as_read(db=db, user_id=current_user.id)
    return {"message": f"{count} notifications marked as read"}


# ==================== SAFETY INSTRUCTIONS ENDPOINTS ====================

@router.get(
    "/instructions",
    response_model=SafetyInstructionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Travel Safety Guidelines",
    description="Returns mandatory commuting directives and compliance SOPs with acknowledgment status."
)
async def list_safety_instructions(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = SafetyInstructionService.list_instructions_for_user(
        db=db, current_user=current_user, category=category
    )
    return SafetyInstructionListResponse(total=len(items), items=items)


@router.post(
    "/instructions",
    response_model=SafetyInstructionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Safety Directive",
    description="Publishes a new travel safety policy or protocol (Admin only)."
)
async def create_safety_instruction(
    data: SafetyInstructionCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return SafetyInstructionService.create_instruction(db=db, data=data)


@router.post(
    "/instructions/{instruction_id}/acknowledge",
    response_model=AcknowledgmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Acknowledge Travel Safety Directive",
    description="Records compliance acknowledgment timestamp for the logged in user."
)
async def acknowledge_safety_instruction(
    instruction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SafetyInstructionService.acknowledge_instruction(
        db=db, instruction_id=instruction_id, user_id=current_user.id
    )


# ==================== NOTIFICATIONS WEBSOCKET ====================

@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """Real-time push notification streaming endpoint."""
    await notif_hub.connect(websocket)
    try:
        await websocket.send_json({
            "type": "NOTIFICATIONS_STREAM_READY",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
    except WebSocketDisconnect:
        notif_hub.disconnect(websocket)
    except Exception:
        notif_hub.disconnect(websocket)
