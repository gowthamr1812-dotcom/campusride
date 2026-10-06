import uuid
import asyncio
from typing import Optional, List, Dict, Set, Any
from datetime import datetime, timezone
from fastapi import WebSocket, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.safety import (
    EmergencyIncident,
    Notification,
    NotificationReadStatus,
    SafetyInstruction,
    InstructionAcknowledgment
)
from app.models.transport import Bus, Trip
from app.models.people import Driver, BusIncharge, Student
from app.models.user import User, UserRole
from app.schemas.safety import (
    EmergencyTriggerRequest,
    EmergencyIncidentUpdate,
    EmergencyIncidentResponse,
    EmergencySummaryResponse,
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    SafetyInstructionCreate,
    SafetyInstructionResponse,
    AcknowledgmentResponse
)


class NotificationConnectionManager:
    """Maintains active WebSocket connections for push notification broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_json(self, data: Dict[str, Any]):
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.add(connection)
        for dead in disconnected:
            self.active_connections.discard(dead)


# Global Notification broadcast manager instance
notif_hub = NotificationConnectionManager()


class EmergencyService:

    @staticmethod
    def _enrich_incident(incident: EmergencyIncident) -> EmergencyIncidentResponse:
        bus = incident.bus
        rescue_bus = incident.rescue_bus
        driver = bus.driver if bus else None
        route = bus.route if bus else None
        reported_by = incident.reported_by

        return EmergencyIncidentResponse(
            id=incident.id,
            incident_code=incident.incident_code,
            bus_id=incident.bus_id,
            bus_number=bus.bus_number if bus else None,
            registration_number=bus.registration_number if bus else None,
            route_name=route.name if route else None,
            driver_name=driver.name if driver else None,
            driver_phone=driver.phone if driver else None,
            trip_id=incident.trip_id,
            incident_type=incident.incident_type,
            severity=incident.severity,
            status=incident.status,
            latitude=incident.latitude,
            longitude=incident.longitude,
            location_name=incident.location_name,
            description=incident.description,
            rescue_bus_id=incident.rescue_bus_id,
            rescue_bus_number=rescue_bus.bus_number if rescue_bus else None,
            reported_at=incident.reported_at,
            resolved_at=incident.resolved_at,
            resolution_notes=incident.resolution_notes,
            reported_by_name=reported_by.full_name if reported_by else "System Alert"
        )

    @staticmethod
    def trigger_sos(
        db: Session,
        data: EmergencyTriggerRequest,
        reported_by_user_id: int
    ) -> EmergencyIncidentResponse:
        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise HTTPException(status_code=404, detail=f"Bus with ID {data.bus_id} not found")

        # Determine coordinates if not supplied
        lat = data.latitude if data.latitude is not None else (bus.latitude or 12.8230)
        lon = data.longitude if data.longitude is not None else (bus.longitude or 80.0440)

        # Mark bus as Stopped or Delayed
        if data.severity in ["Critical", "High"]:
            bus.status = "Stopped"
        else:
            bus.status = "Delayed"

        incident_code = f"SOS-2026-{uuid.uuid4().hex[:5].upper()}"

        incident = EmergencyIncident(
            incident_code=incident_code,
            bus_id=bus.id,
            trip_id=data.trip_id,
            reported_by_id=reported_by_user_id,
            incident_type=data.incident_type,
            severity=data.severity,
            status="Triggered / Active",
            latitude=lat,
            longitude=lon,
            location_name=data.location_name or f"Near Route {bus.route.name if bus.route else 'Corridor'}",
            description=data.description,
            reported_at=datetime.now(timezone.utc)
        )
        db.add(incident)

        # Automatically broadcast high-priority emergency notification
        notif_code = f"NOTIF-SOS-{uuid.uuid4().hex[:5].upper()}"
        notif = Notification(
            notification_code=notif_code,
            title=f"EMERGENCY SOS: {bus.bus_number} - {data.incident_type}",
            message=f"Urgent incident reported for {bus.bus_number} ({data.location_name or 'Transit Corridor'}): {data.description}. Operations team responding.",
            category="EMERGENCY_SOS",
            priority="URGENT",
            target_audience="ALL",
            target_bus_id=bus.id,
            created_by_id=reported_by_user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(notif)

        db.commit()
        db.refresh(incident)

        # Broadcast push notification asynchronously
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(notif_hub.broadcast_json({
                "type": "EMERGENCY_SOS_ALERT",
                "incident_code": incident.incident_code,
                "bus_number": bus.bus_number,
                "incident_type": incident.incident_type,
                "severity": incident.severity,
                "latitude": incident.latitude,
                "longitude": incident.longitude,
                "message": notif.message,
                "timestamp": incident.reported_at.isoformat()
            }))
        except RuntimeError:
            pass

        return EmergencyService._enrich_incident(incident)

    @staticmethod
    def update_incident(
        db: Session,
        incident_id: int,
        data: EmergencyIncidentUpdate
    ) -> EmergencyIncidentResponse:
        incident = db.query(EmergencyIncident).filter(EmergencyIncident.id == incident_id).first()
        if not incident:
            raise HTTPException(status_code=404, detail=f"Emergency incident {incident_id} not found")

        if data.status:
            incident.status = data.status
            if data.status == "Resolved":
                incident.resolved_at = datetime.now(timezone.utc)
                # Restore bus status if no other active critical incidents
                other_active = db.query(EmergencyIncident).filter(
                    EmergencyIncident.bus_id == incident.bus_id,
                    EmergencyIncident.status == "Triggered / Active",
                    EmergencyIncident.id != incident.id
                ).count()
                if other_active == 0 and incident.bus:
                    incident.bus.status = "Running"

        if data.resolution_notes:
            incident.resolution_notes = data.resolution_notes

        if data.rescue_bus_id:
            incident.rescue_bus_id = data.rescue_bus_id

        db.commit()
        db.refresh(incident)
        return EmergencyService._enrich_incident(incident)

    @staticmethod
    def list_incidents(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        bus_id: Optional[int] = None
    ) -> List[EmergencyIncidentResponse]:
        query = db.query(EmergencyIncident)
        if status:
            query = query.filter(EmergencyIncident.status == status)
        if severity:
            query = query.filter(EmergencyIncident.severity == severity)
        if bus_id:
            query = query.filter(EmergencyIncident.bus_id == bus_id)

        incidents = query.order_by(desc(EmergencyIncident.reported_at)).all()
        return [EmergencyService._enrich_incident(i) for i in incidents]

    @staticmethod
    def get_summary(db: Session) -> EmergencySummaryResponse:
        total = db.query(EmergencyIncident).count()
        active = db.query(EmergencyIncident).filter(EmergencyIncident.status == "Triggered / Active").count()
        dispatched = db.query(EmergencyIncident).filter(EmergencyIncident.status == "Dispatched").count()
        resolved = db.query(EmergencyIncident).filter(EmergencyIncident.status.in_(["Resolved", "False Alarm"])).count()

        return EmergencySummaryResponse(
            active_sos_count=active,
            dispatched_count=dispatched,
            resolved_count=resolved,
            total_incidents=total
        )


class NotificationService:

    @staticmethod
    def create_notification(
        db: Session,
        data: NotificationCreate,
        created_by_id: int
    ) -> NotificationResponse:
        notif_code = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"

        notif = Notification(
            notification_code=notif_code,
            title=data.title,
            message=data.message,
            category=data.category,
            priority=data.priority,
            target_audience=data.target_audience,
            target_bus_id=data.target_bus_id,
            target_user_id=data.target_user_id,
            created_by_id=created_by_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # Broadcast via WebSocket
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(notif_hub.broadcast_json({
                "type": "PUSH_NOTIFICATION",
                "notification_code": notif.notification_code,
                "title": notif.title,
                "message": notif.message,
                "category": notif.category,
                "priority": notif.priority,
                "timestamp": notif.created_at.isoformat()
            }))
        except RuntimeError:
            pass

        bus_num = notif.target_bus.bus_number if notif.target_bus else None
        return NotificationResponse(
            id=notif.id,
            notification_code=notif.notification_code,
            title=notif.title,
            message=notif.message,
            category=notif.category,
            priority=notif.priority,
            target_audience=notif.target_audience,
            target_bus_id=notif.target_bus_id,
            target_bus_number=bus_num,
            is_broadcast=notif.is_broadcast,
            created_at=notif.created_at,
            is_read=False,
            read_at=None
        )

    @staticmethod
    def list_notifications_for_user(
        db: Session,
        current_user: User,
        category: Optional[str] = None
    ) -> NotificationListResponse:
        # Determine audience filters according to caller's role
        audiences = ["ALL"]
        if current_user.role == UserRole.STUDENT:
            audiences.append("STUDENTS")
        elif current_user.role == UserRole.DRIVER:
            audiences.append("DRIVERS")
        elif current_user.role == UserRole.BUS_INCHARGE:
            audiences.append("INCHARGES")
        elif current_user.role in [UserRole.ADMIN, UserRole.TRANSPORT_MANAGER]:
            audiences.extend(["STUDENTS", "DRIVERS", "INCHARGES", "MANAGERS", "BUS_SPECIFIC"])

        query = db.query(Notification).filter(Notification.target_audience.in_(audiences))
        if category:
            query = query.filter(Notification.category == category)

        notifs = query.order_by(desc(Notification.created_at)).all()

        # Find user read records
        read_statuses = db.query(NotificationReadStatus).filter(
            NotificationReadStatus.user_id == current_user.id
        ).all()
        read_map = {r.notification_id: r.read_at for r in read_statuses}

        items = []
        unread_cnt = 0
        for n in notifs:
            read_at = read_map.get(n.id)
            is_read = read_at is not None
            if not is_read:
                unread_cnt += 1

            bus_num = n.target_bus.bus_number if n.target_bus else None
            items.append(NotificationResponse(
                id=n.id,
                notification_code=n.notification_code,
                title=n.title,
                message=n.message,
                category=n.category,
                priority=n.priority,
                target_audience=n.target_audience,
                target_bus_id=n.target_bus_id,
                target_bus_number=bus_num,
                is_broadcast=n.is_broadcast,
                created_at=n.created_at,
                is_read=is_read,
                read_at=read_at
            ))

        return NotificationListResponse(
            total=len(items),
            unread_count=unread_cnt,
            items=items
        )

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> bool:
        existing = db.query(NotificationReadStatus).filter(
            NotificationReadStatus.notification_id == notification_id,
            NotificationReadStatus.user_id == user_id
        ).first()

        if not existing:
            read_obj = NotificationReadStatus(
                notification_id=notification_id,
                user_id=user_id,
                read_at=datetime.now(timezone.utc)
            )
            db.add(read_obj)
            db.commit()
        return True

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        all_notifs = db.query(Notification).all()
        existing_reads = set(
            r.notification_id for r in db.query(NotificationReadStatus.notification_id).filter(
                NotificationReadStatus.user_id == user_id
            ).all()
        )

        added = 0
        now = datetime.now(timezone.utc)
        for n in all_notifs:
            if n.id not in existing_reads:
                db.add(NotificationReadStatus(notification_id=n.id, user_id=user_id, read_at=now))
                added += 1

        db.commit()
        return added


class SafetyInstructionService:

    @staticmethod
    def create_instruction(
        db: Session,
        data: SafetyInstructionCreate
    ) -> SafetyInstructionResponse:
        instruction = SafetyInstruction(
            title=data.title,
            category=data.category,
            target_role=data.target_role,
            content=data.content,
            do_points=data.do_points,
            dont_points=data.dont_points,
            is_mandatory=data.is_mandatory,
            version=data.version,
            published_date=datetime.now(timezone.utc)
        )
        db.add(instruction)
        db.commit()
        db.refresh(instruction)

        return SafetyInstructionResponse(
            id=instruction.id,
            title=instruction.title,
            category=instruction.category,
            target_role=instruction.target_role,
            content=instruction.content,
            do_points=instruction.do_points,
            dont_points=instruction.dont_points,
            is_mandatory=instruction.is_mandatory,
            version=instruction.version,
            published_date=instruction.published_date,
            is_acknowledged=False,
            acknowledged_at=None
        )

    @staticmethod
    def list_instructions_for_user(
        db: Session,
        current_user: User,
        category: Optional[str] = None
    ) -> List[SafetyInstructionResponse]:
        roles = ["ALL", current_user.role.value]
        if current_user.role in [UserRole.ADMIN, UserRole.TRANSPORT_MANAGER]:
            roles.extend(["STUDENT", "DRIVER", "BUS_INCHARGE"])

        query = db.query(SafetyInstruction).filter(SafetyInstruction.target_role.in_(roles))
        if category:
            query = query.filter(SafetyInstruction.category == category)

        instructions = query.order_by(SafetyInstruction.id.asc()).all()

        # Find user acknowledgments
        acks = db.query(InstructionAcknowledgment).filter(
            InstructionAcknowledgment.user_id == current_user.id
        ).all()
        ack_map = {a.instruction_id: a.acknowledged_at for a in acks}

        result = []
        for inst in instructions:
            ack_at = ack_map.get(inst.id)
            result.append(SafetyInstructionResponse(
                id=inst.id,
                title=inst.title,
                category=inst.category,
                target_role=inst.target_role,
                content=inst.content,
                do_points=inst.do_points,
                dont_points=inst.dont_points,
                is_mandatory=inst.is_mandatory,
                version=inst.version,
                published_date=inst.published_date,
                is_acknowledged=ack_at is not None,
                acknowledged_at=ack_at
            ))

        return result

    @staticmethod
    def acknowledge_instruction(
        db: Session,
        instruction_id: int,
        user_id: int
    ) -> AcknowledgmentResponse:
        inst = db.query(SafetyInstruction).filter(SafetyInstruction.id == instruction_id).first()
        if not inst:
            raise HTTPException(status_code=404, detail=f"Safety instruction {instruction_id} not found")

        ack = db.query(InstructionAcknowledgment).filter(
            InstructionAcknowledgment.instruction_id == instruction_id,
            InstructionAcknowledgment.user_id == user_id
        ).first()

        if not ack:
            now = datetime.now(timezone.utc)
            ack = InstructionAcknowledgment(
                instruction_id=instruction_id,
                user_id=user_id,
                acknowledged_at=now
            )
            db.add(ack)
            db.commit()

        return AcknowledgmentResponse(
            instruction_id=instruction_id,
            user_id=user_id,
            acknowledged_at=ack.acknowledged_at,
            status="Acknowledged"
        )
