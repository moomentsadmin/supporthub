# Production Deployment Guide

This guide covers deploying SupportHub on a Linux server using Docker and Docker Compose.

---

## ⚠️ Database Compatibility Notice

> **SupportHub requires PostgreSQL 14+.**  
> **MySQL and MariaDB are NOT supported.** The application uses Drizzle ORM (PostgreSQL dialect), the `pg` driver, and `connect-pg-simple` — none of which are compatible with MySQL/MariaDB.
>
> For full database setup details, see [database.md](database.md).

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Server OS** | Ubuntu 20.04 / 22.04 LTS (recommended). Minimum **2 vCPU, 2 GB RAM** |
| **Docker Engine** | v24+ (`docker --version`) |
| **Docker Compose** | V2 plugin — use `docker compose` (not `docker-compose`) |
| **Domain** | A domain name with DNS A-record pointing to your server |
| **Ports** | 80 and 443 open in firewall |

---

## 1. Clone & Configure

```bash
# Clone the repository
git clone <repository_url> supporthub
cd supporthub

# Copy and edit environment file
cp .env.example .env
nano .env
```

**Minimum required `.env` values:**
```bash
# Application
NODE_ENV=production
DOMAIN=your-domain.com          # Used for SSL certificate
EMAIL=admin@your-domain.com     # Let's Encrypt notifications

# Security — CRITICAL: generate a strong secret
SESSION_SECRET=$(openssl rand -base64 48)

# Database — see options below
DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub
```

---

## 2. Database Options

### Option A: Internal PostgreSQL (Default — simplest)

The default `compose.production.yml` includes a PostgreSQL 15 container.

- ✅ No extra setup needed
- ✅ Zero cost
- ⚠️ Backups are manual (see section 5)
- ❌ Not suitable for multi-server or high-availability setups

Leave `DATABASE_URL` pointing to the internal container:
```bash
DATABASE_URL=postgresql://supporthub:${POSTGRES_PASSWORD}@db:5432/supporthub
```

Set a strong database password:
```bash
POSTGRES_PASSWORD=your_strong_db_password
POSTGRES_USER=supporthub
POSTGRES_DB=supporthub
```

---

### Option B: External Managed PostgreSQL (Recommended for Production)

Use any of the following managed services. After provisioning, update `.env` and modify `compose.production.yml`.

**AWS RDS for PostgreSQL:**
```bash
DATABASE_URL=postgresql://supporthub:password@your-instance.us-east-1.rds.amazonaws.com:5432/supporthub?sslmode=require
```

**DigitalOcean Managed Database:**
```bash
# Port is 25060, not 5432
DATABASE_URL=postgresql://doadmin:password@db-postgresql-nyc3-xxxxx.a.db.ondigitalocean.com:25060/supporthub?sslmode=require
```

**Azure Database for PostgreSQL (Flexible Server):**
```bash
DATABASE_URL=postgresql://supporthub:password@your-server.postgres.database.azure.com:5432/supporthub?sslmode=require
```

**Self-hosted PostgreSQL on separate server:**
```bash
DATABASE_URL=postgresql://supporthub:password@your.db.server.ip:5432/supporthub?sslmode=require
```

**Update `compose.production.yml` to remove the internal DB:**
```yaml
# Remove the entire 'db' service block and these lines under 'app':
# depends_on:
#   db:
#     condition: service_healthy
```

> 📖 Full managed database setup instructions: [database.md](database.md)

---

## 3. Deployment Commands

### Option A: SSL Production (Recommended — requires a real domain)
Sets up Nginx with automatic Let's Encrypt HTTPS certificates:

```bash
docker compose -f compose.production.yml up -d --build
```

Access: `https://your-domain.com`

---

### Option B: Behind Load Balancer / Reverse Proxy (No SSL termination)
Use when SSL is handled upstream (AWS ALB, Cloudflare, Azure Front Door, etc.):

```bash
docker compose -f compose.nossl.yml up -d --build
```

Access: `http://your-server-ip:5000`

---

### Option C: Local Development
```bash
docker compose -f compose.dev.yml up -d --build
```

Access: `https://localhost` (accept the self-signed certificate warning)

---

## 4. First Run

After deployment:

1. **Access the admin portal:** `https://your-domain.com/admin`
2. **Default credentials:**
   - Admin: `admin@supporthub.com` / `admin123`
   - Agent: `agent@supporthub.com` / `agent123`
3. **Change passwords immediately** — Admin Settings → Admin Users

