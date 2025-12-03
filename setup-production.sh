#!/bin/bash
# SupportHub Production HTTPS Setup Script
# This script sets up SSL certificates and deploys with HTTPS

set -e

echo "🔐 SupportHub Production HTTPS Setup"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run as root or with sudo"
    echo "Usage: sudo bash setup-production.sh"
    exit 1
fi

# Navigate to supporthub directory
cd ~/supporthub || { echo "❌ Directory ~/supporthub not found"; exit 1; }

# Prompt for domain
read -p "Enter your domain name (e.g., hub.cloudnext.co): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Prompt for email
read -p "Enter your email for Let's Encrypt notifications: " EMAIL
if [ -z "$EMAIL" ]; then
    echo "❌ Email is required"
    exit 1
fi

# Prompt for database type
echo ""
echo "Select database type:"
echo "1) Internal PostgreSQL (managed by Docker)"
echo "2) External PostgreSQL (Neon, AWS RDS, Azure, etc.)"
read -p "Enter choice [1-2]: " DB_CHOICE

if [ "$DB_CHOICE" = "1" ]; then
    COMPOSE_FILE="compose.internal-db.yml"
    echo "✅ Using Internal Database"
elif [ "$DB_CHOICE" = "2" ]; then
    COMPOSE_FILE="compose.external-db.yml"
    echo "✅ Using External Database"
    read -p "Enter DATABASE_URL (postgresql://user:pass@host:port/dbname): " DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL is required for external database"
        exit 1
    fi
else
    echo "❌ Invalid choice"
    exit 1
fi

# Generate SESSION_SECRET if not exists
if [ ! -f .env ] || ! grep -q "SESSION_SECRET" .env; then
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "SESSION_SECRET=$SESSION_SECRET" >> .env
    echo "✅ Generated SESSION_SECRET"
fi

# Prompt for database password if using internal DB
if [ "$DB_CHOICE" = "1" ]; then
    if ! grep -q "DB_PASSWORD" .env 2>/dev/null; then
        DB_PASSWORD=$(openssl rand -base64 24)
        echo "DB_PASSWORD=$DB_PASSWORD" >> .env
        echo "✅ Generated DB_PASSWORD"
    fi
fi

# Add database URL to .env if external
if [ "$DB_CHOICE" = "2" ]; then
    if ! grep -q "DATABASE_URL" .env 2>/dev/null; then
        echo "DATABASE_URL=$DATABASE_URL" >> .env
        echo "✅ Added DATABASE_URL to .env"
    fi
fi

# Add domain to .env
if ! grep -q "DOMAIN=" .env 2>/dev/null; then
    echo "DOMAIN=$DOMAIN" >> .env
else
    sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|g" .env
fi

echo ""
echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "🔧 Updating nginx configuration with domain..."
# Replace domain placeholder in SSL nginx config
sed "s|__DOMAIN__|$DOMAIN|g" configs/nginx-compose.conf > configs/nginx-ssl.conf

echo ""
echo "🛑 Stopping any existing containers..."
docker compose -f $COMPOSE_FILE down 2>/dev/null || true

echo ""
echo "🔨 Building application..."
docker compose -f $COMPOSE_FILE build --no-cache app

echo ""
echo "🚀 Starting application (HTTP only for now)..."
docker compose -f $COMPOSE_FILE up -d app
if [ "$DB_CHOICE" = "1" ]; then
    docker compose -f $COMPOSE_FILE up -d db
fi

echo ""
echo "⏳ Waiting for application to be ready..."
sleep 20

# Check if app is healthy
if ! docker compose -f $COMPOSE_FILE ps app | grep -q "healthy\|Up"; then
    echo "⚠️  Application may not be fully ready yet"
    docker compose -f $COMPOSE_FILE logs --tail=30 app
fi

echo ""
echo "📜 Obtaining SSL certificate from Let's Encrypt..."
echo "This will:"
echo "  1. Start nginx temporarily on port 80"
echo "  2. Request certificate from Let's Encrypt"
echo "  3. Configure nginx with SSL"
echo ""

# Start nginx without SSL first (for ACME challenge)
docker compose -f $COMPOSE_FILE up -d nginx

echo "⏳ Waiting for nginx to start..."
sleep 10

# Request SSL certificate
echo "🔐 Requesting SSL certificate for $DOMAIN..."
docker compose -f $COMPOSE_FILE run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    
    echo ""
    echo "🔄 Updating nginx to use SSL configuration..."
    # Stop nginx
    docker compose -f $COMPOSE_FILE stop nginx
    
    # Update compose file to use SSL config
    sed -i 's|nginx-initial.conf|nginx-ssl.conf|g' $COMPOSE_FILE
    
    # Start nginx with SSL
    docker compose -f $COMPOSE_FILE up -d nginx
    
else
    echo "❌ Failed to obtain SSL certificate"
    echo ""
    echo "Common issues:"
    echo "  1. Domain DNS not pointing to this server"
    echo "  2. Firewall blocking port 80/443"
    echo "  3. Another service using port 80"
    echo ""
    echo "Please fix the issue and run this script again."
    exit 1
fi

echo ""
echo "⏳ Waiting for HTTPS to be ready..."
sleep 10

echo ""
echo "📊 Checking service status..."
docker compose -f $COMPOSE_FILE ps

echo ""
echo "🔍 Testing HTTPS..."
if curl -sf https://$DOMAIN/api/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working!"
    curl https://$DOMAIN/api/health
else
    echo "⚠️  HTTPS test failed - checking logs..."
    docker compose -f $COMPOSE_FILE logs --tail=20 nginx
fi

echo ""
echo "✅ Production setup complete!"
echo ""
echo "🌐 Your application is available at:"
echo "   HTTPS: https://$DOMAIN"
echo "   Admin: https://$DOMAIN/admin"
echo "   Agent: https://$DOMAIN/agent"
echo ""
echo "🔑 Default credentials:"
echo "   Admin: admin@supporthub.com / admin123"
echo "   ⚠️  Change these immediately after first login!"
echo ""
echo "📝 Monitor logs:"
echo "   docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🔄 Certificate auto-renewal:"
echo "   Certbot will automatically renew certificates every 12 hours"
echo ""
echo "📋 Next steps:"
echo "   1. Visit https://$DOMAIN/admin"
echo "   2. Login and change admin password"
echo "   3. Configure your channels and settings"
echo "   4. Set up email/SMS providers"
echo ""
