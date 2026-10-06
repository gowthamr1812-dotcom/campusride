# CampusRide Deployment & Operations Guide

## 1. Containerized Stack (Docker Compose)
The application is pre-configured with a 3-container topology:
1. `db`: `postgis/postgis:16-3.4` (PostGIS-enabled PostgreSQL)
2. `backend`: FastAPI Python 3.12 application running on port 8000
3. `frontend`: React Vite static build served via Nginx reverse proxy on port 5173 / 80

## 2. Quickstart
```bash
# 1. Clone repository & configure secrets
cp .env.example .env

# 2. Launch container stack
docker compose up -d --build

# 3. Apply migrations & seed demo data
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed.seed_data
```
