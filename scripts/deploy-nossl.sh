#!/bin/bash

# No-SSL Deployment script for SupportHub
# Use this when deploying behind a reverse proxy (Nginx Proxy Manager, Traefik, Cloudflare Tunnel, AWS ALB, etc.)
# The app runs on port 5000 — point your proxy to http://<server-ip>:5000

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== SupportHub No-SSL Deployment ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Please create a .env file based on .env.example"
    exit 1
fi

# Validate required variables
SESSION_SECRET=$(grep -E "^SESSION_SECRET=" .env | cut -d '=' -f2- | tr -d '\r')
if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "change-this-to-a-secure-random-string-in-production" ]; then
    echo -e "${RED}Error: SESSION_SECRET is not set or is still the default value.${NC}"
    echo -e "Generate one with: openssl rand -base64 48"
    exit 1
fi

DATABASE_URL=$(grep -E "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '\r')
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL is not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}Building and starting containers...${NC}"
docker compose -f compose.nossl.yml up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker Compose failed to start. Check logs:${NC}"
    echo -e "  docker compose -f compose.nossl.yml logs"
    exit 1
fi

# Wait for app container to be healthy
echo -e "${GREEN}Waiting for application to be ready...${NC}"
RETRIES=15
until docker compose -f compose.nossl.yml exec -T app curl -sf http://localhost:5000/api/health > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    sleep 4
    RETRIES=$((RETRIES - 1))
done

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
docker compose -f compose.nossl.yml exec -T app npm run db:push && \
    echo -e "${GREEN}✅ Database migrations applied.${NC}" || \
    echo -e "${YELLOW}⚠️  Migration step failed — run manually: docker compose -f compose.nossl.yml exec app npm run db:push${NC}"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Application is running on port 5000.${NC}"
echo -e "${YELLOW}Point your reverse proxy to: http://$(hostname -I | awk '{print $1}'):5000${NC}"
echo -e "\n${YELLOW}Default credentials (change immediately):${NC}"
echo -e "  Admin:  admin@supporthub.com / admin123  →  https://yourdomain.com/admin"
echo -e "  Agent:  agent@example.com / password123  →  https://yourdomain.com/"
