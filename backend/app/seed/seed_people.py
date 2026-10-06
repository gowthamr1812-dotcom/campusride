from datetime import date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.people import Driver, BusIncharge, Student
from app.models.user import User

DRIVER_NAMES = [
    "Ramesh Kumar", "Suresh Babu", "Arun Prakash", "Karthik Raj", "Vignesh Kumar",
    "Praveen S", "Senthil Kumar", "Dinesh Raj", "Mani K", "Saravanan P",
    "Rajesh M", "Murugan S", "Gokul R", "Naveen Kumar", "Balaji S",
    "Vijay Kumar", "Ashok R", "Mohan Das", "Hari Prasad", "Anand Kumar"
]

ROUTES = [
    ("R-01", "Tambaram Route", "BUS-01"),
    ("R-02", "Avadi Route", "BUS-02"),
    ("R-03", "Velachery Route", "BUS-03"),
    ("R-04", "T. Nagar Route", "BUS-04"),
    ("R-05", "Porur Route", "BUS-05"),
    ("R-06", "Ambattur Route", "BUS-06"),
    ("R-07", "Perungalathur Route", "BUS-07"),
    ("R-08", "Medavakkam Route", "BUS-08"),
    ("R-09", "Adyar Route", "BUS-09"),
    ("R-10", "Anna Nagar Route", "BUS-10"),
    ("R-11", "Sholinganallur Route", "BUS-11"),
    ("R-12", "Guduvanchery Route", "BUS-12"),
    ("R-13", "Chromepet Route", "BUS-13"),
    ("R-14", "Pallavaram Route", "BUS-14"),
    ("R-15", "Madipakkam Route", "BUS-15"),
    ("R-16", "Nanganallur Route", "BUS-16"),
    ("R-17", "Thiruvanmiyur Route", "BUS-17"),
    ("R-18", "Mogappair Route", "BUS-18"),
    ("R-19", "Poonamallee Route", "BUS-19"),
    ("R-20", "Kelambakkam Route", "BUS-20"),
]

INCHARGE_NAMES = [
    "Meena Priya", "Anitha Ramesh", "Geetha Sundar", "Malathi Krishnan", "Kavitha Mohan",
    "Priya Dharshini", "Revathi S", "Sudha Balan", "Chitra Devi", "Vani Shree",
    "Deepa Lakshmi", "Uma Maheshwari", "Shanthi Narayanan", "Latha Saravanan", "Jayanthi Kumar",
    "Saranya R", "Pavithra M", "Divya Bharathi", "Nandhini K", "Soundarya S"
]

FIRST_NAMES = [
    "Aravind", "Bhavani", "Chethan", "Deepak", "Elango", "Fathima", "Ganesh", "Hari",
    "Ishwarya", "Jeeva", "Karthik", "Lakshmi", "Manoj", "Nithya", "Omprakash", "Pooja",
    "Rahul", "Sneha", "Tarun", "Usha", "Varun", "Vidya", "Yogesh", "Zara", "Abishek",
    "Bharathi", "Chandran", "Divya", "Eashwar", "Gayathri", "Harish", "Induja"
]

LAST_NAMES = [
    "Sundaram", "Rajan", "Natarajan", "Murugan", "Subramanian", "Balaji", "Krishnan",
    "Srinivasan", "Venkatesh", "Ramachandran", "Anand", "Swaminathan", "Pandian", "Sethuraman"
]

DEPARTMENTS = ["CSE", "ECE", "MECH", "IT", "CIVIL", "EEE", "AIDS"]
PAYMENT_STATUSES = ["Paid", "Paid", "Paid", "Partial", "Pending", "Paid"]


def seed_people(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Seed Drivers (20 drivers)
        if db.query(Driver).count() == 0:
            drivers = []
            for i, name in enumerate(DRIVER_NAMES):
                d_id = f"DRV-{i+1:03d}"
                route_code, route_name, bus_num = ROUTES[i]
                drivers.append(Driver(
                    driver_id=d_id,
                    name=name,
                    phone=f"+91 98401 {20000 + i + 1}",
                    email=f"driver{i+1}@campusride.edu",
                    license_number=f"TN-01-2015-{1000 + i + 1}",
                    license_expiry=date(2028, 5, 15),
                    assigned_bus=bus_num,
                    assigned_route=route_name,
                    emergency_contact=f"+91 98402 {20000 + i + 1}",
                    status="Active" if i < 18 else "On Leave"
                ))
            db.bulk_save_objects(drivers)
            db.commit()
            print("Seeded 20 drivers.")

        # Seed Bus Incharges (20 incharges)
        if db.query(BusIncharge).count() == 0:
            incharges = []
            for i, name in enumerate(INCHARGE_NAMES):
                inc_id = f"INC-{i+1:03d}"
                emp_id = f"EMP-{1000 + i + 1}"
                
                # Align INC-001 with BUS-07 Perungalathur Route per spec
                if i == 0:
                    bus_num = "BUS-07"
                    route_name = "Perungalathur Route"
                    email = "incharge@campusride.edu"
                elif i == 6:
                    bus_num = "BUS-01"
                    route_name = "Tambaram Route"
                    email = "incharge7@campusride.edu"
                else:
                    route_code, route_name, bus_num = ROUTES[i]
                    email = f"incharge{i+1}@campusride.edu"

                incharges.append(BusIncharge(
                    incharge_id=inc_id,
                    employee_id=emp_id,
                    name=name,
                    phone=f"+91 98403 {30000 + i + 1}",
                    email=email,
                    assigned_bus=bus_num,
                    assigned_route=route_name,
                    emergency_contact=f"+91 98404 {30000 + i + 1}",
                    status="Active"
                ))
            db.bulk_save_objects(incharges)
            db.commit()
            print("Seeded 20 Bus Incharges.")

        # Seed 320 Students (16 students per bus across 20 buses)
        if db.query(Student).count() == 0:
            students = []
            stu_idx = 1
            for route_idx, (r_code, r_name, bus_num) in enumerate(ROUTES):
                for seat_num in range(1, 17):  # 16 students per route/bus = 320 students
                    first = FIRST_NAMES[(stu_idx * 3) % len(FIRST_NAMES)]
                    last = LAST_NAMES[(stu_idx * 7) % len(LAST_NAMES)]
                    full_name = f"{first} {last}"
                    dept = DEPARTMENTS[stu_idx % len(DEPARTMENTS)]
                    year = (stu_idx % 4) + 1
                    pay_status = PAYMENT_STATUSES[stu_idx % len(PAYMENT_STATUSES)]

                    students.append(Student(
                        student_id=f"STU-{stu_idx:04d}",
                        name=full_name,
                        department=dept,
                        year=year,
                        phone=f"+91 98405 {50000 + stu_idx}",
                        parent_phone=f"+91 98406 {60000 + stu_idx}",
                        bus=bus_num,
                        route=r_name,
                        stop=f"Stop {((seat_num - 1) % 5) + 1} ({r_name.split()[0]})",
                        seat=f"{(seat_num // 2) + 1}{'A' if seat_num % 2 == 1 else 'B'}",
                        transport_status="Active" if pay_status != "Overdue" else "Suspended",
                        payment_status=pay_status
                    ))
                    stu_idx += 1

            db.bulk_save_objects(students)
            db.commit()
            print(f"Seeded {len(students)} students.")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_people()
