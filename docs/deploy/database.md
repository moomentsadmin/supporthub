# Database Configuration Guide

Comprehensive guide for configuring SupportHub with various database providers.

---

## ⚠️ Supported Database: PostgreSQL Only

> **Important:** SupportHub supports **PostgreSQL only** (version 14+).  
> **MySQL and MariaDB are not supported** — the application uses Drizzle ORM compiled against the PostgreSQL dialect, the `pg` driver, `@neondatabase/serverless`, and `connect-pg-simple` for session storage. None of these are compatible with MySQL/MariaDB.

If you need MySQL/MariaDB support, it would require replacing the ORM dialect, session store, and all driver dependencies — which is a significant engineering effort not included in this release.

---

## 🗄️ Database Options Overview

### ✅ Managed PostgreSQL Services (Recommended for Production)

| Provider | Notes |
|---|---|
| **AWS RDS for PostgreSQL** | Fully managed, Multi-AZ, automated backups |
| **DigitalOcean Managed Databases** | Simple setup, automated maintenance |
| **Azure Database for PostgreSQL** | Flexible Server (recommended), Single Server (legacy) |
| **Google Cloud SQL for PostgreSQL** | Global availability, auto-scaling |
| **Supabase** | PostgreSQL-as-a-service with generous free tier |
| **Neon** | Serverless PostgreSQL, free tier available |

### ✅ Self-Hosted PostgreSQL

| Option | Notes |
|---|---|
| **Local PostgreSQL 14+** | Full control, ideal for on-prem / development |
| **Docker PostgreSQL** | Containerised, ships inside `compose.production.yml` by default |
| **VPS/Bare Metal PostgreSQL** | Custom server installation |

---

## 📋 Managed Database Setup

### 1. AWS RDS for PostgreSQL

**Minimum recommended instance:** `db.t3.micro` (development), `db.t3.small` or `db.t3.medium` (production)

**Connection string format:**
```bash
DATABASE_URL=postgresql://supporthub:YourPassword@your-instance.region.rds.amazonaws.com:5432/supporthub?sslmode=require
```

**Create via AWS CLI:**
```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier supporthub-db \
    --db-instance-class db.t3.small \
    --engine postgres \
    --engine-version 15 \
    --master-username supporthub \
    --master-user-password YourSecurePassword123! \
    --allocated-storage 20 \
    --storage-encrypted \
    --vpc-security-group-ids sg-xxxxxxxx \
    --db-name supporthub

# Wait for instance to be available
aws rds wait db-instance-available --db-instance-identifier supporthub-db

# Get the endpoint
aws rds describe-db-instances \
    --db-instance-identifier supporthub-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

**Enable Multi-AZ for high availability (production):**
```bash
aws rds modify-db-instance \
    --db-instance-identifier supporthub-db \
    --multi-az \
    --backup-retention-period 14 \
    --preferred-backup-window "02:00-03:00" \
    --apply-immediately
```

**Security group configuration:**
- Inbound: Port `5432` from your app server's security group (not `0.0.0.0/0`)
- SSL: Required via `?sslmode=require` in the connection string

---

### 2. DigitalOcean Managed Databases (PostgreSQL)

**Minimum recommended plan:** `db-s-1vcpu-1gb` (development), `db-s-1vcpu-2gb` (production)

**Connection string format:**
```bash
# From DO dashboard → Databases → Connection Details → URI
DATABASE_URL=postgresql://doadmin:password@db-postgresql-nyc3-xxxxx.a.db.ondigitalocean.com:25060/supporthub?sslmode=require
```

> **Note:** DigitalOcean uses port **25060** (not the standard 5432). The connection string from the dashboard is pre-configured correctly.

**Create via `doctl` CLI:**
```bash
# Create managed database cluster
doctl databases create supporthub-db \
    --engine pg \
    --version 15 \
    --region nyc1 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1

# Get connection URI
doctl databases connection supporthub-db --format URI

# Create a named database (optional — use instead of defaultdb)
doctl databases db create supporthub-db supporthub

# Restrict access to your Droplet
doctl databases firewalls append supporthub-db \
    --rule type:droplet,value:your-droplet-id
