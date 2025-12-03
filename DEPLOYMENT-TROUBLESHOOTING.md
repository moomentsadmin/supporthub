# SupportHub Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Nginx Container Unhealthy

**Symptoms:**
- `docker ps` shows nginx as "unhealthy"
- Website not accessible

**Causes:**
1. Nginx configuration syntax error
2. Backend not responding
3. Healthcheck failing

**Solutions:**

```bash
# Check nginx configuration
docker exec supporthub-nginx-1 nginx -t

# Check nginx logs
docker compose -f compose.internal-db.yml logs nginx

# Restart nginx
docker compose -f compose.internal-db.yml restart nginx

# If configuration is broken, reload from git
git pull origin main
docker compose -f compose.internal-db.yml down
docker compose -f compose.internal-db.yml up -d
```

### Issue 2: HTTP Shows "Not Found" or Blank Page

**Symptoms:**
- Browser shows 404 or blank page
- No React application loading

**Causes:**
1. Static files not built correctly
2. Wrong path in static.ts
3. Nginx not proxying correctly

**Solutions:**

```bash
# Rebuild with fresh image
docker compose -f compose.internal-db.yml down
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d

# Check app logs for errors
docker compose -f compose.internal-db.yml logs app

# Verify build contains dist folder
docker exec supporthub-app-1 ls -la /app/dist

# Test health endpoint directly
curl http://localhost:5000/api/health
```

### Issue 3: HTTPS Not Working

**Note:** The `compose.internal-db.yml` deployment is **HTTP-only** by design. HTTPS requires additional setup.

**For HTTPS, you need:**

1. **Option A: Use production compose with Let's Encrypt**
```bash
# Set your domain in .env
echo "DOMAIN=your-domain.com" >> .env
echo "EMAIL=admin@your-domain.com" >> .env

# Use production compose
docker compose -f compose.production.yml down
docker compose -f compose.production.yml up -d
```

2. **Option B: Manual SSL setup**
```bash
# Get SSL certificate with certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy to nginx
docker cp /etc/letsencrypt/live/your-domain.com/fullchain.pem supporthub-nginx-1:/etc/nginx/ssl/
docker cp /etc/letsencrypt/live/your-domain.com/privkey.pem supporthub-nginx-1:/etc/nginx/ssl/

# Use SSL nginx config
docker compose -f compose.production.yml restart nginx
```

### Issue 4: Admin Login Returns "Internal Server Error"

**Causes:**
1. Session configuration issue
2. Database not connected
3. Cookie settings incompatible with HTTP

**Solutions:**

```bash
# Check if database is connected
docker compose -f compose.internal-db.yml logs db | grep "ready"

# Check session configuration
docker compose -f compose.internal-db.yml logs app | grep -i session

# Verify environment variables
docker compose -f compose.internal-db.yml config

# Check if SESSION_SECRET is set
docker exec supporthub-app-1 printenv | grep SESSION_SECRET

# Test login endpoint
curl -v http://localhost/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@supporthub.com","password":"admin123"}'
```

### Issue 5: Database Connection Failed

**Symptoms:**
- App logs show database connection errors
- Tables not created

**Solutions:**

```bash
# Check database status
docker compose -f compose.internal-db.yml ps db

# Check database logs
docker compose -f compose.internal-db.yml logs db

# Connect to database manually
docker exec -it supporthub-db-1 psql -U supporthub -d supporthub

# Check if tables exist
docker exec -it supporthub-db-1 psql -U supporthub -d supporthub -c "\dt"

# Recreate database
docker compose -f compose.internal-db.yml down -v  # WARNING: Deletes data!
docker compose -f compose.internal-db.yml up -d
```

## Quick Fix Script

Use the automated fix script:

```bash
sudo bash fix-deployment.sh
```

This script will:
1. Pull latest code
2. Stop containers
3. Clean Docker resources
4. Rebuild images
5. Start services
6. Run health checks
7. Show logs

## Diagnostic Commands

```bash
# Check all container status
docker compose -f compose.internal-db.yml ps

# View all logs
docker compose -f compose.internal-db.yml logs

# Follow logs in real-time
docker compose -f compose.internal-db.yml logs -f

# Check specific service
docker compose -f compose.internal-db.yml logs app
docker compose -f compose.internal-db.yml logs nginx
docker compose -f compose.internal-db.yml logs db

# Check resource usage
docker stats

# Inspect container
docker inspect supporthub-app-1
docker inspect supporthub-nginx-1
docker inspect supporthub-db-1

# Execute commands inside container
docker exec -it supporthub-app-1 /bin/sh
docker exec -it supporthub-nginx-1 /bin/sh
docker exec -it supporthub-db-1 /bin/sh

# Test endpoints
curl -v http://localhost/api/health
curl -v http://localhost/
curl -v http://localhost/admin

# Check nginx config
docker exec supporthub-nginx-1 nginx -t
docker exec supporthub-nginx-1 cat /etc/nginx/nginx.conf
```

## Port Conflicts

If ports 80, 443, or 5000 are already in use:

```bash
# Check what's using the ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5000

# Stop conflicting service
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if host nginx is running

# Or change ports in compose file
# Edit compose.internal-db.yml and change:
#   - "8080:80"    # Use port 8080 instead of 80
#   - "8443:443"   # Use port 8443 instead of 443
```

## Complete Reset (Nuclear Option)

If nothing works, completely reset:

```bash
# WARNING: This deletes all data!
cd ~/supporthub
docker compose -f compose.internal-db.yml down -v
docker system prune -af --volumes
git pull origin main
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d
```

## Getting Help

If issues persist:

1. **Check logs first:**
   ```bash
   docker compose -f compose.internal-db.yml logs --tail=100
   ```

2. **Gather system info:**
   ```bash
   docker version
   docker compose version
   cat /etc/os-release
   ```

3. **Create an issue with:**
   - Operating system and version
   - Docker and Docker Compose versions
   - Complete error logs
   - Output of `docker compose ps`
   - Steps to reproduce

## Monitoring

Set up continuous monitoring:

```bash
# Install monitoring script
cat > /usr/local/bin/supporthub-monitor.sh << 'EOF'
#!/bin/bash
while true; do
  clear
  echo "=== SupportHub Status ==="
  docker compose -f ~/supporthub/compose.internal-db.yml ps
  echo ""
  echo "=== Health Check ==="
  curl -s http://localhost/api/health | jq .
  sleep 5
done
EOF

chmod +x /usr/local/bin/supporthub-monitor.sh

# Run monitor
supporthub-monitor.sh
```

## Performance Tuning

If the application is slow:

```bash
# Check resource usage
docker stats

# Increase resources in compose file
# Edit compose.internal-db.yml and add under each service:
#   deploy:
#     resources:
#       limits:
#         cpus: '2'
#         memory: 2G

# Restart with new limits
docker compose -f compose.internal-db.yml up -d --force-recreate
```
