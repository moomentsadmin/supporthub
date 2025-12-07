#!/bin/bash
# SupportHub Production Deployment Script
# Version: 1.0
# This script handles complete deployment with HTTP and optional HTTPS

set -e

DOMAIN=""
EMAIL=""
USE_SSL=false
NGINX_CONF=./configs/nginx.conf

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════╗"
echo "║   SupportHub Production Deployment v1.0    ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗${NC} This script must be run as root"
    echo "  Usage: sudo bash deploy-production.sh"
    exit 1
fi

cd ~/supporthub || { echo -e "${RED}✗${NC} Directory ~/supporthub not found"; exit 1; }

# Ask deployment questions
echo "Deployment Configuration:"
echo "------------------------"
read -p "Enter your domain (e.g., hub.cloudnext.co): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}✗${NC} Domain is required"
    exit 1
fi

read -p "Do you want to enable HTTPS with Let's Encrypt? (y/n): " ENABLE_SSL
if [[ "$ENABLE_SSL" =~ ^[Yy]$ ]]; then
    USE_SSL=true
    read -p "Enter your email for SSL notifications: " EMAIL
    if [ -z "$EMAIL" ]; then
        echo -e "${RED}✗${NC} Email is required for SSL"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✓${NC} Configuration:"
echo "  Domain: $DOMAIN"
echo "  HTTPS: $USE_SSL"
[ "$USE_SSL" = true ] && echo "  Email: $EMAIL"
echo ""

# Step 1: Cleanup
echo "Step 1/6: Cleanup"
echo "----------------"
docker compose -f compose.internal-db.yml down -v 2>/dev/null || true
docker stop $(docker ps -q --filter "publish=80") 2>/dev/null || true
docker rm $(docker ps -aq --filter "publish=80") 2>/dev/null || true
docker system prune -f > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Cleanup complete"
echo ""

# Step 2: Update code
echo "Step 2/6: Update Code"
echo "--------------------"
git fetch origin
git reset --hard origin/main
echo -e "${GREEN}✓${NC} Code updated"
echo ""

# Step 3: Environment setup
echo "Step 3/6: Environment Setup"
echo "---------------------------"
if [ ! -f .env ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 24)
    
    cat > .env << EOF
# Generated $(date)
NODE_ENV=production
PORT=5000
SESSION_SECRET=$SESSION_SECRET
DB_PASSWORD=$DB_PASSWORD
DOMAIN=$DOMAIN
EOF
    echo -e "${GREEN}✓${NC} Environment file created"
else
    echo -e "${YELLOW}!${NC} Using existing .env file"
    # Ensure DOMAIN is set
    if ! grep -q "^DOMAIN=" .env; then
        echo "DOMAIN=$DOMAIN" >> .env
    else
        sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|g" .env
    fi
fi
echo ""

# Step 4: Build application
echo "Step 4/6: Build Application"
echo "---------------------------"
echo "This may take 2-3 minutes..."
docker compose -f compose.internal-db.yml build --no-cache app > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Application built"
echo ""

# Step 5: Start services
echo "Step 5/6: Start Services"
echo "------------------------"
# Ensure nginx.conf starts in HTTP-only mode before first cert
cp configs/nginx-initial.conf "$NGINX_CONF"

docker compose -f compose.internal-db.yml up -d app db
echo "Waiting for database to be ready..."
sleep 15

# Wait for app to be healthy
echo "Waiting for application to be ready..."
for i in {1..20}; do
    if docker compose -f compose.internal-db.yml ps app | grep -q "healthy"; then
        break
    fi
    sleep 3
done

if ! docker compose -f compose.internal-db.yml ps app | grep -q "healthy"; then
    echo -e "${RED}✗${NC} Application failed to start healthy"
    echo "Logs:"
    docker compose -f compose.internal-db.yml logs app | tail -30
    exit 1
fi

# Start nginx
docker compose -f compose.internal-db.yml up -d nginx
sleep 5
echo -e "${GREEN}✓${NC} Services started"
echo ""

# Step 6: SSL Setup (if requested)
if [ "$USE_SSL" = true ]; then
    echo "Step 6/6: SSL Certificate Setup"
    echo "-------------------------------"
    
    # Stop nginx to free port 80
    docker compose -f compose.internal-db.yml stop nginx

    # Request certificate using standalone mode on port 80
    echo "Requesting SSL certificate (standalone on :80)..."
    docker run --rm --name supporthub-certbot \
        -p 80:80 \
        -v supporthub_certbot_conf:/etc/letsencrypt \
        -v supporthub_certbot_www:/var/www/certbot \
        certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} SSL certificate obtained"
        # Switch nginx to HTTPS config
        sed "s|__DOMAIN__|$DOMAIN|g" configs/nginx-compose.conf > "$NGINX_CONF"
        docker compose -f compose.internal-db.yml up -d nginx
        sleep 5
        echo -e "${GREEN}✓${NC} HTTPS enabled"
    else
        echo -e "${RED}✗${NC} SSL certificate request failed"
        echo "Continuing with HTTP only"
        # Restore HTTP config and restart nginx
        cp configs/nginx-initial.conf "$NGINX_CONF"
        docker compose -f compose.internal-db.yml up -d nginx
    fi
else
    echo "Step 6/6: Skipping SSL Setup"
    echo "-----------------------------"
    echo -e "${YELLOW}!${NC} HTTPS not enabled (HTTP only)"
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║           Deployment Complete!             ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Test and show results
echo "Status Check:"
echo "-------------"

# Check services
if docker compose -f compose.internal-db.yml ps | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} All services healthy"
else
    echo -e "${YELLOW}!${NC} Some services may need more time"
fi

# Test HTTP
if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} HTTP working"
else
    echo -e "${RED}✗${NC} HTTP not responding"
fi

# Test HTTPS if enabled
if [ "$USE_SSL" = true ]; then
    sleep 10
    if curl -sf https://$DOMAIN/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} HTTPS working"
    else
        echo -e "${YELLOW}!${NC} HTTPS not ready yet (may need DNS propagation)"
    fi
fi

echo ""
echo "Access Information:"
echo "-------------------"
if [ "$USE_SSL" = true ]; then
    echo "  🌐 Application: https://$DOMAIN"
    echo "  🔐 Admin Panel: https://$DOMAIN/admin"
    echo "  👥 Agent Portal: https://$DOMAIN/agent"
else
    echo "  🌐 Application: http://$DOMAIN"
    echo "  🔐 Admin Panel: http://$DOMAIN/admin"
    echo "  👥 Agent Portal: http://$DOMAIN/agent"
fi

echo ""
echo "Default Credentials:"
echo "--------------------"
echo "  📧 Email: admin@supporthub.com"
echo "  🔑 Password: admin123"
echo ""
echo -e "${RED}⚠${NC}  IMPORTANT: Change the admin password immediately!"
echo ""
echo "Useful Commands:"
echo "----------------"
echo "  View logs:    docker compose -f compose.internal-db.yml logs -f"
echo "  Stop:         docker compose -f compose.internal-db.yml down"
echo "  Restart:      docker compose -f compose.internal-db.yml restart"
echo "  Status:       docker compose -f compose.internal-db.yml ps"
echo ""