```

**Create database user:**
```bash
doctl databases user create supporthub-db supporthub
# Note the generated password from the output
```

---

### 3. Azure Database for PostgreSQL — Flexible Server (Recommended)

**Connection string format:**
```bash
DATABASE_URL=postgresql://supporthub:YourPassword@your-server.postgres.database.azure.com:5432/supporthub?sslmode=require
```

**Create via Azure CLI:**
```bash
# Create resource group
az group create --name supporthub-rg --location eastus

# Create Flexible Server (recommended over legacy Single Server)
az postgres flexible-server create \
    --resource-group supporthub-rg \
    --name supporthub-pgserver \
    --location eastus \
    --admin-user supporthub \
    --admin-password "YourSecurePassword123!" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --version 15 \
    --storage-size 32

# Create the database
az postgres flexible-server db create \
    --resource-group supporthub-rg \
    --server-name supporthub-pgserver \
    --database-name supporthub

# Allow access from your app server IP
az postgres flexible-server firewall-rule create \
    --resource-group supporthub-rg \
    --name supporthub-pgserver \
    --rule-name app-server \
    --start-ip-address YOUR_APP_IP \
    --end-ip-address YOUR_APP_IP
```

> **Azure Tip:** If using Azure Container Apps or AKS, use the **Private Endpoint** connection to avoid public internet exposure.

---

### 4. Self-Hosted PostgreSQL on a VPS

**Installation on Ubuntu 22.04:**
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER supporthub WITH PASSWORD 'YourSecurePassword';
CREATE DATABASE supporthub OWNER supporthub;
GRANT ALL PRIVILEGES ON DATABASE supporthub TO supporthub;
EOF
```

**Connection string:**
```bash
# Local (app on same server)
DATABASE_URL=postgresql://supporthub:YourSecurePassword@localhost:5432/supporthub

# Remote (app on separate server — requires pg_hba.conf changes)
DATABASE_URL=postgresql://supporthub:YourSecurePassword@your.db.server.ip:5432/supporthub?sslmode=require
```

**Enable remote connections (if app is on a separate server):**
```bash
# Edit /etc/postgresql/15/main/postgresql.conf
listen_addresses = '*'

# Edit /etc/postgresql/15/main/pg_hba.conf — add:
host    supporthub   supporthub   YOUR_APP_SERVER_IP/32   scram-sha-256

# Restart
sudo systemctl restart postgresql
```

---

### 5. Docker PostgreSQL (Default — ships with compose.production.yml)

The default `compose.production.yml` already includes a PostgreSQL container.  
This is suitable for single-server deployments. For high-availability, switch to a managed service (options above).

**Backup the internal DB:**
```bash
# Dump database
docker compose -f compose.production.yml exec db \
    pg_dump -U supporthub supporthub > backup_$(date +%F).sql

# Restore
docker compose -f compose.production.yml exec -T db \
    psql -U supporthub supporthub < backup_2024-01-01.sql
```

**Switching from internal to external database:**

1. Edit `compose.production.yml`:
```yaml
# Remove the entire 'db' service block

# Update 'app' service — remove the depends_on section:
# depends_on:
#   db:
#     condition: service_healthy
```

2. Update `.env`:
```bash
DATABASE_URL=postgresql://your-user:your-password@your-managed-host:5432/supporthub?sslmode=require
```

3. Delete the `POSTGRES_*` variables from your `.env` (no longer needed).

---

## 🔒 Security Best Practices

### Always use SSL in production
```bash
# Standard SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Strict SSL with certificate verification
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=/path/to/ca-cert.pem
```

### Principle of least privilege
```sql
-- Create a restricted application user
CREATE USER app_user WITH PASSWORD 'securepassword' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- Grant only what's needed
GRANT CONNECT ON DATABASE supporthub TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Auto-grant for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

---

## 🔧 Performance Tuning

### PostgreSQL settings (`postgresql.conf`)
```ini
# Memory — adjust based on server RAM
shared_buffers = 256MB               # 25% of RAM
effective_cache_size = 768MB         # 75% of RAM
work_mem = 8MB
maintenance_work_mem = 64MB

