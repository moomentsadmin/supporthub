# Production Operations Guide

Quick reference for common production tasks and maintenance operations.

## 🚀 Deployment

### Initial Deployment

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/supporthub.git
cd supporthub

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 3. Build application
npm ci --production
npm run build

# 4. Initialize database
npm run db:push

# 5. Start with PM2
pm2 start ecosystem.prod.config.js --env production
pm2 save
pm2 startup
```

### Update Deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Rebuild application
npm run build

# 4. Update database schema
npm run db:push

# 5. Restart application
pm2 restart supporthub

# 6. Verify deployment
curl https://yourdomain.com/api/health
```

## 🐳 Docker Deployment

### Start Services

```bash
# Internal database
docker compose -f compose.internal-db.yml up -d

# External database
docker compose -f compose.external-db.yml up -d

# Production with SSL
docker compose -f compose.production.yml up -d
```

### Update Docker Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f compose.production.yml down
docker compose -f compose.production.yml build --no-cache
docker compose -f compose.production.yml up -d

# Verify
docker compose -f compose.production.yml ps
docker compose -f compose.production.yml logs -f app
```

### Docker Maintenance

```bash
# View logs
docker compose -f compose.production.yml logs -f [service]

# Restart service
docker compose -f compose.production.yml restart [service]

# Stop all services
docker compose -f compose.production.yml down

# Clean up
docker system prune -a
docker volume prune
```

## 📊 Monitoring

### Application Status

```bash
# PM2 monitoring
pm2 status
pm2 monit
pm2 logs supporthub --lines 100

# Docker monitoring
docker compose -f compose.production.yml ps
docker stats
docker compose -f compose.production.yml logs -f
```

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/health

# Database connectivity
docker compose -f compose.production.yml exec db pg_isready -U supporthub

# Nginx status
sudo systemctl status nginx

# SSL certificate check
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### System Resources

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Database size
docker compose exec db psql -U supporthub -d supporthub -c "SELECT pg_size_pretty(pg_database_size('supporthub'));"

# Application memory
pm2 show supporthub
```

## 💾 Database Operations

### Backups

```bash
# Create backup (standalone)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Create backup (Docker)
docker compose -f compose.internal-db.yml exec db \
  pg_dump -U supporthub supporthub > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_*.sql

# Automated backup script
./scripts/backup.sh
```

### Restore

```bash
# Restore from backup (standalone)
psql $DATABASE_URL < backup_20241126.sql

# Restore from backup (Docker)
docker compose -f compose.internal-db.yml exec -T db \
  psql -U supporthub supporthub < backup_20241126.sql

# Using restore script
./scripts/restore.sh backup_20241126.tar.gz
```

### Database Access

```bash
# Connect to database (Docker)
docker compose -f compose.internal-db.yml exec db \
  psql -U supporthub -d supporthub

# Connect to database (standalone)
psql $DATABASE_URL

# Common queries
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM agents WHERE is_active = true;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

## 🔐 Security Operations

### Update Admin Password

```sql
-- Connect to database
psql $DATABASE_URL

-- Update admin password (replace with bcrypt hash)
UPDATE admin_users 
SET password = '$2b$10$newhashhere' 
WHERE email = 'admin@supporthub.com';
```

### Generate Secure Secrets

```bash
# Session secret (64 characters)
openssl rand -base64 64

# Database password (32 characters)
openssl rand -base64 32

# Random hex string
openssl rand -hex 32
```

### View Failed Login Attempts

```sql
SELECT 
  user_email,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE action = 'login' 
  AND success = false
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_email
ORDER BY attempts DESC;
```

## 🔄 SSL/TLS Management

### Manual Certificate Renewal

```bash
# Let's Encrypt renewal (Docker)
docker compose -f compose.production.yml run --rm certbot renew
docker compose -f compose.production.yml restart nginx

# Let's Encrypt renewal (standalone)
sudo certbot renew
sudo systemctl reload nginx
```

### Check Certificate Expiration

```bash
# Docker
docker compose -f compose.production.yml exec certbot \
  certbot certificates

# Standalone
sudo certbot certificates

