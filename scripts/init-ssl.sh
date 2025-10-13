#!/bin/bash

# Automated Let's Encrypt SSL Setup for SupportHub
# Reads DOMAIN and EMAIL from environment variables

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== SupportHub Automated SSL Setup ===${NC}\n"

# Check if environment variables are set
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: DOMAIN environment variable not set${NC}"
    echo -e "Please set DOMAIN in your .env file"
    exit 1
fi

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: EMAIL environment variable not set${NC}"
    echo -e "Please set EMAIL in your .env file"
    exit 1
fi

echo -e "${GREEN}Domain: ${DOMAIN}${NC}"
echo -e "${GREEN}Email: ${EMAIL}${NC}\n"

# Create SSL directory if it doesn't exist
mkdir -p /etc/nginx/ssl
mkdir -p /var/www/certbot

# Check if we're in testing mode (localhost or IP address)
if [[ "$DOMAIN" == "localhost" ]] || [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}Testing mode detected. Creating self-signed certificate...${NC}\n"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" 2>/dev/null
    
    echo -e "${GREEN}✅ Self-signed certificate created${NC}"
    echo -e "${YELLOW}⚠️  This is for testing only. Not suitable for production.${NC}\n"
    exit 0
fi

# Production: Let's Encrypt setup
echo -e "${GREEN}Production mode: Obtaining Let's Encrypt certificate...${NC}\n"

# Create temporary self-signed certificate for initial Nginx start
if [ ! -f "/etc/nginx/ssl/cert.pem" ]; then
    echo -e "${YELLOW}Creating temporary certificate for Nginx startup...${NC}"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=$DOMAIN" 2>/dev/null
fi

# Wait for Nginx to be ready
echo -e "${GREEN}Waiting for Nginx to start...${NC}"
sleep 5

# Request Let's Encrypt certificate
echo -e "${GREEN}Requesting Let's Encrypt certificate for: $DOMAIN${NC}\n"

certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    --cert-name "$DOMAIN" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" || {
        echo -e "${RED}Failed to obtain certificate. Using self-signed certificate.${NC}"
        exit 0
    }

# Update Nginx configuration to use Let's Encrypt certificates
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✅ Let's Encrypt certificate obtained successfully!${NC}"
    echo -e "${GREEN}Updating Nginx configuration...${NC}\n"
    
    # Update the Nginx config to use Let's Encrypt certificates
    sed -i "s|ssl_certificate /etc/nginx/ssl/cert.pem;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" /etc/nginx/conf.d/supporthub.conf
    sed -i "s|ssl_certificate_key /etc/nginx/ssl/key.pem;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" /etc/nginx/conf.d/supporthub.conf
    
    echo -e "${GREEN}✅ SSL setup complete!${NC}"
    echo -e "${GREEN}✅ Your site is accessible at: https://${DOMAIN}${NC}\n"
else
    echo -e "${YELLOW}Certificate not found. Using self-signed certificate.${NC}\n"
fi