# Connections
max_connections = 100

# Write performance
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# SSD optimisation
random_page_cost = 1.1
effective_io_concurrency = 200

# Slow query logging
log_min_duration_statement = 1000    # Log queries >1s
```

### Recommended indexes for SupportHub
```sql
-- Core ticket lookups
CREATE INDEX CONCURRENTLY idx_tickets_status         ON tickets(status);
CREATE INDEX CONCURRENTLY idx_tickets_priority       ON tickets(priority);
CREATE INDEX CONCURRENTLY idx_tickets_agent          ON tickets(assigned_agent_id);
CREATE INDEX CONCURRENTLY idx_tickets_created_at     ON tickets(created_at DESC);
CREATE INDEX CONCURRENTLY idx_tickets_customer_email ON tickets(customer_email);

-- Composite (most common query patterns)
CREATE INDEX CONCURRENTLY idx_tickets_agent_status   ON tickets(assigned_agent_id, status);
CREATE INDEX CONCURRENTLY idx_tickets_status_prio    ON tickets(status, priority);

-- Messages
CREATE INDEX CONCURRENTLY idx_messages_ticket        ON messages(ticket_id);
CREATE INDEX CONCURRENTLY idx_messages_created_at    ON messages(created_at DESC);

-- Agents
CREATE INDEX CONCURRENTLY idx_agents_email           ON agents(email);
CREATE INDEX CONCURRENTLY idx_agents_active          ON agents(is_active) WHERE is_active = true;
```

### Connection pooling with PgBouncer (high-traffic)
```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
supporthub = host=localhost port=5432 dbname=supporthub

[pgbouncer]
listen_port     = 6432
listen_addr     = 127.0.0.1
auth_type       = scram-sha-256
auth_file       = /etc/pgbouncer/userlist.txt
pool_mode       = transaction
max_client_conn = 200
default_pool_size = 25
```

Then in `.env`, point at PgBouncer:
```bash
DATABASE_URL=postgresql://supporthub:password@localhost:6432/supporthub
```

---

## 📊 Backups

### Automated daily backup script
```bash
#!/bin/bash
# /usr/local/bin/supporthub-backup.sh

BACKUP_DIR="/backups/supporthub"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/db_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump and compress
pg_dump "$DATABASE_URL" | gzip > "$FILE"

# Optional: Upload to S3
# aws s3 cp "$FILE" "s3://your-backup-bucket/supporthub/"

# Retention: keep 14 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete

echo "✅ Backup saved: $FILE"
```

**Schedule with cron:**
```bash
# Daily at 02:00
0 2 * * * DATABASE_URL="..." /usr/local/bin/supporthub-backup.sh >> /var/log/supporthub-backup.log 2>&1
```

---

## 🗄️ Schema Migrations

SupportHub uses **Drizzle ORM** for schema management.

```bash
# Development — push schema directly (no migration files)
npm run db:push

# Production — generate migration files, then apply
npx drizzle-kit generate
npx drizzle-kit migrate

# Inspect current schema
npx drizzle-kit studio
```

> ⚠️ **Always back up the database before running migrations in production.**

---

## 🆘 Troubleshooting

### Cannot connect to database

```bash
# Test TCP connectivity
nc -zv your-db-host 5432

# Test with psql
psql "$DATABASE_URL" -c "SELECT version();"

# Common causes:
# - Firewall / security group blocking port 5432 (or 25060 for DigitalOcean)
# - sslmode mismatch (try ?sslmode=require or ?sslmode=disable for local)
# - Wrong username/password
# - pg_hba.conf not updated for remote connections
```

### Session store errors (`connect-pg-simple`)

The application uses PostgreSQL for session storage. If you see errors like `relation "session" does not exist`, run:
```sql
-- Create the session table (run once)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

The application creates this automatically on first start. If it fails, run the SQL above manually.

### Slow queries

```sql
-- Top slow queries (requires pg_stat_statements extension)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, calls, mean_exec_time::int AS avg_ms, total_exec_time::int AS total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Active connections
SELECT pid, usename, application_name, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```