# Production Deployment Guide - HTTPS/SSL

Complete guide for deploying SupportHub with HTTPS/SSL support on port 443.

## 🚀 Quick Deploy

### Prerequisites
- Domain name pointed to your server
- Docker & Docker Compose installed
- Ports 80 and 443 open in firewall

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/supporthub.git
cd supporthub

# Create environment file
cp .env.docker.example .env
nano .env
```

**Required environment variables:**
```env
# Database
POSTGRES_DB=supporthub
POSTGRES_USER=supporthub
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Application
SESSION_SECRET=YOUR_RANDOM_SECRET_HERE
NODE_ENV=production

# Optional: Email & SMS
SENDGRID_API_KEY=
VERIFIED_SENDER_EMAIL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 2. Choose SSL Option

#### Option A: Let's Encrypt (Production - Recommended)

```bash
# Make setup script executable
chmod +x scripts/setup-ssl.sh

# Run SSL setup with your domain
./scripts/setup-ssl.sh yourdomain.com admin@yourdomain.com

# Start all services
docker compose -f compose.production.yml up -d
```

#### Option B: Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed certificate
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh

# Start all services
docker compose -f compose.production.yml up -d
```

### 3. Verify Deployment

```bash
# Check all containers are running
docker compose -f compose.production.yml ps

# View logs
docker compose -f compose.production.yml logs -f

# Test HTTPS endpoint
curl -k https://localhost/api/health
```

### 4. Access Your Application

- **HTTPS**: https://yourdomain.com
- **Admin Login**: https://yourdomain.com/admin/login
  - Email: admin@supporthub.com
  - Password: admin123 (⚠️ Change immediately!)

---

## 📋 Architecture

### Production Stack
```
Internet (Port 443/80)
         ↓
    Nginx (SSL Termination)
         ↓
    Node.js App (Port 5000)
         ↓
    PostgreSQL Database (Port 5432)
```

### Components

1. **Nginx** - Reverse proxy with SSL/TLS termination
   - Handles HTTPS on port 443
   - Redirects HTTP to HTTPS
   - Serves as load balancer
   - Implements security headers

2. **Node.js Application** - Backend on port 5000
   - Handles all business logic
   - Communicates with database
   - Serves frontend assets

3. **PostgreSQL** - Database
   - Stores all application data
   - Persistent volume storage

4. **Certbot** - SSL Certificate Management
   - Auto-renews Let's Encrypt certificates
   - Runs renewal check twice daily

---

## 🔒 SSL Certificate Management

### Let's Encrypt Setup

```bash
# Initial setup with domain
./scripts/setup-ssl.sh yourdomain.com your-email@domain.com

# Certificate auto-renewal is handled by certbot container
# Manual renewal (if needed)
docker compose -f compose.production.yml run --rm certbot renew
docker compose -f compose.production.yml restart nginx
```

### Custom SSL Certificate

If you have your own SSL certificates:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/your/certificate.crt nginx/ssl/cert.pem
cp /path/to/your/private.key nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Update Nginx config if needed
nano nginx/conf.d/supporthub.conf

# Restart Nginx
docker compose -f compose.production.yml restart nginx
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Database Configuration
POSTGRES_DB=supporthub
POSTGRES_USER=supporthub
POSTGRES_PASSWORD=super_secure_password_123

# Application Settings
NODE_ENV=production
SESSION_SECRET=random_string_min_32_chars

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Generate Secure Secrets

```bash
# Session secret (32+ characters)
openssl rand -hex 32

# Database password
openssl rand -base64 24
```

### Nginx Configuration

Main configuration: `nginx/nginx.conf`
Site configuration: `nginx/conf.d/supporthub.conf`

**Custom domain setup:**
```bash
# Edit Nginx config
nano nginx/conf.d/supporthub.conf

# Change server_name from _ to your domain
server_name yourdomain.com www.yourdomain.com;

# Restart Nginx
docker compose -f compose.production.yml restart nginx
```

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose -f compose.production.yml logs -f

# Specific service
docker compose -f compose.production.yml logs -f nginx
docker compose -f compose.production.yml logs -f app
docker compose -f compose.production.yml logs -f db

# Last 100 lines
docker compose -f compose.production.yml logs --tail=100 app
```

### Container Status

```bash
# Check running containers
docker compose -f compose.production.yml ps

# Resource usage
docker stats

# Health checks
docker compose -f compose.production.yml ps
```

### Database Backup

```bash
# Create backup
docker compose -f compose.production.yml exec db \
  pg_dump -U supporthub supporthub > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose -f compose.production.yml exec -T db \
  psql -U supporthub supporthub < backup_20241013.sql
```

### Automated Backups

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/supporthub && docker compose -f compose.production.yml exec -T db pg_dump -U supporthub supporthub > /backups/supporthub_$(date +\%Y\%m\%d).sql

# Clean old backups (keep 30 days)
0 3 * * * find /backups -name "supporthub_*.sql" -mtime +30 -delete
```

---

## 🛡️ Security

### Firewall Setup (UFW)

```bash
# Install UFW
sudo apt-get install ufw

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Security Headers

