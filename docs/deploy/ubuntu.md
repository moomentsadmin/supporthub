# Ubuntu Server Deployment Guide

Complete guide for deploying SupportHub on Ubuntu 22.04 LTS server.

## 🚀 Quick Start (15 minutes)

### Prerequisites
- Ubuntu 22.04 LTS server
- Domain name pointing to your server
- Root or sudo access

### Step 1: Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git ufw nginx certbot python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### Step 2: Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER supporthub WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE supporthub OWNER supporthub;
GRANT ALL PRIVILEGES ON DATABASE supporthub TO supporthub;
\q

# Test connection
psql -h localhost -U supporthub -d supporthub -c "SELECT version();"
```

### Step 3: Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www/supporthub
sudo chown $USER:$USER /var/www/supporthub

# Extract application backup
cd /var/www/supporthub
# Upload your backup file here, then:
tar -xzf supporthub_backup_*.tar.gz

# Install dependencies
npm ci --production

# Configure environment
cp .env.production.example .env

# Edit .env file with your settings:
nano .env
```

**Required .env settings:**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://supporthub:your_secure_password_here@localhost:5432/supporthub
SESSION_SECRET=your_very_long_random_session_secret_here
TRUST_PROXY=1
```

### Step 4: Build and Run Application
```bash
# Build application
npm run build

# Run database migrations
npm run db:push

# Start with PM2
pm2 start ecosystem.prod.config.js --env production

# Enable PM2 startup
pm2 startup
pm2 save
```

### Step 5: Nginx Configuration
```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Create SupportHub configuration
sudo nano /etc/nginx/sites-available/supporthub
```

**Nginx configuration content:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration (will be managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # Proxy to application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site and setup SSL:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test SSL renewal
sudo certbot renew --dry-run
```

### Step 6: Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

### Step 7: Verification
```bash
# Check application health
curl http://localhost:5000/api/health

# Check PM2 status
pm2 status

# Check logs
pm2 logs supporthub

# Test HTTPS
curl -I https://your-domain.com
```

## 📋 Production Checklist

### Security
- [ ] Strong passwords for database and session secret
- [ ] UFW firewall enabled and configured
- [ ] SSL certificate installed and auto-renewal setup
- [ ] Regular security updates scheduled
- [ ] Non-root user for application

### Performance
- [ ] PM2 cluster mode enabled
- [ ] Nginx gzip compression enabled
- [ ] Database performance optimized
- [ ] Log rotation configured

### Monitoring
- [ ] PM2 monitoring setup
- [ ] Nginx log monitoring
- [ ] Database backup scheduled
- [ ] Health check monitoring

### Backup Strategy
```bash
# Create backup script
sudo nano /usr/local/bin/backup-supporthub.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/backup/supporthub"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump supporthub > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www supporthub

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Schedule daily backups:**
```bash
sudo chmod +x /usr/local/bin/backup-supporthub.sh
sudo crontab -e

# Add this line for daily 2 AM backup:
0 2 * * * /usr/local/bin/backup-supporthub.sh
```

## 🔧 Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs supporthub

# Check if port is available
sudo netstat -tlnp | grep :5000

# Restart application
pm2 restart supporthub
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U supporthub -d supporthub -c "SELECT 1;"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Check PM2 cluster status
pm2 monit

# Check database performance
sudo -u postgres psql supporthub -c "SELECT * FROM pg_stat_activity;"
```

## 📚 Maintenance Tasks

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
cd /var/www/supporthub
npm audit fix

# Restart application
pm2 restart supporthub
```

### Log Management
```bash
# Rotate PM2 logs
pm2 flush

# Check disk space
df -h

# Clean old logs
sudo journalctl --vacuum-time=7d
```

### Database Maintenance
```bash
# Vacuum and analyze database
sudo -u postgres psql supporthub -c "VACUUM ANALYZE;"

# Check database size
sudo -u postgres psql supporthub -c "SELECT pg_size_pretty(pg_database_size('supporthub'));"
```

## 🆘 Emergency Recovery

### If Application is Down
```bash
# Quick restart
pm2 restart all

# If that fails, restart services
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Check system status
systemctl status nginx postgresql
pm2 status
```

### Database Recovery
```bash
# Restore from backup
sudo -u postgres psql supporthub < /backup/supporthub/db_backup_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 restart supporthub
```

This completes the Ubuntu deployment guide. Your SupportHub application should now be running securely on Ubuntu with proper SSL, firewall, and monitoring in place.