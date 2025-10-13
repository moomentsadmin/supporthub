# Let's Encrypt SSL Deployment Guide

Automated HTTPS deployment with Let's Encrypt SSL certificates for SupportHub.

## 🚀 Quick Deploy (One Command)

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/supporthub.git
cd supporthub

# Copy environment template
cp .env.docker.example .env

# Edit configuration
nano .env
```

### 2. Configure Environment Variables

**Required settings in `.env`:**

```env
# Domain & SSL (Let's Encrypt)
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com

# Database
POSTGRES_PASSWORD=your_strong_password_here

# Application
SESSION_SECRET=your_random_secret_32_chars_minimum
```

**Generate secure secrets:**
```bash
# Session secret
openssl rand -hex 32

# Database password
openssl rand -base64 24
```

### 3. Deploy with Automated SSL

```bash
# Deploy everything (database + app + nginx + Let's Encrypt SSL)
docker compose -f compose.production.yml up -d

# The system will:
# 1. Start database and application
# 2. Start Nginx on ports 80 and 443
# 3. Automatically obtain Let's Encrypt SSL certificate
# 4. Configure Nginx to use the SSL certificate
# 5. Set up automatic certificate renewal
```

### 4. Verify Deployment

```bash
# Check all containers are running
docker compose -f compose.production.yml ps

# Check SSL certificate was obtained
docker compose -f compose.production.yml logs ssl_init

# Test HTTPS endpoint
curl https://yourdomain.com/api/health
```

### 5. Access Your Application

- **HTTPS URL**: https://yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin/login
  - Email: `admin@supporthub.com`
  - Password: `admin123` (⚠️ Change immediately!)

---

## 📋 Prerequisites

### Domain Requirements

1. **Domain Name**: You must own a domain (e.g., yourdomain.com)
2. **DNS Configuration**: Point your domain to your server
   ```bash
   # Check DNS propagation
   dig yourdomain.com
   nslookup yourdomain.com
   ```

3. **Ports Open**: Ensure ports 80 and 443 are accessible
   ```bash
   # Test port 80
   curl -I http://yourdomain.com
   
   # Test port 443
   curl -I https://yourdomain.com
   ```

### Server Requirements

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- Docker 20.10+
- Docker Compose 2.0+
- Minimum 2GB RAM
- Ports 80 and 443 open in firewall

### Firewall Setup (Ubuntu/Debian)

```bash
# Install UFW
sudo apt-get install ufw

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🔧 Configuration Details

### Environment Variables Explained

```env
# ============================================
# Domain & SSL Configuration
# ============================================
DOMAIN=yourdomain.com              # Your domain name (required)
EMAIL=admin@yourdomain.com         # Email for Let's Encrypt notifications

# ============================================
# Database Configuration
# ============================================
POSTGRES_DB=supporthub             # Database name
POSTGRES_USER=supporthub           # Database username
POSTGRES_PASSWORD=<strong-password> # Database password (REQUIRED)

# ============================================
# Application Configuration
# ============================================
NODE_ENV=production                # Environment mode
PORT=5000                          # Internal app port (don't change)
SESSION_SECRET=<random-32-chars>   # Session encryption key (REQUIRED)

# ============================================
# Email Service (Optional)
# ============================================
SENDGRID_API_KEY=SG.xxx           # SendGrid API key
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com

# ============================================
# SMS Service (Optional)
# ============================================
TWILIO_ACCOUNT_SID=ACxxx          # Twilio account SID
TWILIO_AUTH_TOKEN=xxx             # Twilio auth token
TWILIO_PHONE_NUMBER=+1234567890   # Twilio phone number
```

### SSL Certificate Behavior

The automated setup handles different scenarios:

#### Scenario 1: Valid Domain (Production)
- Automatically obtains Let's Encrypt certificate
- Configures HTTPS on port 443
- Sets up automatic renewal every 12 hours

