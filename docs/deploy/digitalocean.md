# Digital Ocean Deployment Guide

Complete guide for deploying SupportHub on Digital Ocean using Droplets and Managed Databases.

## 🚀 Deployment Options

### Option 1: Droplet + Managed Database (Recommended)
- **Droplet**: Ubuntu 22.04, Basic plan ($6/month+)
- **Database**: Managed PostgreSQL ($15/month+)
- **Benefits**: Automated backups, scaling, monitoring

### Option 2: Docker on Droplet
- **Droplet**: Ubuntu 22.04, General Purpose ($12/month+)
- **Database**: Managed PostgreSQL or self-hosted
- **Benefits**: Container isolation, easy scaling

## 📋 Option 1: Droplet + Managed Database

### Step 1: Create Digital Ocean Resources

**A. Create Managed PostgreSQL Database**
```bash
# Using doctl CLI
doctl databases create supporthub-db \
    --engine postgres \
    --version 14 \
    --region nyc1 \
    --size db-s-1vcpu-1gb \
    --num-nodes 1

# Get connection details
doctl databases connection supporthub-db
```

**B. Create Droplet**
```bash
# Create droplet
doctl compute droplet create supporthub-app \
    --region nyc1 \
    --image ubuntu-22-04-x64 \
    --size s-1vcpu-1gb \
    --ssh-keys your-ssh-key-id

# Get droplet IP
doctl compute droplet list
```

### Step 2: Configure Database Access

**In Digital Ocean Control Panel:**
1. Go to Databases → Your Database
2. Settings → Trusted Sources
3. Add your droplet's IP address
4. Copy the connection string

**Example connection string:**
```
postgresql://doadmin:password@supporthub-db-do-user-123456-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

### Step 3: Setup Droplet

**SSH into your droplet:**
```bash
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install other requirements
apt install -y nginx certbot python3-certbot-nginx git curl

# Install PM2
npm install -g pm2

# Create app user for security
adduser --disabled-password --gecos "" supporthub
usermod -aG sudo supporthub
```

### Step 4: Deploy Application

**Switch to app user and deploy:**
```bash
su - supporthub

# Create application directory
mkdir -p ~/app
cd ~/app

# Upload and extract backup
# (Upload via scp or wget from your backup location)
wget https://your-backup-location/supporthub_backup.tar.gz
tar -xzf supporthub_backup.tar.gz

# Install dependencies
npm ci --production

# Configure environment
cp .env.production.example .env
nano .env
```

**Required .env configuration:**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://doadmin:password@supporthub-db-do-user-123456-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require
SESSION_SECRET=your_very_long_random_session_secret_here
TRUST_PROXY=1
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
SENDGRID_API_KEY=your_sendgrid_api_key
```

**Build and start application:**
```bash
# Build application
npm run build

# Run database migrations
npm run db:push

# Start with PM2
pm2 start ecosystem.prod.config.js --env production
pm2 startup
pm2 save

# Test application
curl http://localhost:5000/api/health
```

### Step 5: Configure Nginx

**Switch back to root and configure Nginx:**
```bash
exit  # Return to root user

# Create Nginx configuration
cp /home/supporthub/app/configs/nginx-host.conf /etc/nginx/sites-available/supporthub

# Edit configuration with your domain
sed -i 's/your-domain.com/yourdomain.com/g' /etc/nginx/sites-available/supporthub

# Enable site
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t
systemctl reload nginx
```

### Step 6: Setup SSL with Let's Encrypt

```bash
# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

### Step 7: Configure Firewall

```bash
# Setup UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Check status
ufw status verbose
```

### Step 8: Setup Monitoring and Backups

**Install monitoring:**
```bash
# Install Digital Ocean monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

**Setup automated backups:**
```bash
# Create backup script
cat > /usr/local/bin/backup-supporthub.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/supporthub/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /home/supporthub app

# Upload to Digital Ocean Spaces (optional)
# s3cmd put $BACKUP_DIR/app_backup_$DATE.tar.gz s3://your-spaces-bucket/

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-supporthub.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-supporthub.sh
```

