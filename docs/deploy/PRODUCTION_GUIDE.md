# SupportHub — Production Deployment Guide

## Choose Your Setup

| | **With SSL (Let's Encrypt)** | **Without SSL (Behind Proxy)** |
|---|---|---|
| **Internal DB** (Docker) | [Path A](#path-a--ssl--internal-db) | [Path C](#path-c--no-ssl--internal-db) |
| **Managed DB** (RDS / Azure / DO) | [Path B](#path-b--ssl--managed-db) | [Path D](#path-d--no-ssl--managed-db) |

- **With SSL** — Nginx + Let's Encrypt managed automatically. Use when the server is directly internet-facing.
- **Without SSL** — App runs on port `5000`. Use when terminating SSL at a reverse proxy (Nginx Proxy Manager, Traefik, Cloudflare Tunnel, AWS ALB).
- **Internal DB** — PostgreSQL runs as a Docker container alongside the app. Zero extra cost, simplest setup.
- **Managed DB** — External PostgreSQL (AWS RDS, Azure Database, DigitalOcean Managed DB). Recommended for high availability and automated backups.

---

## Prerequisites

- **Server**: Ubuntu 20.04/22.04 LTS — minimum 2 vCPU, 4 GB RAM
- **Software**: Docker Engine + Docker Compose V2, Git
- **Domain**: A domain name with DNS pointing to your server IP (required for SSL paths)

```bash
# Install Docker (one-liner)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

---

## Step 1 — Clone the Repository

```bash
git clone <repository_url> supporthub
cd supporthub
cp .env.example .env
```

---

## Step 2 — Configure `.env`

Open `.env` and fill in the required values. The file is split into sections:

### 2a — Application (always required)

```env
NODE_ENV=production
DOMAIN=yourdomain.com          # Your domain (used by Nginx for SSL)
EMAIL=you@yourdomain.com       # Let's Encrypt expiry notifications
SESSION_SECRET=                # Generate: openssl rand -base64 48
TRUST_PROXY=1                  # Required when behind Nginx or any proxy
```

### 2b — Database (choose ONE option)

**Option 1 — Internal Docker PostgreSQL (default)**

```env
POSTGRES_USER=supporthub
POSTGRES_PASSWORD=             # Generate: openssl rand -base64 32
POSTGRES_DB=supporthub
DATABASE_URL=postgresql://supporthub:<same-password>@db:5432/supporthub
```

> The `DATABASE_URL` host must be `db` (the Docker service name) when using internal DB.

**Option 2 — Managed PostgreSQL (AWS RDS / Azure / DigitalOcean)**

```env
# Leave POSTGRES_* vars empty or remove them
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>?sslmode=require
```

Connection string examples:

```env
# AWS RDS
DATABASE_URL=postgresql://postgres:password@mydb.us-east-1.rds.amazonaws.com:5432/supporthub?sslmode=require

# Azure Database for PostgreSQL (Flexible Server)
DATABASE_URL=postgresql://adminuser:password@myserver.postgres.database.azure.com:5432/supporthub?sslmode=require

# DigitalOcean Managed Database
DATABASE_URL=postgresql://doadmin:password@db-postgresql-nyc3-12345.a.db.ondigitalocean.com:25060/supporthub?sslmode=require
```

### 2c — Storage (choose ONE option, LOCAL is default)

```env
STORAGE_PROVIDER=LOCAL         # Options: LOCAL, S3, AZURE

# AWS S3
# STORAGE_PROVIDER=S3
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# AWS_BUCKET=your-bucket

# DigitalOcean Spaces (S3-compatible)
# STORAGE_PROVIDER=S3
# AWS_ACCESS_KEY_ID=your_spaces_key
# AWS_SECRET_ACCESS_KEY=your_spaces_secret
# AWS_REGION=nyc3
# AWS_BUCKET=your-space-name
# S3_ENDPOINT=https://nyc3.digitaloceanspaces.com

# Azure Blob Storage
# STORAGE_PROVIDER=AZURE
# AZURE_STORAGE_ACCOUNT_NAME=mystorageaccount
# AZURE_STORAGE_ACCOUNT_KEY=your_long_key
# AZURE_STORAGE_CONTAINER_NAME=supporthub-uploads
```

---

## Path A — SSL + Internal DB

Uses `compose.production.yml`. Nginx handles HTTPS with auto-renewing Let's Encrypt certificates. PostgreSQL runs as a Docker container.

**`.env` checklist:**
- `DOMAIN` set to your real domain
- `EMAIL` set to a real email
- `POSTGRES_PASSWORD` set
- `DATABASE_URL` host is `db`
- `SESSION_SECRET` set

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script:
1. Builds all containers
2. Runs database migrations
3. Initializes SSL certificate via Certbot
4. Starts auto-renewal (every 12 hours)

**App available at:** `https://yourdomain.com`

---

## Path B — SSL + Managed DB

Same as Path A, but the PostgreSQL container is removed.

**Edit `compose.production.yml`** — make these two changes:

1. Delete the entire `db:` service block (lines starting with `db:` through the healthcheck)
2. In the `app:` service, change:
   ```yaml
   # Remove this line:
   depends_on:
     db:
       condition: service_healthy

   # And replace the hardcoded DATABASE_URL with:
   DATABASE_URL: ${DATABASE_URL}
   ```

**`.env` checklist:**
- `DOMAIN`, `EMAIL`, `SESSION_SECRET` set
- `DATABASE_URL` points to your managed DB with `?sslmode=require`
- No `POSTGRES_*` vars needed

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**App available at:** `https://yourdomain.com`

---

## Path C — No-SSL + Internal DB

Uses `compose.nossl.yml`. No Nginx, no Certbot. The app exposes port `5000` directly. Your reverse proxy (Nginx Proxy Manager, Traefik, Cloudflare Tunnel, etc.) handles SSL termination upstream.

**`.env` checklist:**
- `POSTGRES_PASSWORD` set
- `DATABASE_URL` host is `db`
- `SESSION_SECRET` set
- `DOMAIN` / `EMAIL` not required

```bash
chmod +x scripts/deploy-nossl.sh
./scripts/deploy-nossl.sh
```

**Point your proxy to:** `http://<server-ip>:5000`

### Nginx Proxy Manager

1. Add a Proxy Host
2. **Domain Names**: `yourdomain.com`
3. **Scheme**: `http` | **Forward Hostname/IP**: `<server-ip>` | **Forward Port**: `5000`
4. Enable SSL → Request Let's Encrypt certificate

### Traefik (docker-compose label example)

Add these labels to the `app` service in `compose.nossl.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.supporthub.rule=Host(`yourdomain.com`)"
  - "traefik.http.routers.supporthub.entrypoints=websecure"
  - "traefik.http.routers.supporthub.tls.certresolver=letsencrypt"
  - "traefik.http.services.supporthub.loadbalancer.server.port=5000"
```

---

## Path D — No-SSL + Managed DB

Same as Path C, but the internal PostgreSQL container is removed.

**Edit `compose.nossl.yml`** — make the same two changes as Path B:

1. Delete the `db:` service block
2. In the `app:` service, remove `depends_on` and change `DATABASE_URL` to `${DATABASE_URL}`

**`.env` checklist:**
- `DATABASE_URL` points to your managed DB with `?sslmode=require`
- `SESSION_SECRET` set
- No `POSTGRES_*` vars needed

```bash
chmod +x scripts/deploy-nossl.sh
./scripts/deploy-nossl.sh
```

**Point your proxy to:** `http://<server-ip>:5000`

---

## Step 3 — First Login

| Portal | URL | Default Email | Default Password |
|--------|-----|--------------|-----------------|
| **Admin** | `/admin` | `admin@supporthub.com` | `admin123` |
| **Agent** | `/` | `agent@example.com` | `password123` |

> ⚠️ **Change these passwords immediately** from the Admin panel after first login.

---

## Maintenance

### View logs

```bash
# SSL deployment
docker compose -f compose.production.yml logs -f app

# No-SSL deployment
docker compose -f compose.nossl.yml logs -f app
```

### Update the application

```bash
git pull
./scripts/deploy.sh          # SSL
# or
./scripts/deploy-nossl.sh    # No-SSL
```

The deploy scripts rebuild containers and re-run migrations automatically.

### Backup database (internal DB only)

```bash
# Create backup
docker compose exec db pg_dump -U supporthub supporthub > backup_$(date +%F).sql

# Restore backup
docker compose exec -T db psql -U supporthub supporthub < backup_YYYY-MM-DD.sql
```

For managed databases, use your provider's native backup tools (RDS automated backups, DO scheduled backups, Azure backup).

### Run migrations manually

```bash
docker compose -f compose.production.yml exec app npm run db:push
# or
docker compose -f compose.nossl.yml exec app npm run db:push
```

### Restart a service

```bash
docker compose -f compose.production.yml restart app
```

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Must be `production` |
| `DOMAIN` | SSL only | Domain name (e.g. `mysite.com`) |
| `EMAIL` | SSL only | Email for Let's Encrypt notifications |
| `SESSION_SECRET` | Yes | Random secret (min 32 chars) |
| `TRUST_PROXY` | Yes | Set to `1` when behind any proxy/Nginx |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `POSTGRES_USER` | Internal DB | DB username (default: `supporthub`) |
| `POSTGRES_PASSWORD` | Internal DB | DB password — **must be set** |
| `POSTGRES_DB` | Internal DB | DB name (default: `supporthub`) |
| `STORAGE_PROVIDER` | No | `LOCAL` (default), `S3`, or `AZURE` |
| `SENDGRID_API_KEY` | No | For email notifications via SendGrid |
| `SMTP_HOST` | No | For email via SMTP |
| `TWILIO_ACCOUNT_SID` | No | For SMS via Twilio |
| `WHATSAPP_ACCESS_TOKEN` | No | For WhatsApp channel |

For the full list see `.env.example`.