# Alternative check
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Force Certificate Renewal

```bash
# Docker
docker compose -f compose.production.yml run --rm certbot renew --force-renewal

# Standalone
sudo certbot renew --force-renewal
```

## 📝 Log Management

### View Logs

```bash
# PM2 logs
pm2 logs supporthub
pm2 logs supporthub --lines 100
pm2 logs supporthub --err  # Errors only

# Docker logs
docker compose -f compose.production.yml logs -f app
docker compose -f compose.production.yml logs --tail=100 nginx

# System logs
sudo journalctl -u supporthub -n 100 -f
```

### Log Rotation

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Manual log cleanup
pm2 flush
```

### Export Logs

```bash
# Export last 24 hours of logs
pm2 logs supporthub --lines 1000 > logs_$(date +%Y%m%d).txt

# Export Docker logs
docker compose -f compose.production.yml logs app > docker_logs_$(date +%Y%m%d).txt
```

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check environment variables
pm2 env supporthub

# Check for errors
pm2 logs supporthub --err

# Verify database connection
echo $DATABASE_URL
npm run test-connection  # If test script exists

# Check port availability
sudo lsof -i :5000
```

### High Memory Usage

```bash
# Identify memory usage
pm2 show supporthub
docker stats

# Restart application
pm2 restart supporthub
docker compose -f compose.production.yml restart app

# Check for memory leaks
pm2 monit
```

### Database Connection Issues

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check database logs (Docker)
docker compose -f compose.internal-db.yml logs db

# Verify connection string format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/db?sslmode=require
```

### SSL Certificate Errors

```bash
# Check certificate validity
sudo certbot certificates

# Test SSL configuration
nginx -t
curl -vI https://yourdomain.com

# Review certbot logs
docker compose -f compose.production.yml logs certbot
```

### 502 Bad Gateway

```bash
# Check if application is running
pm2 status
docker compose -f compose.production.yml ps

# Check application health
curl http://localhost:5000/api/health

# Restart nginx
sudo systemctl restart nginx
docker compose -f compose.production.yml restart nginx
```

## 🧹 Maintenance Tasks

### Weekly Tasks

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Review application logs
pm2 logs supporthub --lines 100

# Verify backups
ls -lh /backups/
```

### Monthly Tasks

```bash
# Update application dependencies
npm update
npm audit fix

# Restart application
pm2 restart supporthub

# Clean up Docker
docker system prune -a
docker volume prune

# Review security logs
# Check audit_logs table for suspicious activity
```

### Quarterly Tasks

```bash
# Full backup verification
# Test restore process

# Security audit
npm audit
docker scan supporthub:latest  # If using Docker

# Performance review
# Analyze slow queries, optimize database

# Documentation update
# Update README, deployment guides
```

## 📊 Performance Optimization

### Database Optimization

```sql
-- Analyze database
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Create indexes (if needed)
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
```

### Application Optimization

```bash
# Enable PM2 cluster mode
pm2 delete supporthub
pm2 start ecosystem.prod.config.js --env production

# Monitor performance
pm2 monit

# Check for bottlenecks
pm2 show supporthub
```

## 🆘 Emergency Procedures

### Application Crash

```bash
# Immediate restart
pm2 restart supporthub

# If still failing, restart PM2
pm2 kill
pm2 resurrect

# Last resort: reboot server
sudo reboot
```

### Database Issues

```bash
# Emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Restart database (Docker)
docker compose -f compose.internal-db.yml restart db

# Check database integrity
docker compose exec db psql -U supporthub -d supporthub -c "SELECT version();"
```

### DDoS Attack

```bash
# Enable aggressive rate limiting in Nginx
# Edit nginx.conf to add:
limit_req_zone $binary_remote_addr zone=ddos:10m rate=1r/s;

# Block specific IPs
sudo ufw deny from 1.2.3.4

# Monitor connections
netstat -an | grep :443 | wc -l
```

## 📞 Support Contacts

- **Hosting Provider**: _______________
- **Database Provider**: _______________
- **Security Team**: _______________
- **On-Call Developer**: _______________

---

**Last Updated**: November 26, 2025
