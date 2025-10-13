#!/bin/bash

# SSL Setup Script for SupportHub Production Deployment
# This script generates self-signed certificates or obtains Let's Encrypt certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SupportHub SSL Setup ===${NC}\n"

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}No domain provided. Creating self-signed certificates for testing...${NC}\n"
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    echo -e "${GREEN}✅ Self-signed certificates created in nginx/ssl/${NC}"
    echo -e "${YELLOW}⚠️  These are for testing only. Use Let's Encrypt for production.${NC}\n"
    
else
    DOMAIN=$1
    EMAIL=${2:-admin@$DOMAIN}
    
    echo -e "${GREEN}Setting up Let's Encrypt SSL for: ${DOMAIN}${NC}"
    echo -e "Email: ${EMAIL}\n"
    
    # Create initial dummy certificate
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/CN=localhost" 2>/dev/null
    
    echo -e "${GREEN}Starting Nginx for certificate validation...${NC}"
    docker compose -f compose.production.yml up -d nginx
    
    echo -e "${GREEN}Obtaining Let's Encrypt certificate...${NC}"
    docker compose -f compose.production.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    # Update Nginx configuration with real certificates
    sed -i "s|ssl_certificate /etc/nginx/ssl/cert.pem;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" nginx/conf.d/supporthub.conf
    sed -i "s|ssl_certificate_key /etc/nginx/ssl/key.pem;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" nginx/conf.d/supporthub.conf
    
    echo -e "${GREEN}Reloading Nginx with Let's Encrypt certificates...${NC}"
    docker compose -f compose.production.yml restart nginx
    
    echo -e "${GREEN}✅ SSL certificates obtained and configured!${NC}"
    echo -e "${GREEN}✅ Your site is now accessible at: https://${DOMAIN}${NC}\n"
fi

echo -e "${GREEN}SSL setup complete!${NC}"
