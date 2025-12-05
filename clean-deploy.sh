#!/bin/bash
# Complete cleanup and fresh HTTP deployment
set -e

echo "🧹 Complete Cleanup & Fresh Deploy"
echo "=================================="
echo ""

cd ~/supporthub

echo "🛑 Stopping all SupportHub containers..."
docker compose -f compose.internal-db.yml down -v 2>/dev/null || true

echo "🧹 Cleaning up temporary containers..."
docker stop nginx-temp 2>/dev/null || true
docker rm nginx-temp 2>/dev/null || true

echo "🧹 Finding and stopping any containers on port 80..."
PORT_80_CONTAINERS=$(docker ps -q --filter "publish=80")
if [ ! -z "$PORT_80_CONTAINERS" ]; then
    echo "Found containers using port 80, stopping them..."
    docker stop $PORT_80_CONTAINERS
    docker rm $PORT_80_CONTAINERS
fi

echo "🧹 Cleaning Docker system..."
docker system prune -f

echo "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "🔨 Rebuilding application..."
docker compose -f compose.internal-db.yml build --no-cache app

echo "🚀 Starting services..."
docker compose -f compose.internal-db.yml up -d

echo ""
echo "⏳ Waiting for services (60 seconds)..."
sleep 60

echo ""
echo "📊 Service Status:"
docker compose -f compose.internal-db.yml ps

echo ""
echo "🧪 Testing Application..."

# Test app directly
echo "1. Testing app on port 5000..."
if curl -sf http://localhost:5000/api/health > /dev/null; then
    echo "   ✅ App is responding"
else
    echo "   ❌ App not responding"
    docker compose -f compose.internal-db.yml logs app | tail -20
fi

# Test nginx proxy
echo "2. Testing nginx on port 80..."
if curl -sf http://localhost/api/health > /dev/null; then
    echo "   ✅ Nginx is working"
else
    echo "   ❌ Nginx not working"
    docker compose -f compose.internal-db.yml logs nginx | tail -20
fi

# Test static files
echo "3. Testing static files..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Static files serving (HTTP $HTTP_CODE)"
else
    echo "   ❌ Static files error (HTTP $HTTP_CODE)"
fi

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Access your application:"
echo "   HTTP: http://hub.cloudnext.co"
echo "   Admin: http://hub.cloudnext.co/admin"
echo ""
echo "📝 Check what's in the container:"
echo "   docker compose -f compose.internal-db.yml exec app ls -la /app/dist/"
echo ""
