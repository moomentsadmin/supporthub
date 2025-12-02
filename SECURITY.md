# Security Best Practices & Configuration

## Overview

This document outlines the security features implemented in SupportHub and best practices for maintaining a secure production deployment.

## Authentication & Authorization

### Session Management
- **Session Storage**: PostgreSQL-backed sessions (production) or memory store (development)
- **Session Duration**: 8 hours maximum
- **Session Security**: 
  - `httpOnly: true` - Prevents JavaScript access to cookies
  - `secure: true` - HTTPS-only in production
  - `sameSite: 'lax'` - CSRF protection
  - Strong session secret (minimum 64 characters)

### Password Security
- **Hashing Algorithm**: bcrypt with 10 rounds
- **Password Requirements**: Implement strong password policies
- **Default Passwords**: Must be changed immediately after deployment

**Critical**: Change these default credentials in production:
```
Admin: admin@supporthub.com / admin123
Agent: agent@supporthub.com / password123
```

### Role-Based Access Control (RBAC)
- **Admin**: Full system access
- **Agent**: Ticket management, customer communication
- **Customer**: View own tickets only

## Database Security

### Connection Security
- **SSL/TLS Required**: Always use `?sslmode=require` in production DATABASE_URL
- **Connection Pooling**: Limits concurrent connections
- **Parameterized Queries**: Drizzle ORM prevents SQL injection

### Example Secure Database URL:
```bash
# ✅ Correct - SSL enabled
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# ❌ Wrong - No SSL
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Data Protection
- **Sensitive Data**: Passwords hashed, tokens encrypted
- **Audit Logging**: All administrative actions logged
- **Soft Deletes**: Consider implementing for data recovery

## Network Security

### HTTPS/TLS Configuration

**Nginx SSL Settings** (already configured in `nginx/conf.d/supporthub.conf`):
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

**Security Headers** (already configured):
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Firewall Configuration

**Ubuntu/Debian UFW**:
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

**AWS Security Group**:
- Inbound: 22 (SSH from your IP only), 80 (HTTP), 443 (HTTPS)
- Outbound: All traffic (for external API calls)

**Azure Network Security Group**:
- Same rules as AWS
- Restrict SSH to known IP ranges

## Rate Limiting

### Implementation
Rate limiting middleware is available in `server/rate-limiter.ts`.

### Usage Examples:

```typescript
import { rateLimiters } from './rate-limiter';

// Protect login endpoint
app.post('/api/admin/login', rateLimiters.auth, loginHandler);

// Protect API routes
app.use('/api/', rateLimiters.api);

// Protect ticket creation
app.post('/api/tickets', rateLimiters.ticketCreation, createTicketHandler);
```

### Recommended Limits:
- **Authentication**: 5 attempts per 15 minutes
- **API Calls**: 100 requests per minute
- **Ticket Creation**: 10 tickets per hour
- **General Routes**: 1000 requests per 15 minutes

## Input Validation

### Zod Schema Validation
All user inputs are validated using Zod schemas before processing.

**Example**:
```typescript
import { insertTicketSchema } from '@shared/schema';

const validatedData = insertTicketSchema.parse(req.body);
```

### File Upload Security
- **File Type Validation**: Only allowed MIME types
- **File Size Limits**: Configured in multer
- **Filename Sanitization**: Prevents path traversal attacks
- **Virus Scanning**: Consider adding ClamAV in production

## Environment Variables

### Critical Variables
Must be set and secured in production:

```bash
# REQUIRED
SESSION_SECRET=<64+ character random string>
DATABASE_URL=postgresql://...?sslmode=require
NODE_ENV=production

