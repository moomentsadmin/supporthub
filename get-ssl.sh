#!/bin/bash
# Simple SSL Setup for SupportHub
set -e

echo "🔐 SSL Certificate Setup for SupportHub"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script must be run as root"
    echo "Usage: sudo bash get-ssl.sh yourdomain.com your@email.com"
    exit 1
fi

# Get domain and email from arguments or prompt
DOMAIN=${1:-}
EMAIL=${2:-}

if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain (e.g., hub.cloudnext.co): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email: " EMAIL
fi

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Domain and email are required"
    exit 1
fi

cd ~/supporthub

echo "📋 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Stop nginx if running
echo "🛑 Stopping nginx..."
docker compose -f compose.internal-db.yml stop nginx 2>/dev/null || true

# Make sure app and db are running
echo "✅ Ensuring app is running..."
docker compose -f compose.internal-db.yml up -d app db
sleep 10

# Create a simple HTTP-only nginx config for ACME challenge
echo "📝 Creating temporary nginx config for ACME challenge..."
cat > /tmp/nginx-acme.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 200 'Preparing SSL certificate...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start temporary nginx with ACME config
echo "🚀 Starting nginx for ACME challenge..."
docker run -d --name nginx-temp \
    --network supporthub_default \
    -p 80:80 \
    -v /tmp/nginx-acme.conf:/etc/nginx/nginx.conf:ro \
    -v supporthub_certbot_www:/var/www/certbot \
    -v supporthub_certbot_conf:/etc/letsencrypt \
    nginx:alpine

sleep 5

# Get SSL certificate
echo ""
echo "🔐 Requesting SSL certificate from Let's Encrypt..."
docker compose -f compose.internal-db.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to obtain SSL certificate"
    echo ""
    echo "Common issues:"
    echo "  1. DNS not pointing to this server"
    echo "  2. Firewall blocking port 80"
    echo "  3. Domain not accessible"
    echo ""
    echo "Verify DNS: nslookup $DOMAIN"
    echo "Should return: $(curl -s ifconfig.me)"
    
    # Cleanup
    docker stop nginx-temp 2>/dev/null || true
    docker rm nginx-temp 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ SSL certificate obtained!"

# Stop temporary nginx
echo "🛑 Stopping temporary nginx..."
docker stop nginx-temp
docker rm nginx-temp

# Create SSL nginx config with the domain
echo "📝 Creating SSL nginx configuration..."
sed "s|__DOMAIN__|$DOMAIN|g" configs/nginx-compose.conf > configs/nginx-ssl.conf

# Update compose to use SSL config
echo "🔧 Updating docker-compose configuration..."
sed -i 's|nginx-initial.conf|nginx-ssl.conf|g' compose.internal-db.yml

# Start nginx with SSL
echo "🚀 Starting nginx with SSL..."
docker compose -f compose.internal-db.yml up -d nginx

# Wait for nginx to start
sleep 10

echo ""
echo "✅ SSL Setup Complete!"
echo ""
echo "🌐 Your application is now available at:"
echo "   HTTPS: https://$DOMAIN"
echo "   HTTP:  http://$DOMAIN (redirects to HTTPS)"
echo ""
echo "📊 Check status:"
docker compose -f compose.internal-db.yml ps
echo ""
echo "🔍 Test HTTPS:"
echo "   curl -I https://$DOMAIN"
echo ""
