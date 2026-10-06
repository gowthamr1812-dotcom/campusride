# CampusRide System Architecture

## 1. Overview
**CampusRide** is an enterprise-grade college transportation management platform engineered to streamline fleet operations, student routing, real-time vehicle telematics, financial accounting, and safety incident response across educational campuses.

## 2. High-Level Architecture Diagram
```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|   +-----------------------+   +--------------------+   +-------------+  |
|   | Admin / Manager Portal|   | Bus Incharge App   |   | Student App |  |
|   | (React + Vite Desktop)|   | (Mobile Optimized) |   | (Mobile App)|  |
|   +-----------------------+   +--------------------+   +-------------+  |
+------------------------------------+------------------------------------+
                                     | HTTPS / WSS
+------------------------------------v------------------------------------+
|                         GATEWAY & PROXY (Nginx)                         |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
|                          BACKEND LAYER (FastAPI)                        |
|                                                                         |
|  +-------------------+  +-------------------+  +---------------------+  |
|  |   API Routers     |  |   WebSockets Hub  |  |   Background Tasks  |  |
|  | (/api/v1/auth,    |  | (/ws/tracking,    |  | (GPS Simulator,     |  |
|  |  /buses, etc.)    |  |  /ws/notifs)      |  |  ETA calculations)  |  |
|  +---------+---------+  +---------+---------+  +----------+----------+  |
|            |                      |                       |             |
|  +---------v----------------------v-----------------------v----------+  |
|  |                        SERVICE LAYER                               |  |
|  |  - AuthService         - FleetService      - TrackingService       |  |
|  |  - RouteService        - PaymentService    - AIService             |  |
|  +--------------------------------+-----------------------------------+  |
|                                   |                                     |
|  +--------------------------------v-----------------------------------+  |
|  |                 DATA ACCESS & ORM LAYER (SQLAlchemy 2.0)           |  |
|  +--------------------------------+-----------------------------------+  |
+-----------------------------------+-------------------------------------+
                                    |
+-----------------------------------v-------------------------------------+
|                      DATABASE LAYER (PostgreSQL + PostGIS)              |
|   - Spatial indexing for bus coordinates & route polyline checkpoints   |
|   - Strict relational constraints, transactions & audit logs           |
+-------------------------------------------------------------------------+
```

## 3. Technology Stack & Design Decisions
- **Frontend**: React 18 with Vite, React Router v6, Axios, Lucide React icons, Leaflet with OpenStreetMap, Recharts, and i18next for multilingual support (English, Tamil, Hindi).
- **Backend**: FastAPI with Python 3.12, strict Pydantic v2 validation, SQLAlchemy 2.0 ORM, and Alembic database migrations.
- **Database**: PostgreSQL 16 with PostGIS extension for geospatial queries and location analytics.
- **Real-Time Communication**: Native WebSockets with connection lifecycle tracking, heartbeat ping/pong, and role-filtered pub/sub broadcasting.
- **Security**: JWT authentication (access & refresh tokens), bcrypt password hashing, granular RBAC (5 core roles), audit logging, and defensive input validation.
