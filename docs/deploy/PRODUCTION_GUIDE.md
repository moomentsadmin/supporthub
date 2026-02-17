# Production Deployment Guide (Ubuntu/Docker)

This guide covers deploying SupportHub on an Ubuntu server using Docker and Docker Compose. It supports internal (containerized) and external databases/storage services.

## prerequisites

-   **Server**: Ubuntu 20.04/22.04 LTS (Recommended: 2 vCPU, 4GB RAM).
-   **Software**:
    -   Docker Engine (latest)
    -   Docker Compose V2 (`docker compose` command)
    -   Git

## 1. Quick Start (All-in-One)

For a self-contained deployment using local storage and database:

1.  **Clone the Repository**:
    ```bash
    git clone <repository_url> supporthub
    cd supporthub
    ```

2.  **Configure Environment**:
    ```bash
    cp .env.example .env
    nano .env
    ```
    Set `DOMAIN` to your server's domain pointing to the IP.
    Set `EMAIL` for SSL notifications.
    Leave `DATABASE_URL` pointing to `db:5432` (internal).

3.  **Deploy**:
    ```bash
    chmod +x scripts/deploy.sh
    ./scripts/deploy.sh
    ```

## 2. Infrastructure Configuration

SupportHub supports flexible infrastructure configurations.

### Database Options

**Option A: Internal Database (Default)**
The default `compose.production.yml` runs a PostgreSQL container.
-   **Data Persistence**: Stored in docker volume `postgres_data`.
-   **Pros**: Easy setup, zero cost.
-   **Cons**: Managed backups are manual.

**Option B: External Managed Database**
To use a managed database service (Recommended for high availability):

1.  Provision a PostgreSQL 15+ instance.
2.  Update `DATABASE_URL` in `.env`.

**Connection String Examples:**

*   **AWS RDS**:
    ```env
    DATABASE_URL=postgresql://postgres:password@rds-endpoint.us-east-1.rds.amazonaws.com:5432/supporthub?sslmode=require
    ```

*   **Azure Database for PostgreSQL**:
    ```env
    # Flexible Server (Standard)
    DATABASE_URL=postgresql://adminuser:password@my-server.postgres.database.azure.com:5432/supporthub?sslmode=require
    
    # Single Server (Legacy - requires @hostname)
    # DATABASE_URL=postgresql://adminuser@my-server:password@my-server.postgres.database.azure.com:5432/supporthub?sslmode=require
    ```

*   **DigitalOcean Managed Database**:
    ```env
    # Use the connection string provided in DO Dashboard (Pool mode recommended)
    # Ensure '?sslmode=require' is appended.
    DATABASE_URL=postgresql://doadmin:password@db-postgresql-nyc3-12345.a.db.ondigitalocean.com:25060/supporthub?sslmode=require
    ```

3.  Update `compose.production.yml`:
    -   Remove the `db` service.
    -   Remove `depends_on: db` from `app`.

### File Storage Options

SupportHub supports Local, AWS S3 / DigitalOcean Spaces, and Azure Blob Storage.

**Option A: Internal Storage (Default - LOCAL)**
Files are stored in the `app` container's `/app/uploads` volume (mapped to `app_uploads` docker volume).
-   **Config**: `STORAGE_PROVIDER=LOCAL` (or unset).

**Option B: AWS S3 / DigitalOcean Spaces / MinIO**
1.  Create a bucket/space.
2.  Create API Keys (Access Key ID, Secret Access Key).
3.  Update `.env`:

    **AWS S3**:
    ```env
    STORAGE_PROVIDER=S3
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_REGION=us-east-1
    AWS_BUCKET=my-bucket-name
    ```

    **DigitalOcean Spaces**:
    ```env
    STORAGE_PROVIDER=S3
    AWS_ACCESS_KEY_ID=your_spaces_key
    AWS_SECRET_ACCESS_KEY=your_spaces_secret
    AWS_REGION=nyc3
    AWS_BUCKET=my-space-name
    # Critical: Set endpoint for Spaces
    S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
    ```

**Option C: Azure Blob Storage**
SupportHub supports native Azure Blob Storage.

1.  Create a Storage Account.
2.  Get "Access Keys" (Account Name + Key).
3.  Update `.env`:
    ```env
    STORAGE_PROVIDER=AZURE
    AZURE_STORAGE_ACCOUNT_NAME=mystorageaccount
    AZURE_STORAGE_ACCOUNT_KEY=my_long_access_key_...
    AZURE_STORAGE_CONTAINER_NAME=supporthub-uploads
    ```

## 3. Security Verification

### Code Vulnerabilities
A security audit was performed on the codebase.
-   **Current Status**: 8 Dependencies with vulnerabilities found (mostly moderate).
-   **Action**: Run `npm audit fix` during build process or manually update dependencies.
-   **Recommendation**: Keep dependencies updated regularly.

### SSL / HTTPS
Deployment script manages SSL automatically via Let's Encrypt (Certbot).
-   **Verification**: Ensure port 80/443 are open.
-   **Checks**: Script attempts validation for root domain and `www` subdomain.

### Secrets
Ensure `.env` file is secured (`chmod 600 .env`) and never committed to git.

## 4. Maintenance

### Updates
To update the application:
1.  `git pull`
2.  `./scripts/deploy.sh` (Rebuilds containers and applies migrations).

### Backup
**Database**:
```bash
docker compose exec db pg_dump -U supporthub supporthub > backup_$(date +%F).sql
```
**Storage (Local)**:
Backup the `app_uploads` volume data (usually in `/var/lib/docker/volumes/...`).

## 5. Troubleshooting

Check logs:
```bash
docker compose logs -f app
docker compose logs -f nginx
```
Restart specific service:
```bash
docker compose restart app
```