# API Keys (if using services)
SENDGRID_API_KEY=<your-key>
TWILIO_AUTH_TOKEN=<your-token>
```

### Secret Management

**Development**: `.env` file (never commit!)

**Production Options**:
1. **Environment Variables**: Set directly on server
2. **Docker Secrets**: For Docker deployments
3. **Cloud Secret Managers**:
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Cloud Secret Manager
   - HashiCorp Vault

**Example using AWS Secrets Manager**:
```bash
# Install AWS CLI and configure
aws secretsmanager get-secret-value --secret-id supporthub/prod/session-secret
```

## Audit Logging

### What's Logged
All administrative actions are logged to `audit_logs` table:
- User authentication (login/logout)
- Ticket operations (create, update, delete)
- Channel configuration changes
- Agent and admin management
- System settings changes

### Log Retention
- **Recommendation**: Retain logs for 90+ days
- **Compliance**: Adjust based on regulatory requirements (GDPR, HIPAA, etc.)

### Log Analysis
```sql
-- Failed login attempts
SELECT * FROM audit_logs 
WHERE action = 'login' AND success = false
ORDER BY created_at DESC LIMIT 100;

-- Recent admin actions
SELECT * FROM audit_logs
WHERE user_type = 'admin'
ORDER BY created_at DESC LIMIT 50;
```

## Security Headers

### Configured Headers
Already implemented in Nginx configuration:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Content Security Policy (CSP)
Consider adding for enhanced security:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## Dependency Security

### Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Automated Security Scanning
Consider implementing:
- **Dependabot** (GitHub)
- **Snyk**
- **OWASP Dependency-Check**

## Backup & Disaster Recovery

### Database Backups

**Automated Daily Backup Script**:
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="supporthub"

pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$TIMESTAMP.sql
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
```

**Cron Job** (runs daily at 2 AM):
```bash
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

### File Backups
Back up uploaded files regularly:
```bash
rsync -av /app/uploads /backups/uploads/
```

### Disaster Recovery Plan
1. **Backup Storage**: Store backups off-server (S3, Azure Blob, etc.)
2. **Recovery Testing**: Test restore process quarterly
3. **RTO/RPO**: Define Recovery Time Objective and Recovery Point Objective
4. **Documentation**: Document recovery procedures

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor logs and alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze logs and determine scope
4. **Eradication**: Remove threat and patch vulnerabilities
5. **Recovery**: Restore systems and verify security
6. **Lessons Learned**: Document and improve processes

### Security Contacts
Document emergency contacts:
- **Security Team Lead**: _________________
- **Infrastructure Manager**: _________________
- **Cloud Provider Support**: _________________

## Monitoring & Alerting

### What to Monitor
- Failed login attempts (>5 in 15 minutes)
- Database connection failures
- Disk space usage (>80%)
- Memory usage (>85%)
- Application errors (500 responses)
- SSL certificate expiration (<30 days)

### Monitoring Tools
- **Application**: PM2 monitoring, custom alerts
- **Server**: Netdata, Prometheus, Datadog
- **Uptime**: UptimeRobot, Pingdom
- **Log Analysis**: ELK Stack, Splunk, CloudWatch

### Alert Configuration
```javascript
// PM2 alert example
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## Compliance Considerations

### GDPR (EU)
- **Right to Access**: Implement data export
- **Right to Deletion**: Implement account deletion
- **Data Portability**: Export user data in standard format
- **Privacy Policy**: Publish and link in footer

### HIPAA (Healthcare)
- **Encryption**: At rest and in transit
- **Audit Logs**: Comprehensive logging
- **Access Controls**: Strict RBAC
- **BAA**: Business Associate Agreement with vendors

### PCI DSS (Payment Cards)
- **Scope**: If processing payments
- **Requirements**: Encryption, access controls, monitoring

## Security Checklist

- [ ] Strong SESSION_SECRET (64+ characters)
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] Database connections use SSL
- [ ] Default passwords changed
- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] SSH key-based authentication
- [ ] Root login disabled
- [ ] Automatic security updates enabled
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Regular backups scheduled
- [ ] Backup restoration tested
- [ ] SSL certificates auto-renewing
- [ ] Dependencies regularly updated
- [ ] Security monitoring configured
- [ ] Incident response plan documented

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Nginx Security](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)

## Support

For security issues or questions:
- **Email**: security@yourdomain.com
- **Security Disclosure**: Follow responsible disclosure policy
- **Emergency**: Contact immediately for critical vulnerabilities

---

**Last Updated**: November 26, 2025
**Review Schedule**: Quarterly
