from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.models.safety import (
    EmergencyIncident,
    Notification,
    SafetyInstruction
)
from app.models.transport import Bus
from app.models.user import User


SAMPLE_INSTRUCTIONS = [
    {
        "title": "Student Boarding & De-Boarding Standard Protocols",
        "category": "Boarding & De-boarding",
        "target_role": "STUDENT",
        "content": "All students must strictly arrive at their designated boarding stop at least 5 minutes prior to the scheduled departure time. Maintain an orderly queue and avoid rushing toward moving buses. Ensure your transport pass QR/RFID is ready for scanning by the Bus Incharge.",
        "do_points": "Arrive 5 minutes prior; Queue in single file; Keep transport card ready; Wait until bus completely halts",
        "dont_points": "Do not chase a moving vehicle; Do not board without scanning pass; Do not push fellow students; Never cross directly behind a parked bus",
        "is_mandatory": True,
        "version": "v1.3"
    },
    {
        "title": "In-Transit Passenger Safety & Cabin Conduct",
        "category": "In-Transit Safety",
        "target_role": "STUDENT",
        "content": "Remain seated in your designated seat for the entire journey. Fasten seatbelts where provided. Keep aisles completely unobstructed from backpacks and luggage. In case of nausea or medical discomfort, notify the Bus Incharge immediately.",
        "do_points": "Remain in designated seat; Keep backpacks on overhead rack or floor; Report medical discomfort promptly; Respect fellow passengers",
        "dont_points": "Never lean out of windows; Do not stand or roam while vehicle is in motion; Do not distract the driver; Loud music or misconduct is strictly prohibited",
        "is_mandatory": True,
        "version": "v1.2"
    },
    {
        "title": "Emergency Evacuation & Fire Drill Protocols",
        "category": "Emergency Evacuation",
        "target_role": "ALL",
        "content": "In the rare event of a mechanical hazard, smoke, or collision, remain calm. Listen to immediate directives given by the Driver and Bus Incharge. Evacuate via the primary front entry or rear emergency exit door. Move at least 50 meters away from the vehicle toward safe pavement.",
        "do_points": "Follow Bus Incharge commands; Leave heavy luggage behind; Assist injured peers if safe; Assemble 50m clear of road",
        "dont_points": "Do not panic or crowd exit doors; Do not re-enter a hazardous vehicle; Never attempt to break windows unless emergency hammers are indicated",
        "is_mandatory": True,
        "version": "v2.0"
    },
    {
        "title": "Monsoon & Heavy Rain Transit Advisories",
        "category": "Severe Weather Protocol",
        "target_role": "ALL",
        "content": "During Chennai northeast monsoon depressions and localized waterlogging, bus speeds are regulated between 25-35 km/h for skid safety. Anticipate 15-20 minute transit delays. Live notifications will broadcast alternate arterial routes.",
        "do_points": "Check CampusRide notification tab before departure; Carry umbrellas and waterproof bag covers; Expect safe reduced transit speeds",
        "dont_points": "Do not request unscheduled detours through waterlogged underpasses; Do not step into stagnant water near stops",
        "is_mandatory": False,
        "version": "v1.1"
    },
    {
        "title": "Driver Pre-Trip Safety & Brake Checklist SOP",
        "category": "Vehicle Pre-Trip",
        "target_role": "DRIVER",
        "content": "Prior to starting the ignition every morning, drivers must inspect tire pressure, engine coolant, brake pedal resistance, headlamps, turn indicators, and emergency doors. Verify that first aid kits and fire extinguishers have valid seals.",
        "do_points": "Log mandatory vehicle checklist in Driver Cabin app; Check brake air pressure gauge; Verify emergency door latch operates smoothly",
        "dont_points": "Never commence a trip with flashing red instrument cluster warnings; Do not use mobile phones while driving; Never exceed 50 km/h college campus speed limit",
        "is_mandatory": True,
        "version": "v2.1"
    },
    {
        "title": "Bus Incharge Student Roster & Safety Directives",
        "category": "Student Safety Oversight",
        "target_role": "BUS_INCHARGE",
        "content": "The Bus Incharge is the designated authority for passenger safety. Mark student boarding scans at every stop. Ensure total passenger count never exceeds 50 seated capacity. In case of technical breakdown or driver distress, trigger the Instant SOS immediately.",
        "do_points": "Verify 100% student boarding manifest; Maintain first-aid kit readiness; Monitor student behavior and seat allocations; Trigger SOS on any critical incident",
        "dont_points": "Never permit unauthorized hitchhikers or non-passholders; Do not delay SOS escalation if bus is stranded on highway",
        "is_mandatory": True,
        "version": "v1.4"
    }
]


