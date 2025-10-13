# Docker Production Deployment Guide

Complete guide for deploying SupportHub using Docker on any production server.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Domain name (optional, for production URLs)

### Install Docker (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install required packages
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/supporthub.git
cd supporthub
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.docker.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```env
# Database Configuration
POSTGRES_DB=supporthub
POSTGRES_USER=supporthub
POSTGRES_PASSWORD=ChangeMeToStrongPassword123!

# Application Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=ChangeThisToRandomString456!

# Database Connection (for internal database)
DATABASE_URL=postgresql://supporthub:ChangeMeToStrongPassword123!@db:5432/supporthub
```

### 3. Deploy with Internal Database
```bash
# Build and start all services
docker compose -f compose.internal-db.yml up -d --build

# View logs
docker compose -f compose.internal-db.yml logs -f
```

### 4. Verify Deployment
```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### 5. Access Application
- **URL**: http://your-server-ip:5000
- **Admin Login**: http://your-server-ip:5000/admin/login
  - Email: `admin@supporthub.com`
  - Password: `admin123`

---

## Deployment Options

### Option A: Internal Database (Recommended)
Uses Docker Compose to run both app and PostgreSQL database.

```bash
docker compose -f compose.internal-db.yml up -d --build
```

**Pros:**
- Simple setup
- Everything in one place
- Automatic database initialization
- Easy backup and restore

**Cons:**
- Database shares server resources
- Limited scalability

### Option B: External Database
Uses external PostgreSQL database (AWS RDS, Azure Database, etc.)

```bash
# Edit .env with external database URL
DATABASE_URL=postgresql://user:pass@external-host:5432/dbname

# Deploy app only
docker compose -f compose.external-db.yml up -d --build
```

**Pros:**
- Separate database resources
- Better scalability
- Managed database services

**Cons:**
- Requires external database setup
- Additional costs

---

## Configuration

### Environment Variables Reference

#### Required Variables
```env
# Database
POSTGRES_DB=supporthub                    # Database name
POSTGRES_USER=supporthub                  # Database username
POSTGRES_PASSWORD=your_password           # Database password
DATABASE_URL=postgresql://...             # Full connection string

# Application
NODE_ENV=production                       # Environment mode
PORT=5000                                 # Application port
SESSION_SECRET=random_string              # Session encryption key
```

#### Optional Variables
```env
# Email Configuration (SendGrid)
SENDGRID_API_KEY=SG.xxx                  # SendGrid API key
VERIFIED_SENDER_EMAIL=noreply@domain.com # Verified sender email

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=ACxxx                 # Twilio account SID
TWILIO_AUTH_TOKEN=xxx                    # Twilio auth token
TWILIO_PHONE_NUMBER=+1234567890          # Twilio phone number

# Object Storage (Optional)
GCS_BUCKET_NAME=your-bucket              # Google Cloud Storage bucket
GCS_PROJECT_ID=your-project-id           # GCP project ID
```

### Generate Secure Secrets
```bash
# Generate random session secret
openssl rand -hex 32

# Generate random database password
openssl rand -base64 24
```

---

## Database Setup

### Internal Database

#### Initialize Database
Database is automatically initialized on first run. Tables are created by Drizzle ORM.

#### Backup Database
```bash
# Create backup
docker compose -f compose.internal-db.yml exec db pg_dump -U supporthub supporthub > backup.sql

# Restore backup
docker compose -f compose.internal-db.yml exec -T db psql -U supporthub supporthub < backup.sql
```

#### Access Database Console
```bash
docker compose -f compose.internal-db.yml exec db psql -U supporthub -d supporthub
```

### External Database

#### Supported Databases
- PostgreSQL 12+
- AWS RDS PostgreSQL
- Azure Database for PostgreSQL
- Google Cloud SQL PostgreSQL

#### Connection String Format
```
postgresql://username:password@hostname:port/database?sslmode=require
```

#### SSL Configuration
For production databases, enable SSL:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

---

## SSL/HTTPS Setup

### Option 1: Nginx Reverse Proxy with Let's Encrypt

#### Install Nginx
```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

#### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/supporthub
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
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

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 2: Cloudflare SSL
1. Point your domain to server IP
2. Enable Cloudflare proxy (orange cloud)
3. SSL/TLS mode: "Full" or "Full (strict)"

---

## Monitoring & Logs

### View Logs
```bash
# All services
docker compose -f compose.internal-db.yml logs -f

# App only
docker compose -f compose.internal-db.yml logs -f app

# Database only
docker compose -f compose.internal-db.yml logs -f db

# Last 100 lines
docker compose -f compose.internal-db.yml logs --tail=100 app
```