#### Scenario 2: Testing (localhost or IP)
- Creates self-signed certificate
- HTTPS will work but show browser warning
- Good for testing, not for production

#### Scenario 3: Certificate Renewal Failed
- Falls back to self-signed certificate
- Logs error for troubleshooting
- System continues to run

---

## 🔄 SSL Certificate Management

### Automatic Renewal

Certificates are automatically renewed by the `certbot` container:
- Checks for renewal twice daily (12-hour interval)
- Renews certificates 30 days before expiration
- No manual intervention required

### Manual Renewal (if needed)

```bash
# Force certificate renewal
docker compose -f compose.production.yml run --rm certbot renew --force-renewal

# Reload Nginx to use new certificate
docker compose -f compose.production.yml restart nginx

# Check certificate expiration
docker compose -f compose.production.yml run --rm certbot certificates
```

### Check Certificate Status

```bash
# View certificate details
docker compose -f compose.production.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Check expiration date
docker compose -f compose.production.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -enddate -noout
```

---

## 🔍 Monitoring & Logs

### View Deployment Logs

```bash
# All services
docker compose -f compose.production.yml logs -f

# SSL initialization
docker compose -f compose.production.yml logs ssl_init

# Certificate renewal
docker compose -f compose.production.yml logs certbot

# Nginx
docker compose -f compose.production.yml logs nginx

# Application
docker compose -f compose.production.yml logs app
```

### Check Service Status

```bash
# All containers
docker compose -f compose.production.yml ps

# Check Nginx configuration
docker compose -f compose.production.yml exec nginx nginx -t

# Check SSL certificate
docker compose -f compose.production.yml run --rm certbot certificates
```

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/health

# SSL certificate check
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 🐛 Troubleshooting

### Issue: SSL Certificate Not Obtained

**Symptoms:**
- Browser shows "Not Secure"
- Self-signed certificate warning

**Check logs:**
```bash
docker compose -f compose.production.yml logs ssl_init
```

**Common causes and solutions:**

1. **Domain not pointing to server**
   ```bash
   # Check DNS
   dig yourdomain.com
   
   # Should return your server's IP
   ```

2. **Ports 80/443 not accessible**
   ```bash
   # Test from external machine
   curl -I http://yourdomain.com
   curl -I https://yourdomain.com
   ```

3. **Rate limit reached**
   - Let's Encrypt has rate limits (5 certificates per domain per week)
   - Wait 7 days or use staging environment for testing
   
   ```bash
   # Use staging for testing (add to init-ssl.sh)
   certbot certonly --staging ...
   ```

### Issue: Certificate Renewal Fails

**Check renewal logs:**
```bash
docker compose -f compose.production.yml logs certbot
```

**Manual renewal:**
```bash
# Stop automatic renewal
docker compose -f compose.production.yml stop certbot

# Run manual renewal
docker compose -f compose.production.yml run --rm certbot renew

# Restart services
docker compose -f compose.production.yml restart nginx certbot
```

### Issue: Nginx Fails to Start

**Check Nginx logs:**
```bash
docker compose -f compose.production.yml logs nginx
```

**Common causes:**

1. **Port already in use**
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **Configuration error**
   ```bash
   docker compose -f compose.production.yml exec nginx nginx -t
   ```

3. **Certificate files missing**
   ```bash
   # Check SSL directory
   docker compose -f compose.production.yml exec nginx ls -la /etc/nginx/ssl
   docker compose -f compose.production.yml exec nginx ls -la /etc/letsencrypt/live
   ```

### Issue: Database Connection Errors

**Check DATABASE_URL format in logs:**
```bash
docker compose -f compose.production.yml logs app | grep DATABASE_URL
```

**Should be:**
```
DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub
```

**NOT:**
```
DATABASE_URL=https://... (Neon HTTP format - WRONG for Docker)
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
cd supporthub

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f compose.production.yml down
docker compose -f compose.production.yml build --no-cache
docker compose -f compose.production.yml up -d

# Verify
docker compose -f compose.production.yml logs -f app
```

