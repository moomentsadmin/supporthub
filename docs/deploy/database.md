# Database Configuration Guide

Comprehensive guide for configuring SupportHub with various database providers and configurations.

## 🗄️ Database Options Overview

### Managed Database Services (Recommended)
- **AWS RDS PostgreSQL** - Fully managed, automated backups, Multi-AZ
- **Digital Ocean Managed Database** - Simple setup, automated maintenance
- **Azure Database for PostgreSQL** - Integrated with Azure services
- **Google Cloud SQL** - Global availability, automatic scaling
- **Supabase** - PostgreSQL with built-in features, generous free tier
- **Neon** - Serverless PostgreSQL with branching

### Self-Hosted Options
- **Local PostgreSQL** - Full control, ideal for development
- **Docker PostgreSQL** - Containerized, easy deployment
- **VPS PostgreSQL** - Custom server setup

## 📋 Managed Database Configurations

### AWS RDS PostgreSQL

**Connection Format:**
```bash
DATABASE_URL=postgresql://username:password@instance.region.rds.amazonaws.com:5432/database?sslmode=require
```

**Setup Steps:**
```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier supporthub-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 14.9 \
    --master-username supporthub \
    --master-user-password YourSecurePassword123 \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-12345678 \
    --publicly-accessible \
    --storage-encrypted

# Get connection endpoint
aws rds describe-db-instances \
    --db-instance-identifier supporthub-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

**Production Configuration:**
```bash
# Enable Multi-AZ for high availability
aws rds modify-db-instance \
    --db-instance-identifier supporthub-db \
    --multi-az \
    --apply-immediately

# Configure automated backups
aws rds modify-db-instance \
    --db-instance-identifier supporthub-db \
    --backup-retention-period 14 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00"
```

### Digital Ocean Managed Database

**Connection Format:**
```bash
DATABASE_URL=postgresql://doadmin:password@db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Setup Steps:**
```bash
# Create managed database
doctl databases create supporthub-db \
    --engine postgres \
    --version 14 \
    --region nyc1 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1

# Get connection details
doctl databases connection supporthub-db

# Add trusted sources (your application servers)
doctl databases firewalls append supporthub-db \
    --rule type:droplet,value:droplet-id
```

**Backup Configuration:**
```bash
# Daily backups are automatic
# List available backups
doctl databases backup list supporthub-db

# Create manual backup
doctl databases backup create supporthub-db
```

### Azure Database for PostgreSQL

**Connection Format:**
```bash
# Flexible Server (Standard)
DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?sslmode=require

# Single Server (Legacy)
# DATABASE_URL=postgresql://username@server:password@server.postgres.database.azure.com:5432/database?sslmode=require
```

**Setup Steps:**
```bash
# Create PostgreSQL server
az postgres server create \
    --resource-group supporthub-rg \
    --name supporthub-db-server \
    --location eastus \
    --admin-user supporthub \
    --admin-password 'YourSecurePassword123!' \
    --sku-name GP_Gen5_2 \
    --version 14

# Create database
az postgres db create \
    --resource-group supporthub-rg \
    --server-name supporthub-db-server \
    --name supporthub

# Configure firewall
az postgres server firewall-rule create \
    --resource-group supporthub-rg \
    --server supporthub-db-server \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

### Google Cloud SQL

**Connection Format:**
```bash
DATABASE_URL=postgresql://username:password@ip-address:5432/database?sslmode=require
```

**Setup Steps:**
```bash
# Create Cloud SQL instance
gcloud sql instances create supporthub-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=YourSecurePassword123

# Create database
gcloud sql databases create supporthub --instance=supporthub-db

# Create user
gcloud sql users create supporthub \
    --instance=supporthub-db \
    --password=YourSecurePassword123

# Configure authorized networks
gcloud sql instances patch supporthub-db \
    --authorized-networks=0.0.0.0/0
```

### Supabase

**Connection Format:**
```bash
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require
```

**Setup Steps:**
1. Go to https://supabase.com/dashboard
2. Create new project
3. Set database password
4. Get connection string from Settings → Database
5. Use the "URI" connection string

**Features:**
- Built-in authentication
- Real-time subscriptions
- REST API auto-generation
- Built-in dashboard
- Generous free tier (500MB database, 50k monthly active users)

### Neon

**Connection Format:**
```bash
DATABASE_URL=postgresql://username:password@ep-name.region.neon.tech/database?sslmode=require
```

**Setup Steps:**
1. Go to https://neon.tech/
2. Create account and new project
3. Copy connection string
4. Use the pooled connection for production

**Features:**
- Serverless PostgreSQL
- Database branching (like Git for databases)
- Auto-scaling
- Generous free tier

## 🏠 Self-Hosted Configurations

### Local PostgreSQL

**Installation (Ubuntu):**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create user and database
sudo -u postgres psql -c "CREATE USER supporthub WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE supporthub OWNER supporthub;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE supporthub TO supporthub;"
```

**Connection:**
```bash
DATABASE_URL=postgresql://supporthub:your_password@localhost:5432/supporthub
```

### Docker PostgreSQL

**Docker Compose (Development):**
```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: supporthub
      POSTGRES_USER: supporthub
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    
volumes:
  postgres_data:
```

