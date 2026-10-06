from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole

DEFAULT_USERS = [
    {
        "email": "admin@campusride.edu",
        "username": "admin",
        "password": "Admin@123",
        "full_name": "System Administrator",
        "phone": "+91 98401 11001",
        "role": UserRole.ADMIN,
    },
    {
        "email": "manager@campusride.edu",
        "username": "manager",
        "password": "Manager@123",
        "full_name": "K. Ramanathan (Transport Manager)",
        "phone": "+91 98401 11002",
        "role": UserRole.TRANSPORT_MANAGER,
    },
    {
        "email": "incharge@campusride.edu",
        "username": "incharge_meena",
        "password": "Incharge@123",
        "full_name": "Meena Priya (Bus Incharge - BUS-07)",
        "phone": "+91 98401 11003",
        "role": UserRole.BUS_INCHARGE,
    },
    {
        "email": "driver@campusride.edu",
        "username": "driver_ramesh",
        "password": "Driver@123",
        "full_name": "Ramesh Kumar (Senior Driver - BUS-07)",
        "phone": "+91 98401 11004",
        "role": UserRole.DRIVER,
    },
    {
        "email": "student@campusride.edu",
        "username": "student_kavitha",
        "password": "Student@123",
        "full_name": "Kavitha Sundaram (CSE - Year 3)",
        "phone": "+91 98401 11005",
        "role": UserRole.STUDENT,
    },
]


def seed_default_users(db: Session = None):
    """Creates initial default users for each core role if not present."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        created_count = 0
        for user_data in DEFAULT_USERS:
            existing = db.query(User).filter(
                (User.email == user_data["email"]) | (User.username == user_data["username"])
            ).first()

            if not existing:
                new_user = User(
                    email=user_data["email"],
                    username=user_data["username"],
                    hashed_password=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    phone=user_data["phone"],
                    role=user_data["role"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(new_user)
                created_count += 1

        db.commit()
        print(f"User seed completed. {created_count} user(s) created.")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_default_users()
