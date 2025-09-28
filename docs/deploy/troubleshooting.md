# Troubleshooting Guide

Comprehensive troubleshooting guide for SupportHub deployment and operational issues.

## 🔍 Quick Diagnostics

### Health Check Checklist

Run these commands to quickly assess system health:

```bash
# 1. Application health
curl -f http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. Process status
pm2 status
# Expected: app online, uptime > 0

# 3. Database connectivity
psql "$DATABASE_URL" -c "SELECT version();"
# Expected: PostgreSQL version info

# 4. System resources
free -h && df -h
# Check available memory and disk space

# 5. Network connectivity
netstat -tlnp | grep :5000
# Expected: Process listening on port 5000
```

## 🚨 Common Issues and Solutions

### Application Won't Start

**Symptom:** `pm2 status` shows app as `errored` or `stopped`

**Diagnosis:**
```bash
# Check PM2 logs
pm2 logs supporthub --lines 50

# Check if port is in use
sudo netstat -tlnp | grep :5000

# Verify Node.js version
node --version
# Should be 20.x.x or higher

# Check environment variables
env | grep -E "(DATABASE_URL|SESSION_SECRET|NODE_ENV)"
```

**Solutions:**

1. **Port already in use:**
   ```bash
   # Kill process using port 5000
   sudo lsof -t -i:5000 | xargs sudo kill -9
   
   # Or change port in .env
   echo "PORT=5001" >> .env
   pm2 restart supporthub
   ```

2. **Missing environment variables:**
   ```bash
   # Check .env file exists
   ls -la .env
   
   # Verify required variables
   cat .env | grep -E "(DATABASE_URL|SESSION_SECRET)"
   
   # Add missing variables
   echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
   ```

3. **Database connection failure:**
   ```bash
   # Test database connection
   psql "$DATABASE_URL" -c "SELECT 1;"
   
   # Check SSL requirements
   psql "$DATABASE_URL?sslmode=disable" -c "SELECT 1;"
   ```

### Database Connection Issues

**Symptom:** Application starts but fails with database errors

**Diagnosis:**
```bash
# Test basic connectivity
telnet db-host 5432

# Test with psql
psql "$DATABASE_URL" -c "SELECT current_database();"

# Check SSL configuration
psql "$DATABASE_URL" -c "SHOW ssl;"

# Verify user permissions
psql "$DATABASE_URL" -c "\du"
```

**Solutions:**

1. **Connection timeout:**
   ```bash
   # Check firewall rules
   # AWS: Security groups
   aws ec2 describe-security-groups --group-ids sg-12345678
   
   # Digital Ocean: Trusted sources
   doctl databases firewalls list supporthub-db
   
   # Azure: Firewall rules
   az postgres server firewall-rule list --resource-group rg --server-name server
   ```

2. **SSL/TLS errors:**
   ```bash
   # For development, disable SSL temporarily
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=disable"
   
   # For production, ensure SSL is properly configured
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
   ```

3. **Authentication failures:**
   ```bash
   # Check username format (Azure requires @server suffix)
   # Azure format: username@server
   # Standard format: username
   
   # Test with correct format
   psql "postgresql://user@server:pass@server.postgres.database.azure.com:5432/db?sslmode=require"
   ```

### Migration Failures

**Symptom:** `npm run db:push` fails or data loss warnings

**Diagnosis:**
```bash
# Check current schema
psql "$DATABASE_URL" -c "\dt"

# Check for existing data
psql "$DATABASE_URL" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Review migration that would be applied
npm run db:generate
```

**Solutions:**

1. **Data loss warnings:**
   ```bash
   # Force push (DANGEROUS - will lose data)
   npm run db:push --force
   
   # Better: Export data first
   pg_dump "$DATABASE_URL" > backup_before_migration.sql
   npm run db:push --force
   ```

2. **Permission errors:**
   ```sql
   -- Grant necessary permissions
   GRANT ALL PRIVILEGES ON DATABASE supporthub TO username;
   GRANT ALL PRIVILEGES ON SCHEMA public TO username;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO username;
   ```

3. **Schema conflicts:**
   ```bash
   # Drop and recreate schema (DANGEROUS)
   npm run db:drop
   npm run db:push
   
   # Or manually resolve conflicts
   psql "$DATABASE_URL" -c "DROP TABLE conflicting_table;"
   npm run db:push
   ```

### Nginx/Reverse Proxy Issues

**Symptom:** 502 Bad Gateway or connection refused errors

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check if application is running
curl http://localhost:5000/api/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions:**

1. **Nginx configuration errors:**
   ```bash
   # Check syntax
   sudo nginx -t
   
   # Common issues in upstream configuration
   # Docker: should be 'app:5000'
   # Host: should be '127.0.0.1:5000' or 'localhost:5000'
   
   # Reload configuration
   sudo systemctl reload nginx
   ```