## 📋 Option 2: Docker Deployment

### Step 1: Create Resources

**Create droplet with Docker:**
```bash
doctl compute droplet create supporthub-docker \
    --region nyc1 \
    --image docker-20-04 \
    --size s-2vcpu-2gb \
    --ssh-keys your-ssh-key-id
```

### Step 2: Deploy with Docker Compose

**SSH into droplet and setup:**
```bash
ssh root@your-droplet-ip

# Create application directory
mkdir -p /opt/supporthub
cd /opt/supporthub

# Upload application files
# (Upload your backup and extract, or clone from git)

# Choose deployment mode:
# For managed database:
cp compose.external-db.yml docker-compose.yml

# For internal database:
cp compose.internal-db.yml docker-compose.yml

# Configure environment
cp .env.production.example .env
nano .env
```

**Required .env for managed database:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://doadmin:password@your-managed-db.db.ondigitalocean.com:25060/defaultdb?sslmode=require
SESSION_SECRET=your_very_long_random_session_secret_here
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
SENDGRID_API_KEY=your_sendgrid_api_key
```

**Start services:**
```bash
# Start application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Run database migrations (if using external DB)
docker-compose exec app npm run db:push
```

### Step 3: Setup SSL and Domain

**Install Nginx on host for SSL termination:**
```bash
apt update && apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config for Docker
cat > /etc/nginx/sites-available/supporthub << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔧 Digital Ocean Specific Features

### Monitoring and Alerts

**Setup DO monitoring:**
```bash
# Install monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash

# Configure custom metrics (optional)
cat > /etc/do-monitoring/custom-metrics.conf << 'EOF'
[supporthub]
command = curl -s http://localhost:5000/api/health | grep -c "ok"
interval = 60
EOF
```

### Backup Strategies

**Option A: Snapshot-based backups:**
```bash
# Create snapshot via API
doctl compute droplet-action snapshot your-droplet-id --snapshot-name "supporthub-$(date +%Y%m%d)"

# Automate weekly snapshots
crontab -e
# Add: 0 2 * * 0 doctl compute droplet-action snapshot $(doctl compute droplet list --format ID --no-header) --snapshot-name "supporthub-$(date +%Y%m%d)"
```

**Option B: Spaces for file backups:**
```bash
# Install s3cmd for Spaces
apt install -y s3cmd

# Configure for DO Spaces
s3cmd --configure
# Use your Spaces access key and secret

# Backup to Spaces
s3cmd put /path/to/backup.tar.gz s3://your-spaces-bucket/backups/
```

### Database Management

**For Managed PostgreSQL:**
```bash
# Connect to database
doctl databases connection supporthub-db

# Create backup
doctl databases backup list supporthub-db

# Restore from backup
doctl databases backup restore supporthub-db backup-id
```

### Scaling Considerations

**Vertical Scaling:**
```bash
# Resize droplet
doctl compute droplet-action resize your-droplet-id --size s-2vcpu-4gb

# Resize database
doctl databases resize supporthub-db --size db-s-2vcpu-4gb
```

**Horizontal Scaling:**
- Use DO Load Balancer
- Multiple app droplets
- Shared managed database
- DO Spaces for shared file storage

## 🆘 Troubleshooting

### Common Issues

**Database connection timeout:**
```bash
# Check trusted sources in DO dashboard
# Verify droplet IP is allowed
# Test connection:
telnet your-db-host 25060
```

**SSL certificate issues:**
```bash
# Check certificate status
certbot certificates

# Test renewal
certbot renew --dry-run

# Force renewal if needed
certbot renew --force-renewal
```

**Performance issues:**
```bash
# Monitor resources
htop
df -h

# Check DO monitoring dashboard
# Consider droplet resize
```

### Support Resources

- Digital Ocean Documentation: https://docs.digitalocean.com/
- Community tutorials: https://www.digitalocean.com/community/tutorials
- Support tickets via DO dashboard

This completes the Digital Ocean deployment guide. Your SupportHub application should now be running on Digital Ocean with proper monitoring, backups, and scaling capabilities.