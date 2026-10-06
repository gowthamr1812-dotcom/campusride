# CampusRide Live GPS Telematics Architecture

## 1. Data Pipeline
```
[Physical GPS Tracker / Driver Mobile App / Backend Simulator]
                         │
                         ▼ HTTP / WebSocket
              [FastAPI Ingestion Endpoint]
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[PostGIS Telematics DB]       [WebSocket Broadcast Hub]
                                         │
                                         ▼ WSS
                              [React / Leaflet Map UI]
```

## 2. Ingestion Format
```json
{
  "bus_id": 7,
  "bus_number": "BUS-07",
  "latitude": 12.9316,
  "longitude": 80.1218,
  "speed": 42.0,
  "heading": 90.0,
  "status": "RUNNING",
  "timestamp": "2026-10-06T08:32:10Z"
}
```

## 3. Simulator Architecture
The backend includes a decoupled GPS simulation engine that animates real routes (Tambaram, Avadi, Velachery, etc.) along stop coordinates. This ensures front-end map views receive identical payloads as future physical hardware trackers.