2. **Upstream not responding:**
   ```bash
   # Verify application is listening
   sudo netstat -tlnp | grep :5000
   
   # Check if PM2 is running
   pm2 status
   
   # Restart application
   pm2 restart supporthub
   ```

3. **SSL certificate issues:**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Test certificate renewal
   sudo certbot renew --dry-run
   
   # Force renewal if needed
   sudo certbot renew --force-renewal
   ```

### Performance Issues

**Symptom:** Slow response times, high CPU/memory usage

**Diagnosis:**
```bash
# Check system resources
htop
# Look for high CPU/memory usage

# Check PM2 cluster status
pm2 monit

# Check database performance
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
psql "$DATABASE_URL" -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**

1. **High CPU usage:**
   ```bash
   # Scale up PM2 instances
   pm2 scale supporthub +2
   
   # Check for infinite loops in logs
   pm2 logs supporthub --lines 100
   
   # Restart application
   pm2 restart supporthub
   ```

2. **Memory leaks:**
   ```bash
   # Set memory limit for PM2
   pm2 start ecosystem.prod.config.js --max-memory-restart 500M
   
   # Monitor memory usage
   pm2 monit
   ```

3. **Database performance:**
   ```sql
   -- Find and kill long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes';
   
   -- Kill specific query
   SELECT pg_terminate_backend(pid);
   
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM tickets WHERE status = 'open';
   ```

### Email Issues

**Symptom:** Emails not sending, SendGrid errors

**Diagnosis:**
```bash
# Check SendGrid API key
env | grep SENDGRID_API_KEY

# Check verified sender
env | grep VERIFIED_SENDER_EMAIL

# Test email configuration
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "'$VERIFIED_SENDER_EMAIL'"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test message"}]
  }'
```

**Solutions:**

1. **SendGrid authentication:**
   ```bash
   # Verify API key is valid
   curl -H "Authorization: Bearer $SENDGRID_API_KEY" \
        https://api.sendgrid.com/v3/user/account
   
   # Check sender verification status
   # Go to SendGrid dashboard → Settings → Sender Authentication
   ```

2. **Domain authentication:**
   ```bash
   # Set up domain authentication in SendGrid
   # Add DNS records provided by SendGrid
   # Verify domain status in dashboard
   ```

### Session Issues

**Symptom:** Users getting logged out, session errors

**Diagnosis:**
```bash
# Check session configuration
grep -E "(SESSION_SECRET|session)" .env

# Check if using database session store
psql "$DATABASE_URL" -c "\dt sessions"

# Check session table contents
psql "$DATABASE_URL" -c "SELECT count(*) FROM sessions;"
```

**Solutions:**

1. **Session secret missing/weak:**
   ```bash
   # Generate strong session secret
   echo "SESSION_SECRET=$(openssl rand -base64 64)" >> .env
   pm2 restart supporthub
   ```

2. **Memory session store in cluster mode:**
   ```bash
   # Ensure using database session store for PM2 cluster
   # Check that DATABASE_URL is set and sessions table exists
   psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS sessions (...);"
   ```

### Docker Issues

**Symptom:** Container fails to start or crashes

**Diagnosis:**
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs app

# Check container resources
docker stats

# Inspect container
docker-compose exec app sh
```

**Solutions:**

1. **Container startup failures:**
   ```bash
   # Check Dockerfile syntax
   docker build -f Dockerfile.prod -t supporthub .
   
   # Check environment variables
   docker-compose config
   
   # Restart services
   docker-compose down && docker-compose up -d
   ```

2. **Database connection in Docker:**
   ```bash
   # Ensure correct hostname (service name)
   # Use 'db:5432' not 'localhost:5432' in docker-compose
   
   # Check network connectivity
   docker-compose exec app ping db
   ```

## 🔧 Platform-Specific Issues

### AWS Issues

**EC2 Instance Problems:**
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0

# View system logs
aws ec2 get-console-output --instance-id i-1234567890abcdef0

# Check security groups
aws ec2 describe-security-groups --group-ids sg-12345678
```

**RDS Connection Issues:**
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier supporthub-db

# Test from EC2
telnet supporthub-db.region.rds.amazonaws.com 5432

# Check parameter group
aws rds describe-db-parameters --db-parameter-group-name default.postgres14
```

### Digital Ocean Issues

**Droplet Problems:**
```bash
# Check droplet status
doctl compute droplet list

# View droplet metrics
doctl monitoring alert-policy list

# Check firewall rules
doctl compute firewall list
```

**Managed Database Issues:**
```bash
# Check database status
doctl databases list

# View connection details
doctl databases connection supporthub-db

# Check trusted sources
doctl databases firewalls list supporthub-db
```

### Azure Issues

**App Service Problems:**
```bash
# Check app service status
az webapp show --resource-group rg --name app-name

# View application logs
az webapp log tail --resource-group rg --name app-name