**Production Docker:**
```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: supporthub
      POSTGRES_USER: supporthub
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    # Remove port exposure in production
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U supporthub -d supporthub"]
      interval: 10s
      timeout: 5s
      retries: 5
    
volumes:
  postgres_data:
    driver: local
```

## 🔧 Database Optimization

### Performance Tuning

**PostgreSQL Configuration (`postgresql.conf`):**
```bash
# Memory settings
shared_buffers = 256MB                 # 25% of RAM for dedicated server
effective_cache_size = 1GB             # 75% of RAM
work_mem = 4MB                         # Per-query memory
maintenance_work_mem = 64MB            # Maintenance operations

# Checkpoint settings
checkpoint_completion_target = 0.7
wal_buffers = 16MB

# Query planner
random_page_cost = 1.1                 # SSD optimization
effective_io_concurrency = 200         # SSD optimization

# Logging
log_min_duration_statement = 1000      # Log slow queries
log_statement = 'mod'                  # Log modifications
```

**Connection Pooling:**
```bash
# Using PgBouncer
sudo apt install -y pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
supporthub = host=localhost port=5432 dbname=supporthub

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

### Indexing Strategy

**Create indexes for SupportHub:**
```sql
-- Tickets table indexes
CREATE INDEX CONCURRENTLY idx_tickets_status ON tickets(status);
CREATE INDEX CONCURRENTLY idx_tickets_priority ON tickets(priority);
CREATE INDEX CONCURRENTLY idx_tickets_assigned_agent ON tickets(assigned_agent_id);
CREATE INDEX CONCURRENTLY idx_tickets_created_at ON tickets(created_at);
CREATE INDEX CONCURRENTLY idx_tickets_customer ON tickets(customer_email);

-- Messages table indexes
CREATE INDEX CONCURRENTLY idx_messages_ticket ON messages(ticket_id);
CREATE INDEX CONCURRENTLY idx_messages_created_at ON messages(created_at);
CREATE INDEX CONCURRENTLY idx_messages_sender ON messages(sender);

-- Agents table indexes
CREATE INDEX CONCURRENTLY idx_agents_email ON agents(email);
CREATE INDEX CONCURRENTLY idx_agents_active ON agents(is_active);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX CONCURRENTLY idx_tickets_agent_status ON tickets(assigned_agent_id, status);
```

## 🔒 Security Configuration

### SSL/TLS Setup

**Enforce SSL connections:**
```sql
-- PostgreSQL configuration
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';
SELECT pg_reload_conf();

-- Require SSL for specific user
ALTER USER supporthub REQUIRE SSL;
```

**Connection string with SSL:**
```bash
# Always use SSL in production
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# For self-signed certificates
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt
```

### User Permissions

**Principle of least privilege:**
```sql
-- Create application-specific user
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE supporthub TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Set default permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

## 📊 Monitoring and Maintenance

### Health Checks

**Database health check script:**
```bash
#!/bin/bash
# db-health-check.sh

DB_URL="$DATABASE_URL"

# Test connection
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
    exit 1
fi

# Check database size
SIZE=$(psql "$DB_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
echo "📊 Database size: $SIZE"

# Check active connections
CONNECTIONS=$(psql "$DB_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
echo "🔗 Active connections: $CONNECTIONS"

# Check for long-running queries
LONG_QUERIES=$(psql "$DB_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
if [ "$LONG_QUERIES" -gt 0 ]; then
    echo "⚠️  Long-running queries detected: $LONG_QUERIES"
fi

echo "✅ Database health check completed"
```

### Backup Strategies

**Automated backup script:**
```bash
#!/bin/bash
# backup-database.sh

DB_URL="$DATABASE_URL"
BACKUP_DIR="/backup/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supporthub_backup_$DATE.sql"

mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump "$DB_URL" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/
# gsutil cp "$BACKUP_FILE.gz" gs://your-backup-bucket/

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Schedule backups:**
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup-database.sh

# Weekly full backup on Sunday at 1 AM
0 1 * * 0 /path/to/backup-database.sh full
```

### Migration Management

**Using Drizzle migrations:**
```bash
# Generate migration
npm run db:generate

# Push schema changes (development)
npm run db:push

# Apply migrations (production)
npm run db:migrate

# Drop and recreate schema (dangerous!)
npm run db:drop
npm run db:push
```

**Manual migration script:**
```bash
#!/bin/bash
# migrate-database.sh

DB_URL="$DATABASE_URL"

echo "Running database migrations..."

# Backup before migration
pg_dump "$DB_URL" > "backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"

# Run migrations
npm run db:migrate

# Verify migration
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Migration successful"
else
    echo "❌ Migration failed"
    exit 1
fi
```

## 🆘 Troubleshooting

### Common Issues

**Connection timeouts:**
```bash
# Check network connectivity
telnet db-host 5432

# Check SSL configuration
psql "$DATABASE_URL" -c "SHOW ssl;"

# Verify firewall rules
# For AWS: Check security groups
# For Azure: Check firewall rules
# For local: Check iptables/ufw
```

**Performance issues:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check for blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Storage issues:**
```sql
-- Check database sizes
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

This completes the database configuration guide. Your SupportHub application should now have a properly configured, secure, and performant database setup regardless of which provider you choose.