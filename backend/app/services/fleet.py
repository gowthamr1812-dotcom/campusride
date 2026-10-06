from typing import List, Optional
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.fleet import MaintenanceLog, FuelLog, VehicleDocument
from app.models.transport import Bus
from app.models.people import Driver
from app.core.exceptions import NotFoundException, BadRequestException
from app.schemas.fleet import (
    MaintenanceLogCreate,
    MaintenanceLogUpdate,
    MaintenanceLogResponse,
    FuelLogCreate,
    FuelLogResponse,
    VehicleDocumentCreate,
    VehicleDocumentUpdate,
    VehicleDocumentResponse,
    FleetSummaryResponse
)


class MaintenanceService:

    @staticmethod
    def _enrich_maintenance(log: MaintenanceLog) -> MaintenanceLogResponse:
        resp = MaintenanceLogResponse.model_validate(log)
        if log.bus:
            resp.bus_number = log.bus.bus_number
            resp.registration_number = log.bus.registration_number
        if log.driver:
            resp.driver_name = log.driver.name
        return resp

    @staticmethod
    def create_maintenance_log(
        db: Session,
        data: MaintenanceLogCreate,
        reported_by_user_id: Optional[int] = None
    ) -> MaintenanceLogResponse:
        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise NotFoundException(f"Bus with ID {data.bus_id} not found.")

        log = MaintenanceLog(
            bus_id=data.bus_id,
            driver_id=data.driver_id,
            reported_by_user_id=reported_by_user_id,
            service_type=data.service_type,
            description=data.description,
            service_date=data.service_date or date.today(),
            odometer_reading=data.odometer_reading or bus.odometer,
            cost=data.cost,
            vendor_name=data.vendor_name,
            invoice_number=data.invoice_number,
            status=data.status,
            priority=data.priority
        )
        db.add(log)

        # If maintenance is In Progress or Critical, set bus status to Maintenance
        if data.status in ["In Progress", "Critical"] or data.priority == "Critical":
            bus.status = "Maintenance"

        db.commit()
        db.refresh(log)
        return MaintenanceService._enrich_maintenance(log)

    @staticmethod
    def update_maintenance_log(
        db: Session,
        log_id: int,
        data: MaintenanceLogUpdate
    ) -> MaintenanceLogResponse:
        log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
        if not log:
            raise NotFoundException(f"Maintenance log {log_id} not found.")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(log, key, value)

        # If completed, check if bus can be marked back to Running / Stopped
        if data.status == "Completed":
            log.completion_date = data.completion_date or date.today()
            other_active = db.query(MaintenanceLog).filter(
                MaintenanceLog.bus_id == log.bus_id,
                MaintenanceLog.id != log.id,
                MaintenanceLog.status.in_(["In Progress", "Critical"])
            ).count()
            target_bus = db.query(Bus).filter(Bus.id == log.bus_id).first()
            if other_active == 0 and target_bus and target_bus.status == "Maintenance":
                target_bus.status = "Running"

        db.commit()
        db.refresh(log)
        return MaintenanceService._enrich_maintenance(log)

    @staticmethod
    def list_maintenance_logs(
        db: Session,
        bus_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None
    ) -> List[MaintenanceLogResponse]:
        query = db.query(MaintenanceLog)
        if bus_id:
            query = query.filter(MaintenanceLog.bus_id == bus_id)
        if status:
            query = query.filter(MaintenanceLog.status == status)
        if priority:
            query = query.filter(MaintenanceLog.priority == priority)

        logs = query.order_by(MaintenanceLog.service_date.desc(), MaintenanceLog.id.desc()).all()
        return [MaintenanceService._enrich_maintenance(l) for l in logs]


