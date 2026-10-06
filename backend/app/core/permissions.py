from typing import List, Set
from app.models.user import UserRole


# Granular system permissions
ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        "*"
    },
    UserRole.TRANSPORT_MANAGER: {
        "buses:read", "buses:write",
        "routes:read", "routes:write",
        "stops:read", "stops:write",
        "trips:read", "trips:write",
        "seats:read", "seats:write",
        "tracking:read",
        "attendance:read", "attendance:write",
        "students:read",
        "drivers:read", "drivers:write",
        "incharges:read", "incharges:write",
        "fees:read",
        "payments:read",
        "receipts:read",
        "services:read", "services:write",
        "fuel:read", "fuel:write",
        "documents:read", "documents:write",
        "emergency:read", "emergency:write",
        "notifications:read", "notifications:write",
        "reports:read",
        "ai:use"
    },
    UserRole.BUS_INCHARGE: {
        "buses:assigned:read",
        "students:assigned:read",
        "routes:assigned:read",
        "attendance:students:manage",
        "seats:assigned:read",
        "tracking:assigned:read",
        "reports:bus:create",
        "emergency:create",
        "notifications:read",
        "instructions:read",
        "ai:use"
    },
    UserRole.DRIVER: {
        "buses:assigned:read",
        "routes:assigned:read",
        "trips:assigned:read",
        "trips:manage",
        "telematics:send",
        "fuel:record",
        "issues:report",
        "emergency:create",
        "notifications:read",
        "instructions:read"
    },
    UserRole.STUDENT: {
        "transport:own:read",
        "attendance:own:read",
        "tracking:assigned:read",
        "eta:assigned:read",
        "payments:own:read",
        "receipts:own:read",
        "instructions:read",
        "notifications:own:read",
        "ai:use:own"
    }
}


def get_role_permissions(role: UserRole | str) -> List[str]:
    """Returns the list of permissions assigned to a given role."""
    if isinstance(role, str):
        try:
            role = UserRole(role)
        except ValueError:
            return []
    perms = ROLE_PERMISSIONS.get(role, set())
    return sorted(list(perms))


def has_permission(role: UserRole | str, required_permission: str) -> bool:
    """Checks whether a role possesses the required permission."""
    if isinstance(role, str):
        try:
            role = UserRole(role)
        except ValueError:
            return False
            
    perms = ROLE_PERMISSIONS.get(role, set())
    if "*" in perms:
        return True
    return required_permission in perms
