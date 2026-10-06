# CampusRide Authentication & RBAC

## 1. Authentication Mechanism
CampusRide uses stateless JWT (JSON Web Tokens) with a dual-token strategy:
- Short-lived Access Token (e.g., 60 minutes) containing `sub` (user_id), `role`, and `session_id`.
- Long-lived Refresh Token (e.g., 7 days) stored securely to renew sessions without re-authenticating.

## 2. Password Security
- Passwords are encrypted using modern `bcrypt` key derivation with work factor 12.
- Plaintext passwords are never logged, echoed, or stored.

## 3. Role-Based Access Control (RBAC)
CampusRide defines 5 distinct roles:
1. `ADMIN`: Unrestricted platform governance, user management, audit logs, and global configuration.
2. `TRANSPORT_MANAGER`: Day-to-day operations, route planning, fleet maintenance, and driver scheduling.
3. `BUS_INCHARGE`: Dedicated bus custodian for safety, student boarding attendance, and incident reporting.
4. `DRIVER`: Pre-trip checklists, journey execution, GPS telematics broadcast, and diesel logs.
5. `STUDENT`: Isolated read access to self-assigned bus, live map, stop ETA, receipts, and safety guidelines.
