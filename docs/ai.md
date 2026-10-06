# CampusRide AI Engine Architecture

## 1. Permission-Gated AI Core
The CampusRide AI subsystem enforces strict Role-Based Access Control prior to context injection. When a user submits an inquiry, their authenticated role limits the retrieved database facts.
- **Admin**: Full query access across all fleet, staff, student, and financial records.
- **Transport Manager**: Operational queries (routes, fleet status, maintenance, attendance).
- **Bus Incharge**: Limited exclusively to their designated bus, route, and assigned student roster.
- **Driver**: Restricted to assigned bus, route stops, and schedule.
- **Student**: Strict isolation; may only inspect own bus, own ETA, own seat, and general safety protocols.

## 2. Modular Engine Structure
- `assistant.py`: Natural language inquiry handler with permission-scoped context building.
- `eta_prediction.py`: Algorithmic & predictive travel time calculation.
- `delay_prediction.py`: Traffic & sequence delay risk estimation.
- `fuel_analysis.py`: Efficiency benchmarking and anomaly alerts.
- `maintenance_prediction.py`: Kilometre- and time-based component wear forecasting.
- `route_optimization.py`: Density clustering and stop rebalancing recommendations.
