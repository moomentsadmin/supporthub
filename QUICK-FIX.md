# Quick Fix for Docker Deployment Issues

## Issues Fixed

### ✅ Issue 1: Nginx SSL Certificate Error
**Problem:** Nginx was looking for SSL certificates that don't exist
```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/fullchain.pem"
```

**Solution:** Updated `compose.internal-db.yml` to use HTTP-only nginx configuration (`nginx-compose-http.conf`) instead of SSL configuration.

### ✅ Issue 2: Database Connection Error (Port 443)
**Problem:** App trying to connect to PostgreSQL on port 443 (HTTPS) instead of 5432
```
Error: connect ECONNREFUSED 172.18.0.2:443
```

**Cause:** Wrong `DATABASE_URL` format in environment variables (Neon HTTP URL instead of PostgreSQL URL)

**Solution:** The `compose.internal-db.yml` now correctly sets:
```env
DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub
```

## How to Deploy Now

### Step 1: Stop Current Deployment
```bash
cd ~/supporthub
docker compose -f compose.internal-db.yml down -v
```

### Step 2: Create Environment File
```bash
# Create .env file
cat > .env << 'EOF'
# Database password (change this!)
DB_PASSWORD=your_strong_password_here

# Session secret (generate with: openssl rand -hex 32)
SESSION_SECRET=your_session_secret_here

# Optional: Email configuration
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
SENDGRID_API_KEY=
EOF
```

### Step 3: Pull Latest Code
```bash
git pull origin main
```

### Step 4: Deploy
```bash
# Build and start all services
docker compose -f compose.internal-db.yml up -d --build

# View logs
docker compose -f compose.internal-db.yml logs -f
```

### Step 5: Verify Deployment
```bash
# Check containers are running
docker compose -f compose.internal-db.yml ps

# Test application
curl http://localhost/api/health

# Expected response:
# {"status":"ok","database":"connected","timestamp":"..."}
```

## Access Your Application

- **URL:** http://your-server-ip
- **Admin Portal:** http://your-server-ip/admin/login
  - Email: `admin@supporthub.com`
  - Password: `admin123` (⚠️ **Change immediately!**)

## What Changed

### Files Modified:
1. **`compose.internal-db.yml`** - Updated nginx to use HTTP-only config
2. **`configs/nginx-compose-http.conf`** - New HTTP-only nginx configuration (no SSL)
3. **`DOCKER-DEPLOYMENT.md`** - Updated troubleshooting documentation

### Configuration Differences:

**compose.internal-db.yml** (HTTP only - development/testing)
- Uses `nginx-compose-http.conf`
- Listens on port 80 only
- No SSL certificates required
- Good for: Development, testing, internal networks

**compose.production.yml** (HTTPS - production)
- Uses SSL certificates from Let's Encrypt
- Listens on ports 80 & 443
- Automatic HTTP to HTTPS redirect
- Good for: Production deployments

## Add HTTPS Later (Optional)

If you want HTTPS on `compose.internal-db.yml`, you have two options:

### Option 1: Use compose.production.yml Instead
```bash
# Use the production configuration with SSL
docker compose -f compose.production.yml up -d

# Follow SSL setup in PRODUCTION-DEPLOYMENT.md
```

### Option 2: External Reverse Proxy
Set up Nginx or Caddy on the host machine to handle SSL and proxy to port 80.

## Troubleshooting

### If nginx still fails:
```bash
# Check nginx config is correct
docker compose -f compose.internal-db.yml exec nginx nginx -t

# Check nginx can reach app
docker compose -f compose.internal-db.yml exec nginx wget -O- http://app:5000/api/health
```

### If database connection fails:
```bash
# Check DATABASE_URL is set correctly
docker compose -f compose.internal-db.yml exec app env | grep DATABASE_URL

# Should show:
# DATABASE_URL=postgresql://supporthub:password@db:5432/supporthub
```

### If port 443 error appears:
```bash
# This means wrong DATABASE_URL format
# Check your .env file does NOT have Neon HTTP URL
# It should start with: postgresql://
```

## Security Checklist

Before going live:
- [ ] Change `DB_PASSWORD` in `.env`
- [ ] Generate strong `SESSION_SECRET` 
- [ ] Change default admin password
- [ ] Set up firewall (allow only port 80/443)
- [ ] Configure backups
- [ ] Consider using `compose.production.yml` with SSL

---

**All fixed! Your deployment should now work without errors.** 🚀