class FuelService:

    @staticmethod
    def _enrich_fuel(log: FuelLog) -> FuelLogResponse:
        resp = FuelLogResponse.model_validate(log)
        if log.bus:
            resp.bus_number = log.bus.bus_number
            resp.registration_number = log.bus.registration_number
        if log.driver:
            resp.driver_name = log.driver.name
        return resp

    @staticmethod
    def record_fuel_log(
        db: Session,
        data: FuelLogCreate,
        recorded_by_user_id: Optional[int] = None
    ) -> FuelLogResponse:
        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise NotFoundException(f"Bus with ID {data.bus_id} not found.")

        total_cost = round(data.liters_filled * data.rate_per_liter, 2)

        log = FuelLog(
            bus_id=data.bus_id,
            driver_id=data.driver_id,
            recorded_by_user_id=recorded_by_user_id,
            log_date=data.log_date or date.today(),
            liters_filled=data.liters_filled,
            rate_per_liter=data.rate_per_liter,
            total_cost=total_cost,
            odometer_reading=data.odometer_reading,
            fuel_station=data.fuel_station or "Indian Oil Campus Depot",
            fuel_level_after_fill=data.fuel_level_after_fill or 100.0,
            payment_mode=data.payment_mode or "Fleet Card",
            invoice_slip_number=data.invoice_slip_number,
            notes=data.notes
        )
        db.add(log)

        # Update vehicle telemetry
        bus.fuel_level_percent = min(100.0, max(0.0, data.fuel_level_after_fill))
        if data.odometer_reading > bus.odometer:
            bus.odometer = data.odometer_reading

        db.commit()
        db.refresh(log)
        return FuelService._enrich_fuel(log)

    @staticmethod
    def list_fuel_logs(
        db: Session,
        bus_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[FuelLogResponse]:
        query = db.query(FuelLog)
        if bus_id:
            query = query.filter(FuelLog.bus_id == bus_id)
        if driver_id:
            query = query.filter(FuelLog.driver_id == driver_id)
        if start_date:
            query = query.filter(FuelLog.log_date >= start_date)
        if end_date:
            query = query.filter(FuelLog.log_date <= end_date)

        logs = query.order_by(FuelLog.log_date.desc(), FuelLog.id.desc()).all()
        return [FuelService._enrich_fuel(l) for l in logs]


class DocumentService:

    @staticmethod
    def _enrich_document(doc: VehicleDocument) -> VehicleDocumentResponse:
        today = date.today()
        days_left = (doc.expiry_date - today).days

        # Dynamic status check
        if days_left < 0:
            doc.status = "Expired"
        elif days_left <= 30:
            doc.status = "Expiring Soon"
        else:
            doc.status = "Valid"

        resp = VehicleDocumentResponse.model_validate(doc)
        if doc.bus:
            resp.bus_number = doc.bus.bus_number
        resp.days_until_expiry = days_left
        return resp

    @staticmethod
    def create_document(db: Session, data: VehicleDocumentCreate) -> VehicleDocumentResponse:
        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise NotFoundException(f"Bus with ID {data.bus_id} not found.")

        today = date.today()
        days_left = (data.expiry_date - today).days
        doc_status = "Expired" if days_left < 0 else "Expiring Soon" if days_left <= 30 else "Valid"

        doc = VehicleDocument(
            bus_id=data.bus_id,
            document_type=data.document_type,
            document_number=data.document_number,
            issuing_authority=data.issuing_authority or "RTO Chennai",
            issue_date=data.issue_date,
            expiry_date=data.expiry_date,
            status=doc_status,
            file_url=data.file_url,
            notes=data.notes
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return DocumentService._enrich_document(doc)

    @staticmethod
    def update_document(
        db: Session,
        doc_id: int,
        data: VehicleDocumentUpdate
    ) -> VehicleDocumentResponse:
        doc = db.query(VehicleDocument).filter(VehicleDocument.id == doc_id).first()
        if not doc:
            raise NotFoundException(f"Document {doc_id} not found.")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(doc, key, value)

        db.commit()
        db.refresh(doc)
        return DocumentService._enrich_document(doc)

    @staticmethod
    def list_documents(
        db: Session,
        bus_id: Optional[int] = None,
        document_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[VehicleDocumentResponse]:
        query = db.query(VehicleDocument)
        if bus_id:
            query = query.filter(VehicleDocument.bus_id == bus_id)
        if document_type:
            query = query.filter(VehicleDocument.document_type == document_type)

        docs = query.order_by(VehicleDocument.expiry_date.asc()).all()
        enriched = [DocumentService._enrich_document(d) for d in docs]
        if status:
            enriched = [d for d in enriched if d.status == status]
        return enriched


class FleetSummaryService:

    @staticmethod
    def get_summary(db: Session) -> FleetSummaryResponse:
        today = date.today()
        total_buses = db.query(Bus).count()
        buses_in_maint = db.query(Bus).filter(Bus.status == "Maintenance").count()
        active_orders = db.query(MaintenanceLog).filter(
            MaintenanceLog.status.in_(["Scheduled", "In Progress", "Critical"])
        ).count()
        total_maint_cost = db.query(func.sum(MaintenanceLog.cost)).scalar() or 0.0

        fuel_liters = db.query(func.sum(FuelLog.liters_filled)).scalar() or 0.0
        fuel_cost = db.query(func.sum(FuelLog.total_cost)).scalar() or 0.0

        all_docs = db.query(VehicleDocument).all()
        expired = 0
        expiring = 0
        valid = 0
        for d in all_docs:
            days = (d.expiry_date - today).days
            if days < 0:
                expired += 1
            elif days <= 30:
                expiring += 1
            else:
                valid += 1

        return FleetSummaryResponse(
            total_buses=total_buses,
            buses_in_maintenance=buses_in_maint,
            active_service_orders=active_orders,
            total_maintenance_expenditure=round(total_maint_cost, 2),
            monthly_fuel_liters=round(fuel_liters, 1),
            monthly_fuel_cost=round(fuel_cost, 2),
            valid_documents_count=valid,
            expiring_documents_count=expiring,
            expired_documents_count=expired
        )
