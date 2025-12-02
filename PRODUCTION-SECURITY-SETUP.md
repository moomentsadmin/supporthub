# Production Security Setup

This guide summarizes the minimum steps to harden SupportHub for production.

## Database Support

SupportHub supports **all PostgreSQL-compatible databases**:

### ✅ Managed Cloud Databases
- **AWS RDS PostgreSQL** - Fully managed, Multi-AZ, automated backups
- **Azure Database for PostgreSQL** - Integrated Azure services
- **Digital Ocean Managed Database** - Simple setup, automated maintenance
- **Google Cloud SQL** - Global availability, automatic scaling
- **Supabase** - PostgreSQL with built-in features, generous free tier
- **Neon** - Serverless PostgreSQL with branching (default driver)

### ✅ Self-Hosted Options
- **Internal PostgreSQL (Docker)** - Containerized with `compose.internal-db.yml`
- **External PostgreSQL** - Connect to any PostgreSQL instance with `compose.external-db.yml`
- **Local Development** - In-memory storage (no DATABASE_URL required)

See `docs/deploy/database.md` for detailed setup instructions for each provider.

## Environment Variables
Set these securely on your host or orchestration platform.

- SESSION_SECRET: 64+ random characters
- CORS_ORIGIN: Comma-separated allowed origins (e.g. https://yourdomain.com)
- DATABASE_URL: PostgreSQL connection with SSL (append `?sslmode=require`)
- SENDGRID_API_KEY: Required for email sending if using SendGrid
- VERIFIED_SENDER_EMAIL: The verified sender address
- COOKIE_SAMESITE: lax | strict | none (default: lax)

### Database Connection Examples

**AWS RDS:**
```bash
DATABASE_URL=postgresql://username:password@instance.region.rds.amazonaws.com/database?sslmode=require
```

**Azure Database:**
```bash
DATABASE_URL=postgresql://username@server:password@server.postgres.database.azure.com/database?sslmode=require
```

**Digital Ocean Managed DB:**
```bash
DATABASE_URL=postgresql://doadmin:password@db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

**Neon (Serverless):**
```bash
DATABASE_URL=postgresql://username:password@ep-name.region.neon.tech/database?sslmode=require
```

**Docker Internal:**
```bash
DATABASE_URL=postgresql://supporthub:password@db/supporthub
```

Generate a strong secret:

```powershell
node -e "require('./server/security-checks').generateSecret()"
setx SESSION_SECRET "<paste_generated_secret>"
```

## Default Accounts
Change default passwords immediately.

- Admin: `admin@supporthub.com`
- Agent: `agent@example.com`

Use existing update endpoints:

```powershell
# Update Admin password (requires admin session)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "admin@supporthub.com"; password = "admin123" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/admin/login -Method POST -Headers @{ "Content-Type"="application/json" } -Body $body -WebSession $session -UseBasicParsing

$update = @{ password = "<NewStrongPassword>" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/admin-users/<ADMIN_ID> -Method PUT -Headers @{ "Content-Type"="application/json" } -Body $update -WebSession $session -UseBasicParsing

# Update Agent password (requires agent session)
$agentSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body2 = @{ email = "agent@example.com"; password = "password123" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/auth/login -Method POST -Headers @{ "Content-Type"="application/json" } -Body $body2 -WebSession $agentSession -UseBasicParsing

$update2 = @{ currentPassword = "password123"; newPassword = "<NewStrongPassword>" } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3000/api/agents/password -Method PATCH -Headers @{ "Content-Type"="application/json" } -Body $update2 -WebSession $agentSession -UseBasicParsing
```

Note: Replace `<ADMIN_ID>` with the ID from `/api/admin/me`.

## HTTPS & Reverse Proxy
- Terminate TLS with valid certificates (Let’s Encrypt or managed certs)
- Forward `X-Forwarded-*` headers; set `TRUST_PROXY=1`

## Security Middleware
Already enabled:
- Helmet CSP/HSTS
- CORS whitelist
- Rate limiters for auth and API
- Session fixation prevention on login
- Request size limits (10MB)

## Upload Hardening
- MIME and extension allowlist
- Randomized filenames
- Legacy `/api/upload` secured

## Deployment Options

### Docker with Internal Database
```bash
# Use compose.internal-db.yml for self-contained deployment
docker-compose -f compose.internal-db.yml up -d
```

### Docker with External/Managed Database
```bash
# Use compose.external-db.yml for AWS RDS, Azure DB, DO Managed DB, etc.
# Set DATABASE_URL in .env first
docker-compose -f compose.external-db.yml up -d
```

### Manual Deployment
```bash
# Build production bundle
npm run build

# Start with your chosen database
export DATABASE_URL="postgresql://..."
npm run start
```

## Final Checklist
- Strong `SESSION_SECRET` configured
- Default passwords changed
- CORS origins set
- `DATABASE_URL` SSL enforced (managed databases)
- Database selected: Internal/External/Cloud
- Email envs set
- Backups and monitoring configured
- Refer to `docs/deploy/database.md` for provider-specific steps
