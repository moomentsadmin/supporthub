# SupportHub HTTPS Production Setup - Quick Guide

## ✅ Production Deployment (HTTPS Required)

All production deployments now use **HTTPS with Let's Encrypt SSL certificates**.

### Automated Setup (Recommended)

```bash
cd ~/supporthub
sudo bash setup-production.sh
```

**This script will:**
1. ✅ Prompt for your domain (e.g., hub.cloudnext.co)
2. ✅ Prompt for email (for SSL notifications)
3. ✅ Choose Internal or External database
4. ✅ Generate secure secrets automatically
5. ✅ Obtain SSL certificate from Let's Encrypt
6. ✅ Deploy with HTTPS enabled
7. ✅ Run health checks

**Time:** ~5 minutes

---

## Manual Setup

### Option 1: Internal Database (Simple)

```bash
cd ~/supporthub

# Set environment variables
cat > .env << EOF
SESSION_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
DOMAIN=hub.cloudnext.co
NODE_ENV=production
PORT=5000
EOF

# Update nginx config with your domain
sed -i 's|DOMAIN|hub.cloudnext.co|g' configs/nginx-compose.conf

# Build and start (app + db only first)
docker compose -f compose.internal-db.yml up -d app db

# Wait for app to be ready
sleep 20

# Start nginx
docker compose -f compose.internal-db.yml up -d nginx

# Get SSL certificate
docker compose -f compose.internal-db.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email \
    -d hub.cloudnext.co

# Restart nginx with SSL
docker compose -f compose.internal-db.yml restart nginx
```

### Option 2: External Database (Neon, AWS RDS, Azure, etc.)

```bash
cd ~/supporthub

# Set environment variables
cat > .env << EOF
SESSION_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://user:password@host:5432/supporthub
DOMAIN=hub.cloudnext.co
NODE_ENV=production
PORT=5000
VERIFIED_SENDER_EMAIL=support@yourdomain.com
SENDGRID_API_KEY=your_sendgrid_key
EOF

# Update nginx config with your domain
sed -i 's|DOMAIN|hub.cloudnext.co|g' configs/nginx-compose.conf

# Build and start app only first
docker compose -f compose.external-db.yml up -d app

# Wait for app to be ready
sleep 20

# Start nginx
docker compose -f compose.external-db.yml up -d nginx

# Get SSL certificate
docker compose -f compose.external-db.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@yourdomain.com \
    --agree-tos \
    --no-eff-email \
    -d hub.cloudnext.co

# Restart nginx with SSL
docker compose -f compose.external-db.yml restart nginx
```

---

## Prerequisites

### 1. Server Requirements
- Ubuntu 20.04/22.04 or Debian 11/12
- 2 CPU cores, 4GB RAM (minimum)
- 20GB disk space
- Public IP address

### 2. Domain Setup
**CRITICAL:** Your domain DNS must be configured BEFORE running setup

```bash
# Add an A record pointing to your server IP
hub.cloudnext.co  →  A  →  YOUR_SERVER_IP
```

**Verify DNS is working:**
```bash
nslookup hub.cloudnext.co
# Should return your server IP
```

### 3. Firewall
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 4. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

---

## Post-Deployment

### Verify HTTPS is Working
```bash
# Test health endpoint
curl https://hub.cloudnext.co/api/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### Access Application
- **Admin Panel:** https://hub.cloudnext.co/admin
- **Agent Portal:** https://hub.cloudnext.co/agent  
- **Customer Portal:** https://hub.cloudnext.co/customer

**Default Admin Credentials:**
- Email: `admin@supporthub.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change admin password immediately after first login!

### Monitor Logs
```bash
# All services
docker compose -f compose.internal-db.yml logs -f

# Just application
docker compose -f compose.internal-db.yml logs -f app

# Just nginx
docker compose -f compose.internal-db.yml logs -f nginx
```

### Check Service Status
```bash
docker compose -f compose.internal-db.yml ps

# Should show all services as "Up" and "healthy"
```

---

## SSL Certificate Renewal

**Automatic:** Certbot container automatically renews certificates every 12 hours.

**Manual Renewal:**
```bash
docker compose -f compose.internal-db.yml run --rm certbot renew
docker compose -f compose.internal-db.yml restart nginx
```

**Check Certificate Expiry:**
```bash
echo | openssl s_client -servername hub.cloudnext.co -connect hub.cloudnext.co:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Troubleshooting

### SSL Certificate Failed

**Error:** "Failed to obtain SSL certificate"

**Causes:**
1. DNS not pointing to server
2. Port 80 blocked by firewall
3. Another service using port 80

**Fix:**
```bash
# Check DNS
nslookup hub.cloudnext.co

# Check firewall
sudo ufw status

# Check what's on port 80
sudo netstat -tlnp | grep :80

# Stop any conflicting service
sudo systemctl stop apache2
sudo systemctl stop nginx
```

### HTTPS Not Working After Setup

```bash
# Check nginx logs
docker compose -f compose.internal-db.yml logs nginx

# Check certificate exists
docker compose -f compose.internal-db.yml exec nginx ls -la /etc/letsencrypt/live/

# Restart nginx
docker compose -f compose.internal-db.yml restart nginx
```

### Admin Login Returns Error

```bash
# Check app logs
docker compose -f compose.internal-db.yml logs app

# Check database connection
docker compose -f compose.internal-db.yml exec app node -e "console.log(process.env.DATABASE_URL)"

# Restart app
docker compose -f compose.internal-db.yml restart app
```

---

## Backup & Restore

### Backup (Internal Database)
```bash
# Backup database
docker exec supporthub-db-1 pg_dump -U supporthub supporthub > backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz -C $(docker volume inspect supporthub_app_uploads -f '{{.Mountpoint}}') .
```

### Restore (Internal Database)
```bash
# Restore database
cat backup-20241203.sql | docker exec -i supporthub-db-1 psql -U supporthub supporthub

# Restore uploads
tar -xzf uploads-backup-20241203.tar.gz -C $(docker volume inspect supporthub_app_uploads -f '{{.Mountpoint}}')
```

---

## Updating

```bash
cd ~/supporthub
git pull origin main
docker compose -f compose.internal-db.yml down
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d
```

---

## Support

- **Documentation:** See PRODUCTION-DEPLOYMENT.md
- **Troubleshooting:** See DEPLOYMENT-TROUBLESHOOTING.md
- **Issues:** https://github.com/moomentsadmin/supporthub/issues

---

**Remember:**
- ✅ HTTPS is mandatory for production
- ✅ Change default passwords immediately
- ✅ Configure email/SMS providers
- ✅ Set up regular backups
- ✅ Monitor logs regularly
