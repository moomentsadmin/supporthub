#!/bin/bash
# SupportHub Deployment Fix Script
# This script fixes common deployment issues

set -e

echo "🔧 SupportHub Deployment Fix Script"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script should be run as root or with sudo"
    echo "Usage: sudo bash fix-deployment.sh"
    exit 1
fi

# Navigate to supporthub directory
cd ~/supporthub || { echo "❌ Directory ~/supporthub not found"; exit 1; }

echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "🛑 Stopping containers..."
docker compose -f compose.internal-db.yml down

echo ""
echo "🧹 Cleaning up Docker resources..."
docker system prune -f

echo ""
echo "🔨 Building fresh images (this may take a few minutes)..."
docker compose -f compose.internal-db.yml build --no-cache

echo ""
echo "🚀 Starting services..."
docker compose -f compose.internal-db.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

echo ""
echo "📊 Checking service status..."
docker compose -f compose.internal-db.yml ps

echo ""
echo "🔍 Testing nginx..."
if docker exec supporthub-nginx-1 nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    docker exec supporthub-nginx-1 nginx -t
fi

echo ""
echo "🔍 Testing application health..."
sleep 10
if curl -sf http://localhost/api/health > /dev/null; then
    echo "✅ Application health check passed"
    curl http://localhost/api/health
else
    echo "⚠️  Application health check failed (may still be starting)"
fi

echo ""
echo "📋 Container logs (last 20 lines):"
echo "--- App Logs ---"
docker compose -f compose.internal-db.yml logs --tail=20 app

echo ""
echo "--- Nginx Logs ---"
docker compose -f compose.internal-db.yml logs --tail=20 nginx

echo ""
echo "✅ Deployment fix complete!"
echo ""
echo "🌐 Test your application:"
echo "   HTTP: http://$(hostname -I | awk '{print $1}')"
echo "   Admin: http://$(hostname -I | awk '{print $1}')/admin"
echo ""
echo "📝 Monitor logs:"
echo "   docker compose -f compose.internal-db.yml logs -f"