---

## 5. File Storage Options

By default, uploads are stored in a local Docker volume (`app_uploads`). For multi-server or cloud deployments, use object storage.

**AWS S3:**
```bash
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET=supporthub-uploads
```

**DigitalOcean Spaces (S3-compatible):**
```bash
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=your_spaces_key
AWS_SECRET_ACCESS_KEY=your_spaces_secret
AWS_REGION=nyc3
AWS_BUCKET=my-space-name
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
```

**Azure Blob Storage:**
```bash
STORAGE_PROVIDER=AZURE
AZURE_STORAGE_ACCOUNT_NAME=mystorageaccount
AZURE_STORAGE_ACCOUNT_KEY=your_long_access_key
AZURE_STORAGE_CONTAINER_NAME=supporthub-uploads
```

---

## 6. Backups

### Database

**Internal Docker database:**
```bash
# Backup
docker compose -f compose.production.yml exec db \
    pg_dump -U supporthub supporthub > "backup_$(date +%F_%H%M%S).sql"

# Restore
docker compose -f compose.production.yml exec -T db \
    psql -U supporthub supporthub < backup_2024-01-01.sql
```

**External managed database:**
```bash
# Requires psql client installed on your server
pg_dump "$DATABASE_URL" | gzip > "backup_$(date +%F).sql.gz"
```

**Schedule with cron (daily at 02:00):**
```bash
0 2 * * * cd /path/to/supporthub && docker compose -f compose.production.yml exec -T db pg_dump -U supporthub supporthub | gzip > /backups/db_$(date +\%F).sql.gz
```

### File Uploads (local storage)
```bash
# Backup the Docker volume
docker run --rm \
    -v supporthub_app_uploads:/data \
    -v /backups:/backup \
    alpine tar czf /backup/uploads_$(date +%F).tar.gz -C /data .
```

---

## 7. Updates

```bash
cd /path/to/supporthub

# Pull latest code
git pull

# Rebuild and restart (zero-downtime for DB changes)
docker compose -f compose.production.yml up -d --build

# Schema migrations run automatically on startup
# To run manually:
docker compose -f compose.production.yml exec app npm run db:push
```

---

## 8. Security Hardening

```bash
# Protect .env file
chmod 600 .env

# Verify .env is not in git
grep ".env" .gitignore   # Should show: .env

# Check for exposed ports (only 80 and 443 should be public)
ss -tlnp

# Firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 9. Health Checks & Monitoring

```bash
# Application health
curl https://your-domain.com/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Container status
docker compose -f compose.production.yml ps

# Logs
docker compose -f compose.production.yml logs -f app
docker compose -f compose.production.yml logs -f nginx

# Restart a service
docker compose -f compose.production.yml restart app
```

---

## 10. Full `.env` Reference

```bash
# ─── Core ─────────────────────────────────────────────
NODE_ENV=production
PORT=5000
DOMAIN=your-domain.com
EMAIL=admin@your-domain.com

# ─── Security ─────────────────────────────────────────
# Generate: openssl rand -base64 48
SESSION_SECRET=your_very_long_random_secret
TRUST_PROXY=1

# ─── Database (PostgreSQL only) ────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/supporthub?sslmode=require

# Internal DB only — remove if using external DB
POSTGRES_DB=supporthub
POSTGRES_USER=supporthub
POSTGRES_PASSWORD=your_db_password

# ─── Email ────────────────────────────────────────────
# Option 1: SendGrid
SENDGRID_API_KEY=SG.xxx
VERIFIED_SENDER_EMAIL=noreply@your-domain.com

# Option 2: SMTP
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ─── SMS (Optional) ───────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ─── File Storage ─────────────────────────────────────
STORAGE_PROVIDER=LOCAL   # LOCAL | S3 | AZURE

# AWS S3 / DigitalOcean Spaces
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET=
S3_ENDPOINT=             # Only for DO Spaces / MinIO

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONTAINER_NAME=supporthub-uploads
```

---

## Production Checklist

- [ ] `SESSION_SECRET` set to a strong random value (`openssl rand -base64 48`)
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` with `?sslmode=require` for external DB
- [ ] Default admin/agent passwords changed after first login
- [ ] `.env` has permissions `600` and is excluded from git
- [ ] Firewall allows only 22, 80, 443
- [ ] SSL certificate active (HTTPS working)
- [ ] Automated database backups configured
- [ ] Email service configured (SendGrid or SMTP)
