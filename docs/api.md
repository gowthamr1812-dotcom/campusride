# CampusRide API Documentation Guide

## Standard Conventions
- Base Route: `/api/v1`
- Content Type: `application/json`
- Authentication Header: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

## Main Resource Endpoints
- `/api/v1/health` - Liveness & readiness probes
- `/api/v1/auth` - Login, logout, token refresh, session revocation
- `/api/v1/users` - User CRUD, status toggling, role assignment (Admin only)
- `/api/v1/profile` - Current user profile, personal contacts, preferences
- `/api/v1/settings` - System-wide settings & user UI preferences
- `/api/v1/buses` - Fleet registry, hardware telemetry, vehicle status
- `/api/v1/drivers` - Driver profiles, licensing, operational allocation
- `/api/v1/incharges` - Bus Incharge records, assignments, student rosters
- `/api/v1/students` - Student registry, transport passes, route assignments
- `/api/v1/routes` - Route polylines, stops, sequences, timetables
- `/api/v1/trips` - Scheduled/live trips, vehicle checklists, driver state transitions
- `/api/v1/seats` - Bus seat layout grids, availability matrix, seat allocation
- `/api/v1/attendance` - Staff & student boarding verification logs
- `/api/v1/tracking` - GPS coordinate ingestion & live vehicle positions
- `/api/v1/fees` & `/api/v1/payments` - Transport fee schedules & payment receipts
- `/api/v1/services` & `/api/v1/fuel` - Preventative maintenance & diesel logs
- `/api/v1/documents` - Registration, fitness, permit & insurance document management
- `/api/v1/notifications` - Broadcast & targeted operational alerts
- `/api/v1/emergency` - SOS trigger, live incident tracking & dispatching
- `/api/v1/instructions` - Travel safety directives and acknowledgment flow
- `/api/v1/ai` - AI Assistant, ETA forecasting, fuel anomalies, preventative insights
- `/api/v1/reports` - Exportable operational, financial, and fleet metrics

## WebSockets
- `/ws/tracking` - Real-time vehicle GPS broadcast stream
- `/ws/notifications` - Real-time user alert push stream
