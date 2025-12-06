# SupportHub Production Deployment Guide

## Quick Start

Deploy SupportHub in **5 minutes** with one command:

```bash
cd ~/supporthub
sudo bash deploy-production.sh
```

The script will ask you:
1. **Domain name** (e.g., hub.cloudnext.co)
2. **Enable HTTPS?** (yes/no)
3. **Email** (if HTTPS enabled, for SSL notifications)

That's it! The script handles everything automatically.

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04/22.04 or Debian 11/12
- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum
- **Disk**: 20GB minimum
- **Network**: Public IP address

### Before Deployment

1. **Install Docker**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

2. **Configure DNS** (if using HTTPS):
```bash
# Add A record pointing to your server IP
hub.cloudnext.co → A → YOUR_SERVER_IP

# Verify DNS:
nslookup hub.cloudnext.co
```

3. **Configure Firewall**:
```bash
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS  
sudo ufw allow 22/tcp   # SSH
sudo ufw enable
```

4. **Clone Repository**:
```bash
cd ~
git clone https://github.com/moomentsadmin/supporthub.git
cd supporthub
```

---

## Deployment

### Option 1: HTTP Only (Simple)
```bash
sudo bash deploy-production.sh
# Enter domain: hub.cloudnext.co
# Enable HTTPS? n
```

**Access**: `http://hub.cloudnext.co`

### Option 2: HTTPS with Let's Encrypt (Recommended)
```bash
sudo bash deploy-production.sh
# Enter domain: hub.cloudnext.co
# Enable HTTPS? y
# Enter email: admin@yourdomain.com
```

**Access**: `https://hub.cloudnext.co`

---

## Post-Deployment

### 1. Login and Change Password

**Default Credentials**:
- Email: `admin@supporthub.com`
- Password: `admin123`

**⚠️ CRITICAL**: Change this password immediately after first login!

### 2. Configure Channels

Go to Admin → Channels and set up:
- **Email** (requires SendGrid API key)
- **SMS** (requires Twilio credentials)
- **WhatsApp** (requires Twilio credentials)
- **Web Chat** (automatically available)

### 3. Add Agents

Go to Admin → Agents:
- Add agent accounts
- Assign to channels
- Set permissions

---

## Management

### View Logs
```bash
# All services
docker compose -f compose.internal-db.yml logs -f

# Specific service
docker compose -f compose.internal-db.yml logs -f app
docker compose -f compose.internal-db.yml logs -f nginx
docker compose -f compose.internal-db.yml logs -f db
```

### Check Status
```bash
docker compose -f compose.internal-db.yml ps
```

### Restart Services
```bash
# All services
docker compose -f compose.internal-db.yml restart

# Specific service
docker compose -f compose.internal-db.yml restart app
docker compose -f compose.internal-db.yml restart nginx
```

### Stop Services
```bash
docker compose -f compose.internal-db.yml down
```

### Start Services
```bash
docker compose -f compose.internal-db.yml up -d
```

---

## Backup & Restore

### Backup Database
```bash
# Create backup
docker exec supporthub-db-1 pg_dump -U supporthub supporthub > backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz -C $(docker volume inspect supporthub_app_uploads -f '{{.Mountpoint}}') .
```

### Restore Database
```bash
# Restore from backup
cat backup-20241205.sql | docker exec -i supporthub-db-1 psql -U supporthub supporthub

# Restore uploads
tar -xzf uploads-backup-20241205.tar.gz -C $(docker volume inspect supporthub_app_uploads -f '{{.Mountpoint}}')
```

---

## Updating

```bash
cd ~/supporthub
git pull origin main

# Rebuild and restart
docker compose -f compose.internal-db.yml down
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d
```

---

## Troubleshooting

### Application Not Loading

**Check services**:
```bash
docker compose -f compose.internal-db.yml ps
```

**Check logs**:
```bash
docker compose -f compose.internal-db.yml logs app
```

**Test health endpoint**:
```bash
curl http://localhost/api/health
```

### HTTPS Not Working

**Verify certificate exists**:
```bash
docker compose -f compose.internal-db.yml run --rm certbot certificates
```

**Check nginx config**:
```bash
docker compose -f compose.internal-db.yml exec nginx nginx -t
```

**Verify DNS**:
```bash
nslookup your-domain.com
# Should return your server IP
```

### Database Connection Issues

**Connect to database**:
```bash
docker exec -it supporthub-db-1 psql -U supporthub -d supporthub
```

**Check tables**:
```sql
\dt
```

### Port Already in Use

**Find what's using port 80**:
```bash
sudo netstat -tlnp | grep :80
```

**Stop conflicting service**:
```bash
sudo systemctl stop nginx  # if system nginx running
sudo systemctl stop apache2  # if Apache running
```

---

## Security Best Practices

1. **Change Default Password** - First thing after deployment
2. **Use HTTPS** - Always use SSL in production
3. **Regular Backups** - Schedule daily database backups
4. **Update Regularly** - Pull latest security patches
5. **Monitor Logs** - Check logs regularly for suspicious activity
6. **Firewall** - Only allow necessary ports (80, 443, 22)
7. **Strong Passwords** - Enforce strong passwords for all users

---

## Environment Variables

Edit `.env` file to configure:

```bash
# Application
NODE_ENV=production
PORT=5000

# Security
SESSION_SECRET=<random-secret>

# Database (Internal)
DB_PASSWORD=<secure-password>

# Email (Optional)
VERIFIED_SENDER_EMAIL=support@yourdomain.com
SENDGRID_API_KEY=your_key

# SMS/WhatsApp (Optional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

After changing .env:
```bash
docker compose -f compose.internal-db.yml restart
```

---

## External Database

To use external PostgreSQL (Neon, AWS RDS, Azure, etc.):

1. **Update .env**:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

2. **Use external-db compose file**:
```bash
docker compose -f compose.external-db.yml up -d
```

---

## Support

- **Documentation**: See `README.md`
- **Issues**: https://github.com/moomentsadmin/supporthub/issues
- **Logs**: `docker compose -f compose.internal-db.yml logs`

---

## Architecture

```
┌─────────────┐
│   Nginx     │ Port 80/443 (Reverse Proxy + SSL)
└──────┬──────┘
       │
┌──────▼──────┐
│  SupportHub │ Port 5000 (Node.js/Express)
│     App     │
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │ Port 5432 (Internal)
│  Database   │
└─────────────┘
```

---

## License

See LICENSE file

---

**Last Updated**: December 2025  
**Version**: 1.0