# Check app settings
az webapp config appsettings list --resource-group rg --name app-name
```

**Azure Database Issues:**
```bash
# Check database status
az postgres server show --resource-group rg --name server-name

# View firewall rules
az postgres server firewall-rule list --resource-group rg --server-name server-name

# Check connection strings
az postgres server show-connection-string --server-name server-name --database-name supporthub
```

## 📊 Monitoring and Alerting

### Log Analysis

**Centralized logging:**
```bash
# PM2 logs
pm2 logs --lines 100 --timestamp

# System logs
journalctl -u nginx -f
journalctl -u postgresql -f

# Application-specific logs
tail -f /var/log/supporthub/application.log
```

**Log patterns to watch:**
```bash
# Error patterns
grep -E "(ERROR|FATAL|Exception)" /var/log/supporthub/*.log

# Performance issues
grep -E "(timeout|slow|performance)" /var/log/supporthub/*.log

# Security concerns
grep -E "(unauthorized|forbidden|authentication)" /var/log/nginx/access.log
```

### Health Monitoring Script

```bash
#!/bin/bash
# health-monitor.sh

HEALTH_URL="http://localhost:5000/api/health"
LOG_FILE="/var/log/supporthub/health-monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

check_health() {
    if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
        echo "$(date): ✅ Health check passed" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): ❌ Health check failed" >> "$LOG_FILE"
        return 1
    fi
}

send_alert() {
    echo "SupportHub health check failed at $(date)" | \
    mail -s "SupportHub Alert" "$ALERT_EMAIL"
}

# Run health check
if ! check_health; then
    # Try to restart application
    pm2 restart supporthub
    sleep 30
    
    # Check again
    if ! check_health; then
        send_alert
    fi
fi
```

**Schedule monitoring:**
```bash
# Add to crontab
crontab -e

# Every 5 minutes
*/5 * * * * /usr/local/bin/health-monitor.sh
```

## 🆘 Emergency Recovery

### Application Recovery

**Complete application restart:**
```bash
#!/bin/bash
# emergency-restart.sh

echo "Starting emergency restart..."

# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Kill any remaining processes
sudo pkill -f supporthub

# Start services
sudo systemctl start nginx
pm2 start ecosystem.prod.config.js --env production

# Wait and verify
sleep 30
curl -f http://localhost:5000/api/health

echo "Emergency restart completed"
```

### Database Recovery

**From backup:**
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE="$1"
DB_URL="$DATABASE_URL"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql>"
    exit 1
fi

echo "Restoring database from $BACKUP_FILE..."

# Stop application
pm2 stop supporthub

# Restore database
psql "$DB_URL" < "$BACKUP_FILE"

# Restart application
pm2 start supporthub

echo "Database restoration completed"
```

### Rollback Procedure

**Application rollback:**
```bash
# 1. Stop current application
pm2 stop supporthub

# 2. Restore previous version
tar -xzf backup_previous_version.tar.gz -C /var/www/supporthub

# 3. Restore database if needed
psql "$DATABASE_URL" < backup_previous_db.sql

# 4. Start application
cd /var/www/supporthub
npm install
pm2 start ecosystem.prod.config.js --env production
```

## 📞 Getting Help

### Support Channels

1. **Documentation**: Check platform-specific deployment guides
2. **Logs**: Always include relevant log snippets when asking for help
3. **Community**: Stack Overflow, Reddit r/node, Discord servers
4. **Professional**: Consider hiring a DevOps consultant for complex issues

### Creating Support Tickets

**Information to include:**
1. Platform (AWS, Digital Ocean, Azure, Ubuntu)
2. Deployment method (PM2, Docker, App Service)
3. Error messages and logs
4. Steps to reproduce
5. Environment details (Node.js version, OS, etc.)

**Log collection script:**
```bash
#!/bin/bash
# collect-logs.sh

SUPPORT_DIR="/tmp/supporthub-support-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SUPPORT_DIR"

# Application logs
pm2 logs supporthub --lines 100 > "$SUPPORT_DIR/pm2-logs.txt"

# System information
uname -a > "$SUPPORT_DIR/system-info.txt"
node --version >> "$SUPPORT_DIR/system-info.txt"
npm --version >> "$SUPPORT_DIR/system-info.txt"

# Configuration (sanitized)
cp .env "$SUPPORT_DIR/env-sanitized.txt"
sed -i 's/=.*/=***REDACTED***/g' "$SUPPORT_DIR/env-sanitized.txt"

# Database schema
psql "$DATABASE_URL" -c "\dt" > "$SUPPORT_DIR/db-schema.txt"

# Create archive
tar -czf "$SUPPORT_DIR.tar.gz" -C /tmp "$(basename $SUPPORT_DIR)"

echo "Support package created: $SUPPORT_DIR.tar.gz"
```

This completes the troubleshooting guide. Use this as your first reference when encountering issues with your SupportHub deployment.