# CampusRide Quality Assurance & Testing Standards

## 1. Test Strategy
Testing is executed incrementally across both tiers:
- **Backend Tests**: Run with `pytest`. Covers unit test suites for security/JWT, database models, service layers, API routers, and permissions.
- **Frontend Tests & Build**: Run with `npm test` and `npm run build` via Vite to guarantee zero syntax or bundling errors.

## 2. Execution Commands
```bash
# Backend tests
cd backend
pytest -v

# Frontend build check
cd frontend
npm run build
```
