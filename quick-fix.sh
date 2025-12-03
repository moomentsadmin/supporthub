#!/bin/bash
# Quick fix for nginx restart loop issue

echo "🔧 Fixing nginx restart loop..."
echo ""

cd ~/supporthub

# Stop everything
echo "🛑 Stopping all containers..."
docker compose -f compose.internal-db.yml down

# Clean up any SSL config issues
echo "🧹 Cleaning up..."
docker system prune -f

# Pull latest fixes
echo "📥 Pulling latest code..."
git pull origin main

# Start with HTTP only first
echo "🚀 Starting services with HTTP..."
docker compose -f compose.internal-db.yml up -d

echo ""
echo "⏳ Waiting for services..."
sleep 30

echo ""
echo "📊 Service Status:"
docker compose -f compose.internal-db.yml ps

echo ""
echo "✅ Services should now be running!"
echo ""
echo "🌐 Access via HTTP:"
echo "   http://hub.cloudnext.co"
echo "   http://$(hostname -I | awk '{print $1}')"
echo ""
echo "📝 To add SSL/HTTPS, run:"
echo "   sudo bash setup-production.sh"
echo ""