### Backup Database

```bash
# Create backup
docker compose -f compose.production.yml exec db \
  pg_dump -U supporthub supporthub > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose -f compose.production.yml exec -T db \
  psql -U supporthub supporthub < backup_20241013.sql
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/supporthub && docker compose -f compose.production.yml exec -T db pg_dump -U supporthub supporthub > /backups/supporthub_$(date +\%Y\%m\%d).sql

# Clean old backups (keep 30 days)
0 3 * * * find /backups -name "supporthub_*.sql" -mtime +30 -delete
```

---

## 🔐 Security Best Practices

### 1. Change Default Credentials

```bash
# Login to admin panel
# https://yourdomain.com/admin/login

# Default credentials:
# Email: admin@supporthub.com
# Password: admin123

# Change password immediately in Settings → Admin Users
```

### 2. Use Strong Passwords

```bash
# Generate session secret
openssl rand -hex 32

# Generate database password
openssl rand -base64 24
```

### 3. Enable Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
```

### 4. Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker compose -f compose.production.yml pull
docker compose -f compose.production.yml up -d
```

### 5. Monitor Access Logs

```bash
# Check Nginx access logs
docker compose -f compose.production.yml exec nginx cat /var/log/nginx/access.log

# Check for failed authentications
docker compose -f compose.production.yml logs app | grep "authentication failed"
```

---

## 📊 Performance Optimization

### Enable Nginx Caching (Already Configured)

- Gzip compression: Enabled
- Static file caching: 1 year
- Connection keep-alive: 65 seconds

### Database Optimization

```bash
# Connect to database
docker compose -f compose.production.yml exec db psql -U supporthub -d supporthub

# Check query performance
EXPLAIN ANALYZE SELECT * FROM tickets;
```

### Scale Application

```bash
# Scale to 3 app instances
docker compose -f compose.production.yml up -d --scale app=3

# Nginx will automatically load balance
```

---

## 📝 Complete Deployment Checklist

Before going live:

- [ ] Domain DNS configured and propagated
- [ ] DOMAIN and EMAIL set in .env file
- [ ] Strong POSTGRES_PASSWORD set
- [ ] Strong SESSION_SECRET set (32+ chars)
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Let's Encrypt SSL certificate obtained
- [ ] HTTPS working (test: curl https://yourdomain.com/api/health)
- [ ] Default admin password changed
- [ ] Backup cron job configured
- [ ] Monitoring setup
- [ ] Email service configured (optional)
- [ ] All health checks passing

---

## 🆘 Quick Commands Reference

```bash
# Deploy with SSL
docker compose -f compose.production.yml up -d

# Check SSL certificate
docker compose -f compose.production.yml run --rm certbot certificates

# Renew SSL certificate
docker compose -f compose.production.yml run --rm certbot renew
docker compose -f compose.production.yml restart nginx

# View logs
docker compose -f compose.production.yml logs -f

# Restart services
docker compose -f compose.production.yml restart

# Stop all
docker compose -f compose.production.yml down

# Backup database
docker compose -f compose.production.yml exec db pg_dump -U supporthub supporthub > backup.sql

# Update application
git pull && docker compose -f compose.production.yml up -d --build
```

---

## 🌐 Multiple Domain Setup

To host multiple domains:

1. **Add domain to .env:**
```env
DOMAIN=domain1.com,domain2.com
```

2. **Update Nginx config:**
```nginx
server {
    listen 443 ssl http2;
    server_name domain1.com www.domain1.com domain2.com www.domain2.com;
    ...
}
```

3. **Obtain certificates:**
```bash
docker compose -f compose.production.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d domain1.com -d www.domain1.com \
  -d domain2.com -d www.domain2.com
```

---

**Your SupportHub is now deployed with automated Let's Encrypt SSL! 🔒🚀**

Access your application at: **https://yourdomain.com**
