#!/bin/sh

# Nginx entrypoint with SSL certificate initialization
# Creates temporary self-signed certificates if they don't exist

set -e

echo "🔧 Nginx SSL Pre-Start Check..."

# Install openssl if not present (for alpine)
if ! command -v openssl >/dev/null 2>&1; then
    echo "📦 Installing openssl..."
    apk add --no-cache openssl
fi

# Create SSL directory if it doesn't exist
mkdir -p /etc/nginx/ssl

# Check if certificates already exist
if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
    echo "📝 Creating temporary self-signed certificates for Nginx startup..."
    
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=localhost" 2>/dev/null
    
    echo "✅ Temporary certificates created"
else
    echo "✅ Certificates already exist"
fi

echo "🚀 Starting Nginx..."

# Start Nginx with the original entrypoint
exec /docker-entrypoint.sh nginx -g 'daemon off;'
