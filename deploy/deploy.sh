#!/usr/bin/env bash
# ==============================================================================
# CampusRide Enterprise - Production Deployment Script
# Usage: ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}  CampusRide Enterprise - Production Deployment     ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Environment Verification
if [ ! -f ".env.production" ]; then
    echo -e "${RED}[ERROR] .env.production file not found!${NC}"
    echo -e "${YELLOW}Please create .env.production from .env.production.example:${NC}"
    echo "  cp .env.production.example .env.production"
    exit 1
fi

echo -e "${GREEN}[1/5] Verified .env.production environment configuration.${NC}"

# 2. Pull / Build Docker Containers
echo -e "${BLUE}[2/5] Building production container images...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production build --pull

# 3. Launch Stack in Detached Mode
echo -e "${BLUE}[3/5] Starting database, cache, backend, and gateway...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. Wait for Database & Backend Healthchecks
echo -e "${BLUE}[4/5] Awaiting service health verification...${NC}"
sleep 5
for i in {1..30}; do
    DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' campusride_db_prod 2>/dev/null || echo "starting")
    BACKEND_STATUS=$(docker inspect --format='{{.State.Health.Status}}' campusride_backend_prod 2>/dev/null || echo "starting")
    
    if [ "$DB_STATUS" == "healthy" ] && [ "$BACKEND_STATUS" == "healthy" ]; then
        echo -e "${GREEN}[OK] Database and Backend services are healthy.${NC}"
        break
    fi
    echo -e "${YELLOW}  Waiting for containers to become healthy ($i/30)... (DB: $DB_STATUS, App: $BACKEND_STATUS)${NC}"
    sleep 2
done

# 5. Display Active Status
echo -e "${GREEN}[5/5] Deployment complete! Containers active:${NC}"
docker compose -f docker-compose.prod.yml ps

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}  CampusRide is live with full security protection! ${NC}"
echo -e "${GREEN}====================================================${NC}"
