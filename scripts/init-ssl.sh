#!/bin/sh

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

# Create directories
mkdir -p /etc/nginx/ssl
mkdir -p /var/www/certbot

# Check if we're in testing mode (localhost or IP address)
if [[ "$DOMAIN" == "localhost" ]] || [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}Testing mode detected (localhost/IP). Using self-signed certificate...${NC}\n"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" 2>/dev/null
    
    echo -e "${GREEN}✅ Self-signed certificate created${NC}"
    echo -e "${YELLOW}⚠️  Testing mode - certificate will show browser warning${NC}\n"
    exit 0
fi

# Production: Let's Encrypt setup
echo -e "${GREEN}Production mode: Obtaining Let's Encrypt certificate for: $DOMAIN${NC}\n"

# Wait for Nginx to be ready and serving on port 80
echo -e "${GREEN}Waiting for Nginx to be ready...${NC}"
for i in $(seq 1 30); do
    if wget --spider --quiet http://nginx/.well-known/acme-challenge/ 2>/dev/null; then
        echo -e "${GREEN}✅ Nginx is ready${NC}\n"
        break
    fi
    echo -e "Waiting... ($i/30)"
    sleep 2
done

# Request Let's Encrypt certificate
echo -e "${GREEN}Requesting Let's Encrypt certificate...${NC}\n"

# Function to request certificate
request_cert() {
    local domains="$1"
    echo -e "${GREEN}Attempting to obtain certificate for: $domains${NC}"
    
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        --cert-name "$DOMAIN" \
        $domains
}

# Request certificate for the specified domain only
if request_cert "-d $DOMAIN"; then
    echo -e "${GREEN}✅ Let's Encrypt certificate obtained successfully for $DOMAIN!${NC}\n"
else
    echo -e "${RED}❌ Failed to obtain Let's Encrypt certificate${NC}"
    echo -e "${YELLOW}Using self-signed certificate as fallback${NC}\n"
    
    # Create self-signed as fallback
    openssl req -x509 -nodes -days 90 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=$DOMAIN" 2>/dev/null
    
    echo -e "${YELLOW}⚠️  Self-signed certificate created${NC}"
    echo -e "${YELLOW}⚠️  Common reasons for Let's Encrypt failure:${NC}"
    echo -e "${YELLOW}    - Domain not pointing to this server${NC}"
    echo -e "${YELLOW}    - Ports 80/443 not accessible from internet${NC}"
    echo -e "${YELLOW}    - Rate limit reached (5 certs/week per domain)${NC}\n"
    
    exit 0
fi

# Copy certificates to nginx ssl directory
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem

echo -e "${GREEN}✅ Certificates installed${NC}"
echo -e "${GREEN}✅ SSL setup complete!${NC}"
echo -e "${GREEN}🔒 Your site is now accessible at: https://${DOMAIN}${NC}\n"

exit 0


