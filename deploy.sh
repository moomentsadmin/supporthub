#!/bin/bash
# Complete Reset and Fresh Deploy
# This script will completely reset and redeploy the application

set -e

echo "🔄 SupportHub Complete Reset & Deploy"
echo "====================================="
echo ""

cd ~/supporthub

# Stop everything
echo "🛑 Stopping all containers..."
docker compose -f compose.internal-db.yml down -v 2>/dev/null || true
docker system prune -af 2>/dev/null || true

# Pull latest code
echo "📥 Pulling latest code..."
git reset --hard HEAD
git pull origin main

# Rebuild everything from scratch
echo "🔨 Building application..."
docker compose -f compose.internal-db.yml build --no-cache

# Start just the app and database first
echo "🚀 Starting app and database..."
docker compose -f compose.internal-db.yml up -d app db

# Wait for them to be healthy
echo "⏳ Waiting for app to be ready (this takes 40+ seconds)..."
sleep 40

# Check if app is healthy
if docker compose -f compose.internal-db.yml ps app | grep -q "healthy"; then
    echo "✅ App is healthy"
else
    echo "⚠️  App may not be healthy yet, checking logs..."
    docker compose -f compose.internal-db.yml logs app | tail -20
fi

# Start nginx
echo "🚀 Starting nginx..."
docker compose -f compose.internal-db.yml up -d nginx

echo ""
echo "⏳ Waiting for nginx..."
sleep 10

# Check status
echo "📊 Service Status:"
docker compose -f compose.internal-db.yml ps

echo ""
echo "🧪 Testing connectivity..."

# Test app directly
echo "Testing app directly on port 5000..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ App port 5000 is responding"
else
    echo "❌ App port 5000 not responding"
    echo "App logs:"
    docker compose -f compose.internal-db.yml logs app | tail -30
fi

# Test through nginx
echo ""
echo "Testing through nginx on port 80..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Nginx is proxying correctly"
else
    echo "❌ Nginx not proxying correctly"
    echo "Nginx logs:"
    docker compose -f compose.internal-db.yml logs nginx | tail -30
fi

# Test from domain
echo ""
echo "Testing from domain hub.cloudnext.co..."
if curl -f http://hub.cloudnext.co/api/health > /dev/null 2>&1; then
    echo "✅ Domain accessible"
else
    echo "⚠️  Domain not accessible (DNS may not be configured)"
fi

echo ""
echo "✅ Deploy Complete!"
echo ""
echo "🌐 Access your application:"
echo "   HTTP: http://hub.cloudnext.co"
echo "   Admin: http://hub.cloudnext.co/admin"
echo "   API Health: http://hub.cloudnext.co/api/health"
echo ""
echo "📝 Default credentials:"
echo "   Email: admin@supporthub.com"
echo "   Password: admin123"
echo ""
echo "🔐 To add SSL/HTTPS:"
echo "   sudo bash get-ssl.sh hub.cloudnext.co admin@yourdomain.com"
echo ""
