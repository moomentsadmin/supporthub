#!/bin/bash

# Deployment script for SupportHub

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== SupportHub Deployment ===${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Please create a .env file based on .env.example"
    exit 1
fi

# Load environment variables just to check DOMAIN
export $(grep -v '^#' .env | xargs)

# Check DOMAIN variable
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: DOMAIN is not set in .env${NC}"
    exit 1
elif [ "$DOMAIN" == "localhost" ]; then
    echo -e "${YELLOW}Warning: DOMAIN is set to 'localhost'.${NC}"
    echo -e "${YELLOW}SSL certificate will be self-signed (testing mode).${NC}"
    echo -e "${YELLOW}For production SSL, set DOMAIN to your actual domain name.${NC}\n"
    read -p "Continue with localhost deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check EMAIL variable (needed for Let's Encrypt)
if [ -z "$EMAIL" ] || [ "$EMAIL" == "admin@localhost" ]; then
    echo -e "${YELLOW}Warning: EMAIL is not set or is default 'admin@localhost'.${NC}"
    echo -e "${YELLOW}Let's Encrypt requires a valid email for expiration notices.${NC}"
    if [ "$DOMAIN" != "localhost" ]; then
        echo -e "${RED}Error: You must set a valid EMAIL in .env for production SSL.${NC}"
        exit 1
    fi
fi


echo -e "${GREEN}Deploying with Docker Compose...${NC}"

# Rebuild app and nginx, and force verify SSL
docker compose -f compose.production.yml up -d --build --force-recreate

echo -e "${GREEN}Deployment started. Waiting for SSL initialization...${NC}"

# Monitor ssl_init container
docker logs -f supporthub_ssl_init &
LOG_PID=$!

# Wait for container to exit
EXIT_CODE=$(docker wait supporthub_ssl_init)
kill $LOG_PID 2>/dev/null

if [ "$EXIT_CODE" == "0" ]; then
    echo -e "\n${GREEN}SSL Initialization successful.${NC}"
    echo -e "${GREEN}Reloading Nginx to apply certificates...${NC}"
    docker compose -f compose.production.yml exec nginx nginx -s reload
    echo -e "${GREEN}✅ Deployment Complete!${NC}"
    echo -e "${GREEN}Your site should be live at https://$DOMAIN${NC}"
else
    echo -e "\n${RED}SSL Initialization failed (Exit code: $EXIT_CODE).${NC}"
    echo -e "Check logs with: docker logs supporthub_ssl_init"
fi

