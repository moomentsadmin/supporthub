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

echo "🔄 Applying environment variables to Nginx config..."
# We need to install gettext for envsubst if it's not there, but nginx:alpine usually has it or we can sed.
# simpler to use sed given restricted environment? No, envsubst is cleaner.
# Check if envsubst is available
if ! command -v envsubst >/dev/null 2>&1; then
    apk add --no-cache gettext
fi

# Replace vars in conf.d
# First clean up default configs to avoid conflicts
rm -rf /etc/nginx/conf.d/*

# Copy templates to conf.d (writable location)
# We assume templates are mounted at /etc/nginx/templates/conf.d
if [ -d "/etc/nginx/templates/conf.d" ]; then
    cp /etc/nginx/templates/conf.d/*.conf /etc/nginx/conf.d/
else
    # Fallback if mounted directly (though this causes RO issues, addressed via compose change)
    echo "Warning: Templates not found at expected location"
fi

for file in /etc/nginx/conf.d/*.conf; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        envsubst '${DOMAIN}' < "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
done

echo "🚀 Starting Nginx..."

# Start Nginx with the original entrypoint
exec /docker-entrypoint.sh nginx -g 'daemon off;'