Already configured in Nginx:
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security (HSTS)

### Change Default Credentials

```bash
# Access the application
https://yourdomain.com/admin/login

# Login with defaults
# Email: admin@supporthub.com
# Password: admin123

# Go to Settings → Admin Users
# Change password immediately!
```

### Database Security

```env
# Use strong password in .env
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Restrict database access to internal network only
# (Already configured in docker-compose)
```

---

## 🚀 Performance Optimization

### Nginx Caching

Already configured in `nginx/conf.d/supporthub.conf`:
- Gzip compression enabled
- Static file caching (1 year)
- Connection keep-alive

### Database Performance

```bash
# Check database performance
docker compose -f compose.production.yml exec db psql -U supporthub -d supporthub

# Inside PostgreSQL
EXPLAIN ANALYZE SELECT * FROM tickets;
```

### Application Scaling

For high traffic, scale horizontally:

```bash
# Scale app to 3 instances
docker compose -f compose.production.yml up -d --scale app=3

# Nginx will automatically load balance
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
cd supporthub

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f compose.production.yml down
docker compose -f compose.production.yml build --no-cache
docker compose -f compose.production.yml up -d

# Verify
docker compose -f compose.production.yml logs -f app
```

### Update SSL Certificate (Manual)

```bash
# Renew certificate
docker compose -f compose.production.yml run --rm certbot renew

# Reload Nginx
docker compose -f compose.production.yml restart nginx
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ careful with this)
docker volume prune

# Full system cleanup
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### Issue: Nginx fails to start

**Check logs:**
```bash
docker compose -f compose.production.yml logs nginx
```

**Common causes:**
- SSL certificate files missing → Run `./scripts/setup-ssl.sh`
- Port 80/443 already in use → Check with `sudo lsof -i :443`
- Configuration syntax error → Test with `docker compose -f compose.production.yml run --rm nginx nginx -t`

### Issue: Certificate validation fails

**Solution:**
```bash
# Ensure domain points to your server
dig yourdomain.com

# Ensure ports 80/443 are accessible
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Check certbot logs
docker compose -f compose.production.yml logs certbot
```

### Issue: Database connection refused

**Check DATABASE_URL format:**
```bash
# Should be PostgreSQL format, not Neon HTTP
DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub

# NOT this:
# DATABASE_URL=https://... (Neon format)
```

**Verify database is running:**
```bash
docker compose -f compose.production.yml ps db
docker compose -f compose.production.yml logs db
```

### Issue: 502 Bad Gateway

**Causes:**
- App container not running
- App not listening on port 5000
- Health check failing

**Debug:**
```bash
# Check app logs
docker compose -f compose.production.yml logs app

# Check app health
docker compose -f compose.production.yml exec app curl -f http://localhost:5000/api/health

# Restart app
docker compose -f compose.production.yml restart app
```

---

## 📝 Production Checklist

Before going live:

- [ ] Domain DNS configured and propagated
- [ ] Let's Encrypt SSL certificate obtained
- [ ] Strong passwords set for database and session
- [ ] Default admin password changed
- [ ] Firewall configured (UFW)
- [ ] Backups configured (cron job)
- [ ] Monitoring setup
- [ ] Email service configured (SendGrid)
- [ ] Environment variables verified
- [ ] Health checks passing
- [ ] Security headers verified
- [ ] HTTPS redirect working
- [ ] Application tested end-to-end

---

## 🆘 Quick Commands Reference

```bash
# Start production
docker compose -f compose.production.yml up -d

# Stop production
docker compose -f compose.production.yml down

# View logs
docker compose -f compose.production.yml logs -f

# Restart app
docker compose -f compose.production.yml restart app

# Rebuild app
docker compose -f compose.production.yml build --no-cache app
docker compose -f compose.production.yml up -d app

# Database backup
docker compose -f compose.production.yml exec db pg_dump -U supporthub supporthub > backup.sql

# SSL renewal
docker compose -f compose.production.yml run --rm certbot renew
docker compose -f compose.production.yml restart nginx

# Scale app
docker compose -f compose.production.yml up -d --scale app=3

# Check health
curl -k https://localhost/api/health
```

---

## 🌐 Multi-Domain Setup

To host multiple domains on the same server:

1. **Add server block to Nginx config:**
```nginx
# In nginx/conf.d/domain2.conf
server {
    listen 443 ssl http2;
    server_name domain2.com www.domain2.com;
    
    ssl_certificate /etc/letsencrypt/live/domain2.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain2.com/privkey.pem;
    
    location / {
        proxy_pass http://app:5000;
        # ... proxy settings
    }
}
```

2. **Get certificate for new domain:**
```bash
docker compose -f compose.production.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d domain2.com -d www.domain2.com
```

3. **Reload Nginx:**
```bash
docker compose -f compose.production.yml restart nginx
```

---

## 📞 Support

### Logs Location
- Nginx logs: `/var/log/nginx/` (inside container)
- App logs: `docker compose logs app`
- Database logs: `docker compose logs db`

### Useful Resources
- [Docker Documentation](https://docs.docker.com)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Your SupportHub is now production-ready with HTTPS! 🔒🚀**