def seed_safety(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        admin_user = db.query(User).filter(User.email == "admin@campusride.edu").first()
        admin_id = admin_user.id if admin_user else 1

        buses = db.query(Bus).order_by(Bus.id.asc()).all()
        if not buses:
            print("No buses found to seed safety incidents.")
            return

        bus_map = {b.bus_number: b for b in buses}

        # 1. Seed Safety Instructions
        if db.query(SafetyInstruction).count() == 0:
            for inst in SAMPLE_INSTRUCTIONS:
                db.add(SafetyInstruction(
                    title=inst["title"],
                    category=inst["category"],
                    target_role=inst["target_role"],
                    content=inst["content"],
                    do_points=inst["do_points"],
                    dont_points=inst["dont_points"],
                    is_mandatory=inst["is_mandatory"],
                    version=inst["version"],
                    published_date=datetime.now(timezone.utc) - timedelta(days=20)
                ))
            db.commit()
            print(f"Seeded {len(SAMPLE_INSTRUCTIONS)} safety instructions.")

        # 2. Seed Emergency Incidents
        if db.query(EmergencyIncident).count() == 0:
            incidents_data = [
                {
                    "code": "SOS-2026-001",
                    "bus": "BUS-07",
                    "type": "Severe Traffic Gridlock",
                    "severity": "High",
                    "status": "Triggered / Active",
                    "lat": 12.9050, "lon": 80.0890,
                    "loc": "GST Road near Perungalathur Junction",
                    "desc": "Heavy truck collision on outer GST road causing 45-minute complete gridlock. Bus delayed. Radiator temperature warning elevated. Operations team monitoring.",
                    "reported_hours_ago": 1,
                    "resolved": False
                },
                {
                    "code": "SOS-2026-002",
                    "bus": "BUS-20",
                    "type": "Breakdown / Mechanical",
                    "severity": "Critical",
                    "status": "Dispatched",
                    "lat": 12.7880, "lon": 80.2190,
                    "loc": "OMR Kelambakkam Junction",
                    "desc": "Transmission oil pressure failure. Bus stopped safely at service road. Rescue bus BUS-15 dispatched to transfer 32 students to campus.",
                    "rescue_bus": "BUS-15",
                    "reported_hours_ago": 2.5,
                    "resolved": False
                },
                {
                    "code": "SOS-2026-003",
                    "bus": "BUS-03",
                    "type": "Breakdown / Mechanical",
                    "severity": "Medium",
                    "status": "Resolved",
                    "lat": 12.9800, "lon": 80.2200,
                    "loc": "Velachery Bypass Road",
                    "desc": "Rear right tire pressure puncture. Mobile puncture van attended on site. Spare wheel mounted in 18 minutes. Trip resumed.",
                    "notes": "Spare tire mounted safely. All passengers safe. Bus arrived at campus 15 minutes late.",
                    "reported_hours_ago": 24,
                    "resolved": True
                },
                {
                    "code": "SOS-2026-004",
                    "bus": "BUS-12",
                    "type": "Medical Emergency",
                    "severity": "High",
                    "status": "Resolved",
                    "lat": 12.8450, "lon": 80.0600,
                    "loc": "Guduvanchery Signal",
                    "desc": "Student experienced acute respiratory asthma attack. Bus Incharge administered inhaler and diverted 200m to SRM Rural Health Center.",
                    "notes": "Student stabilized by campus medical officer. Parent informed. Student rested safely.",
                    "reported_hours_ago": 48,
                    "resolved": True
                },
                {
                    "code": "SOS-2026-005",
                    "bus": "BUS-02",
                    "type": "Route Deviation",
                    "severity": "Low",
                    "status": "Resolved",
                    "lat": 13.0694, "lon": 80.1948,
                    "loc": "Koyambedu Metro Junction",
                    "desc": "Police barricades due to pipeline excavation on main road. Diverted via 100ft road as per traffic control guidelines.",
                    "notes": "Temporary detour approved by Transport Manager. All 7 stops serviced.",
                    "reported_hours_ago": 72,
                    "resolved": True
                }
            ]

            for inc in incidents_data:
                target_bus = bus_map.get(inc["bus"], buses[0])
                rescue_b = bus_map.get(inc.get("rescue_bus")) if inc.get("rescue_bus") else None

                reported_time = datetime.now(timezone.utc) - timedelta(hours=inc["reported_hours_ago"])
                resolved_time = reported_time + timedelta(minutes=45) if inc["resolved"] else None

                db.add(EmergencyIncident(
                    incident_code=inc["code"],
                    bus_id=target_bus.id,
                    reported_by_id=admin_id,
                    incident_type=inc["type"],
                    severity=inc["severity"],
                    status=inc["status"],
                    latitude=inc["lat"],
                    longitude=inc["lon"],
                    location_name=inc["loc"],
                    description=inc["desc"],
                    rescue_bus_id=rescue_b.id if rescue_b else None,
                    reported_at=reported_time,
                    resolved_at=resolved_time,
                    resolution_notes=inc.get("notes")
                ))
            db.commit()
            print(f"Seeded {len(incidents_data)} emergency incidents.")

        # 3. Seed Notifications
        if db.query(Notification).count() == 0:
            notifs_data = [
                {
                    "code": "NOTIF-SOS-001",
                    "title": "ACTIVE SOS: BUS-07 Delay Advisory (Perungalathur)",
                    "message": "BUS-07 on Perungalathur Route is impacted by an outer GST road bottleneck. Estimated arrival delay: ~30 mins. Live tracking active.",
                    "category": "EMERGENCY_SOS",
                    "priority": "URGENT",
                    "target_audience": "ALL",
                    "hours_ago": 1
                },
                {
                    "code": "NOTIF-DISP-002",
                    "title": "Rescue Unit Dispatched: Kelambakkam Route (BUS-20)",
                    "message": "BUS-15 has been deployed to OMR junction to transfer BUS-20 students safely to campus. ETA at junction: 8 minutes.",
                    "category": "EMERGENCY_SOS",
                    "priority": "HIGH",
                    "target_audience": "ALL",
                    "hours_ago": 2.5
                },
                {
                    "code": "NOTIF-WEA-003",
                    "title": "Monsoon Heavy Rain & Speed Regulation Advisory",
                    "message": "Chennai IMD reports moderate to heavy showers along coastal and OMR corridors. Drivers instructed to limit speed to 35 km/h.",
                    "category": "WEATHER_ALERT",
                    "priority": "HIGH",
                    "target_audience": "ALL",
                    "hours_ago": 12
                },
                {
                    "code": "NOTIF-FEE-004",
                    "title": "Even Semester Transport Pass Renewal Deadline",
                    "message": "Students with pending fee balances are requested to complete digital renewal payments before Oct 31 to maintain active RFID boarding access.",
                    "category": "FEE_REMINDER",
                    "priority": "NORMAL",
                    "target_audience": "STUDENTS",
                    "hours_ago": 24
                },
                {
                    "code": "NOTIF-SAF-005",
                    "title": "Updated Passenger Safety Directive v1.3 Published",
                    "message": "All students are requested to review and acknowledge the updated Boarding & De-boarding Safety Directive in their portal.",
                    "category": "GENERAL_ANNOUNCEMENT",
                    "priority": "NORMAL",
                    "target_audience": "STUDENTS",
                    "hours_ago": 48
                },
                {
                    "code": "NOTIF-DRV-006",
                    "title": "Mandatory Pre-Trip Odometer & Digital Checklist Sync",
                    "message": "All drivers must log digital pre-trip inspection checklist via driver cabin before 06:45 AM daily.",
                    "category": "GENERAL_ANNOUNCEMENT",
                    "priority": "NORMAL",
                    "target_audience": "DRIVERS",
                    "hours_ago": 72
                }
            ]

            for nd in notifs_data:
                db.add(Notification(
                    notification_code=nd["code"],
                    title=nd["title"],
                    message=nd["message"],
                    category=nd["category"],
                    priority=nd["priority"],
                    target_audience=nd["target_audience"],
                    created_by_id=admin_id,
                    created_at=datetime.now(timezone.utc) - timedelta(hours=nd["hours_ago"])
                ))
            db.commit()
            print(f"Seeded {len(notifs_data)} notifications.")

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_safety()
