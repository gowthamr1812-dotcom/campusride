# CampusRide — College Transportation Management Platform

CampusRide is a production-quality, enterprise college transportation management platform featuring real-time vehicle telematics, intelligent routing, student transport passes, staff and student attendance, financial accounting, proactive fleet maintenance, emergency dispatch, and permission-gated AI assistants.

---

## Key Highlights
- **Layered Architecture**: FastAPI (Backend) + React / Vite (Frontend) + PostgreSQL / PostGIS (Database)
- **Role-Based Access Control**: 5 Distinct Roles (`ADMIN`, `TRANSPORT_MANAGER`, `BUS_INCHARGE`, `DRIVER`, `STUDENT`)
- **Real-Time Telematics**: WebSocket-driven GPS streaming with fallback hardware simulator
- **Safety First**: Immediate SOS emergency alerts with real-time location capture and administrative dispatch
- **Predictive AI Insights**: Permission-aware AI assistant, baseline ETA forecasting, and fuel efficiency anomaly detection
- **Multilingual Support**: English, Tamil (தமிழ்), and Hindi (हिन्दी) localization ready
- **Modern UI/UX**: Professional Neumorphism / Glassmorphism enterprise dashboard with accessible responsive layouts

---

## Repository Structure
```
├── backend/             # FastAPI application, Alembic migrations, database models & tests
│   ├── app/
│   │   ├── core/        # App configuration, security, database session setup
│   │   ├── models/      # SQLAlchemy 2.0 ORM domain models
│   │   ├── schemas/     # Pydantic v2 validation contracts
│   │   ├── routers/     # API routes (REST & WebSockets)
│   │   ├── services/    # Modular business logic
│   │   └── ai/          # Permission-aware AI engine
│   └── tests/           # Pytest test suite
├── frontend/            # React 18 + Vite frontend with Tailwind/Neumorphic theme
│   ├── src/
│   │   ├── components/  # Reusable UI widgets (Header, Sidebar, StatCard, etc.)
│   │   ├── pages/       # Role-specific and management dashboard views
│   │   ├── services/    # Axios API client & WebSocket connections
│   │   └── styles/      # Enterprise Neumorphic & responsive styling
├── docs/                # Detailed architectural, API, and setup documentation
├── docker-compose.yml   # Multi-container orchestration (PostGIS, Backend, Frontend)
├── .env.example         # Environment configuration template
└── README.md
```

---

## Quickstart

### Prerequisites
- Python 3.12+
- Node.js 18+ / 20+
- Docker & Docker Compose (optional for local containerized run)

### Running with Docker Compose
```bash
# 1. Prepare environment variables
cp .env.example .env

# 2. Build and start containers
docker compose up -d --build

# 3. Access applications:
# Frontend: http://localhost:5173
# Backend API & Swagger: http://localhost:8000/docs
```

### Running Locally for Development
#### Backend:
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Testing & Quality Assurance
```bash
# Run backend tests
cd backend
pytest -v

# Run frontend production build
cd frontend
npm run build
```
