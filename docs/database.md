# CampusRide Database Architecture & Schema Design

## 1. Relational & Geospatial Foundations
CampusRide leverages PostgreSQL 16 equipped with the PostGIS extension for high-performance spatial indexing, geospatial geofencing, and proximity queries.

## 2. Core Entities
1. **Users & Security**: `users`, `roles`, `user_profiles`, `user_preferences`, `notification_preferences`, `security_sessions`, `login_history`, `audit_logs`
2. **Fleet & Telematics**: `buses`, `bus_seats`, `gps_devices`, `gps_locations` (spatial PostGIS points), `bus_documents`
3. **People**: `drivers`, `bus_incharges`, `students`
4. **Transport Network**: `routes`, `route_stops` (geospatial coordinates, sequence, arrival times), `trips`, `trip_students`
5. **Assignments**: `transport_assignments`, `seat_assignments` (unique constraint on bus + seat to prevent double booking)
6. **Operations & Attendance**: `driver_attendance`, `incharge_attendance`, `student_boarding_attendance`
7. **Finance**: `fee_structures`, `student_fees`, `payments`, `payment_receipts`, `refunds`
8. **Maintenance & Fleet Health**: `service_records`, `fuel_records`
9. **Safety & Alerts**: `notifications`, `emergency_alerts`, `travel_instructions`
10. **AI Telemetry**: `ai_conversations`, `ai_predictions`, `ai_insights`

## 3. Migration Strategy
All schema evolution is managed via **Alembic**. Development seed scripts populate realistic test data (20 buses, 20 drivers, 20 Bus Incharges, 20 routes, 300+ students) strictly separated from schema migrations.