### Container Status
```bash
# Check running containers
docker compose -f compose.internal-db.yml ps

# Check resource usage
docker stats
```

### Health Checks
```bash
# Application health
curl http://localhost:5000/api/health

# Database health
docker compose -f compose.internal-db.yml exec db pg_isready -U supporthub
```

### Log Rotation
Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

---

## Troubleshooting

### Container Keeps Restarting

**Check logs:**
```bash
docker compose -f compose.internal-db.yml logs app
```

**Common causes:**
- Wrong DATABASE_URL format
- Database not ready
- Port already in use
- Missing environment variables

### Database Connection Errors

**Error:** `ECONNREFUSED 172.18.0.2:443`

**Solution:** Wrong DATABASE_URL format. For local Docker database use:
```env
DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub
```

NOT Neon HTTP format:
```env
DATABASE_URL=https://... (WRONG for Docker)
```

**Error:** `password authentication failed`

**Solution:** Ensure POSTGRES_PASSWORD matches password in DATABASE_URL

### Port Already in Use

**Check what's using port 5000:**
```bash
sudo lsof -i :5000
```

**Solution:** Stop the service or change port in docker-compose.yml

### Out of Memory

**Check memory usage:**
```bash
docker stats
```

**Solution:** Increase server RAM or add swap space:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Build Fails

**Clear Docker cache and rebuild:**
```bash
docker compose -f compose.internal-db.yml down -v
docker system prune -a -f
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d
```

---

## Maintenance Commands

### Update Application
```bash
cd supporthub
git pull origin main
docker compose -f compose.internal-db.yml down
docker compose -f compose.internal-db.yml build --no-cache
docker compose -f compose.internal-db.yml up -d
```

### Restart Services
```bash
# Restart all
docker compose -f compose.internal-db.yml restart

# Restart app only
docker compose -f compose.internal-db.yml restart app
```

### Stop Services
```bash
docker compose -f compose.internal-db.yml stop
```

### Remove Everything
```bash
# Remove containers and networks (keeps data)
docker compose -f compose.internal-db.yml down

# Remove everything including volumes (deletes data!)
docker compose -f compose.internal-db.yml down -v
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

---

## Security Best Practices

### 1. Change Default Passwords
```bash
# Generate strong passwords
openssl rand -base64 32
```

### 2. Use Firewall
```bash
# Install UFW
sudo apt-get install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 3. Regular Updates
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Update Docker images
docker compose -f compose.internal-db.yml pull
docker compose -f compose.internal-db.yml up -d
```

### 4. Backup Strategy
```bash
# Daily database backup (add to crontab)
0 2 * * * docker compose -f /path/to/supporthub/compose.internal-db.yml exec db pg_dump -U supporthub supporthub > /backups/supporthub_$(date +\%Y\%m\%d).sql
```

### 5. Monitor Access
```bash
# Check failed login attempts
docker compose -f compose.internal-db.yml logs app | grep "authentication failed"
```

---

## Performance Optimization

### 1. Enable Gzip Compression (Nginx)
Add to nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Connection Pooling
Already configured in application. Default pool size: 10 connections.

### 3. Database Indexing
Indexes are automatically created by Drizzle ORM on frequently queried fields.

### 4. Caching Headers
Add to nginx config:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Support

### Common Issues
- Check the [Troubleshooting](#troubleshooting) section
- Review logs: `docker compose logs -f`
- Verify environment variables: `docker compose config`

### Resources
- GitHub Repository: https://github.com/YOUR_USERNAME/supporthub
- Docker Documentation: https://docs.docker.com
- PostgreSQL Documentation: https://www.postgresql.org/docs

---

## Quick Reference

### Essential Commands
```bash
# Start
docker compose -f compose.internal-db.yml up -d

# Stop
docker compose -f compose.internal-db.yml down

# Logs
docker compose -f compose.internal-db.yml logs -f app

# Restart
docker compose -f compose.internal-db.yml restart app

# Update
git pull && docker compose -f compose.internal-db.yml up -d --build

# Backup DB
docker compose -f compose.internal-db.yml exec db pg_dump -U supporthub supporthub > backup.sql
```

### Default Credentials
- **Admin Email**: admin@supporthub.com
- **Admin Password**: admin123
- **Database User**: supporthub
- **Database Name**: supporthub

**⚠️ Change these in production!**

---

**Your SupportHub application is now ready for production deployment!** 🚀
