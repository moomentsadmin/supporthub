# Azure Deployment Guide

Complete guide for deploying SupportHub on Microsoft Azure using various service combinations.

## 🚀 Deployment Options

### Option 1: App Service + Azure Database (Recommended)
- **Compute**: Azure App Service (Linux)
- **Database**: Azure Database for PostgreSQL
- **Benefits**: Fully managed, auto-scaling, integrated monitoring

### Option 2: Virtual Machine + Managed Database
- **Compute**: Azure Virtual Machine (Ubuntu)
- **Database**: Azure Database for PostgreSQL
- **Benefits**: Full control, custom configurations

### Option 3: Container Instances + Azure Database
- **Compute**: Azure Container Instances
- **Database**: Azure Database for PostgreSQL
- **Benefits**: Serverless containers, pay-per-use

## 📋 Option 1: App Service + Azure Database

### Step 1: Create Resource Group

```bash
# Login to Azure CLI
az login

# Create resource group
az group create \
    --name supporthub-rg \
    --location eastus
```

### Step 2: Create Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres server create \
    --resource-group supporthub-rg \
    --name supporthub-db-server \
    --location eastus \
    --admin-user supporthub \
    --admin-password 'YourSecurePassword123!' \
    --sku-name GP_Gen5_2 \
    --version 14 \
    --storage-size 51200 \
    --backup-retention 7 \
    --geo-redundant-backup Enabled \
    --ssl-enforcement Enabled

# Create database
az postgres db create \
    --resource-group supporthub-rg \
    --server-name supporthub-db-server \
    --name supporthub

# Configure firewall to allow Azure services
az postgres server firewall-rule create \
    --resource-group supporthub-rg \
    --server supporthub-db-server \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0

# Allow your current IP for initial setup
az postgres server firewall-rule create \
    --resource-group supporthub-rg \
    --server supporthub-db-server \
    --name AllowMyIP \
    --start-ip-address $(curl -s ifconfig.me) \
    --end-ip-address $(curl -s ifconfig.me)
```

### Step 3: Create App Service Plan

```bash
# Create App Service plan (Linux)
az appservice plan create \
    --name supporthub-plan \
    --resource-group supporthub-rg \
    --location eastus \
    --is-linux \
    --sku B1
```

### Step 4: Create App Service

```bash
# Create Web App
az webapp create \
    --resource-group supporthub-rg \
    --plan supporthub-plan \
    --name supporthub-app-unique-name \
    --runtime "NODE|20-lts" \
    --deployment-local-git

# Get deployment credentials
az webapp deployment user set \
    --user-name deployment-user \
    --password 'DeploymentPassword123!'
```

### Step 5: Configure App Settings

```bash
# Get database connection string
DB_HOST=$(az postgres server show --resource-group supporthub-rg --name supporthub-db-server --query fullyQualifiedDomainName -o tsv)

# Set application settings
az webapp config appsettings set \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --settings \
        NODE_ENV=production \
        PORT=8080 \
        DATABASE_URL="postgresql://supporthub@supporthub-db-server:YourSecurePassword123!@${DB_HOST}:5432/supporthub?sslmode=require" \
        SESSION_SECRET="your-very-long-random-session-secret-here" \
        TRUST_PROXY=1 \
        WEBSITES_PORT=8080
```

### Step 6: Deploy Application

**Option A: Git Deployment**
```bash
# Get Git clone URL
GIT_URL=$(az webapp deployment source config-local-git \
    --name supporthub-app-unique-name \
    --resource-group supporthub-rg \
    --query url -o tsv)

# Add Azure remote to your local git
git remote add azure $GIT_URL

# Deploy
git push azure main
```

**Option B: ZIP Deployment**
```bash
# Create deployment package
npm run build
zip -r supporthub-deploy.zip . -x "node_modules/*" ".git/*" "*.tar.gz"

# Deploy via ZIP
az webapp deployment source config-zip \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --src supporthub-deploy.zip
```

### Step 7: Run Database Migrations

```bash
# Connect to your app via SSH (if needed)
az webapp ssh --resource-group supporthub-rg --name supporthub-app-unique-name

# Or run command directly
az webapp ssh --resource-group supporthub-rg --name supporthub-app-unique-name --command "npm run db:push"
```

### Step 8: Configure Custom Domain and SSL

```bash
# Add custom domain
az webapp config hostname add \
    --webapp-name supporthub-app-unique-name \
    --resource-group supporthub-rg \
    --hostname yourdomain.com

# Enable HTTPS
az webapp update \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --https-only true

# Create managed certificate (free)
az webapp config ssl create \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --hostname yourdomain.com

# Bind SSL certificate
az webapp config ssl bind \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --certificate-thumbprint <thumbprint> \
    --ssl-type SNI
```

## 📋 Option 2: Virtual Machine Deployment

### Step 1: Create Virtual Machine

```bash
# Create virtual machine
az vm create \
    --resource-group supporthub-rg \
    --name supporthub-vm \
    --image Ubuntu2204 \
    --admin-username azureuser \
    --generate-ssh-keys \
    --size Standard_B2s \
    --public-ip-sku Standard \
    --security-type TrustedLaunch

# Open ports for HTTP/HTTPS
az vm open-port \
    --port 80,443 \
    --resource-group supporthub-rg \
    --name supporthub-vm
```

### Step 2: Setup Virtual Machine

```bash
# Get VM public IP
VM_IP=$(az vm show -d -g supporthub-rg -n supporthub-vm --query publicIps -o tsv)

# SSH into VM
ssh azureuser@$VM_IP

# Update system and install Node.js
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/supporthub
sudo chown azureuser:azureuser /var/www/supporthub
```

### Step 3: Deploy Application

```bash
# Navigate to app directory
cd /var/www/supporthub

# Upload and extract backup (use scp from local machine)
# scp supporthub_backup.tar.gz azureuser@$VM_IP:/var/www/supporthub/
tar -xzf supporthub_backup.tar.gz

# Install dependencies
npm ci --production

# Configure environment
cp .env.production.example .env
nano .env
```

**Configure .env with Azure Database:**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://supporthub@supporthub-db-server:YourSecurePassword123!@supporthub-db-server.postgres.database.azure.com:5432/supporthub?sslmode=require
SESSION_SECRET=your_very_long_random_session_secret_here
TRUST_PROXY=1
```

### Step 4: Setup Application Service

```bash
# Build and start application
npm run build
npm run db:push

# Start with PM2
pm2 start ecosystem.prod.config.js --env production
pm2 startup
pm2 save
```

### Step 5: Configure Nginx and SSL

```bash
# Copy Nginx configuration
sudo cp configs/nginx-host.conf /etc/nginx/sites-available/supporthub

# Edit configuration
sudo nano /etc/nginx/sites-available/supporthub
# Replace 'your-domain.com' with your actual domain

# Enable site
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com
```

## 📋 Option 3: Container Instances

### Step 1: Create Container Registry

```bash
# Create Azure Container Registry
az acr create \
    --resource-group supporthub-rg \
    --name supporthubacrname \
    --sku Basic \
    --admin-enabled true

# Get login server
ACR_SERVER=$(az acr show --name supporthubacrname --resource-group supporthub-rg --query loginServer -o tsv)
```

### Step 2: Build and Push Container

```bash
# Build Docker image
docker build -f Dockerfile.prod -t supporthub .

# Tag for ACR
docker tag supporthub $ACR_SERVER/supporthub:latest

# Login to ACR
az acr login --name supporthubacrname

# Push image
docker push $ACR_SERVER/supporthub:latest
```

### Step 3: Create Container Instance

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name supporthubacrname --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name supporthubacrname --query passwords[0].value -o tsv)

# Create container instance
az container create \
    --resource-group supporthub-rg \
    --name supporthub-container \
    --image $ACR_SERVER/supporthub:latest \
    --cpu 1 \
    --memory 2 \
    --registry-login-server $ACR_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label supporthub-unique \
    --ports 5000 \
    --environment-variables \
        NODE_ENV=production \
        PORT=5000 \
        TRUST_PROXY=1 \
    --secure-environment-variables \
        DATABASE_URL="postgresql://supporthub@supporthub-db-server:YourSecurePassword123!@supporthub-db-server.postgres.database.azure.com:5432/supporthub?sslmode=require" \
        SESSION_SECRET="your-very-long-random-session-secret-here"
```

## 🔧 Azure-Specific Features

### Key Vault Integration

**Store secrets in Key Vault:**
```bash
# Create Key Vault
az keyvault create \
    --name supporthub-keyvault \
    --resource-group supporthub-rg \
    --location eastus

# Store secrets
az keyvault secret set \
    --vault-name supporthub-keyvault \
    --name DatabaseURL \
    --value "postgresql://user:pass@host:5432/db?sslmode=require"

az keyvault secret set \
    --vault-name supporthub-keyvault \
    --name SessionSecret \
    --value "your-very-long-session-secret"
```

**Configure App Service to use Key Vault:**
```bash
# Enable managed identity
az webapp identity assign \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name

# Grant access to Key Vault
PRINCIPAL_ID=$(az webapp identity show --resource-group supporthub-rg --name supporthub-app-unique-name --query principalId -o tsv)

az keyvault set-policy \
    --name supporthub-keyvault \
    --object-id $PRINCIPAL_ID \
    --secret-permissions get

# Reference secrets in app settings
az webapp config appsettings set \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --settings \
        DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://supporthub-keyvault.vault.azure.net/secrets/DatabaseURL/)" \
        SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://supporthub-keyvault.vault.azure.net/secrets/SessionSecret/)"
```

### Application Insights Monitoring

```bash
# Create Application Insights
az monitor app-insights component create \
    --app supporthub-insights \
    --location eastus \
    --resource-group supporthub-rg

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show --app supporthub-insights --resource-group supporthub-rg --query instrumentationKey -o tsv)

# Configure App Service
az webapp config appsettings set \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name \
    --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### Auto Scaling

```bash
# Enable auto-scaling for App Service
az monitor autoscale create \
    --resource-group supporthub-rg \
    --resource /subscriptions/{subscription-id}/resourceGroups/supporthub-rg/providers/Microsoft.Web/serverfarms/supporthub-plan \
    --name supporthub-autoscale \
    --min-count 1 \
    --max-count 5 \
    --count 2

# Add scale-out rule
az monitor autoscale rule create \
    --resource-group supporthub-rg \
    --autoscale-name supporthub-autoscale \
    --condition "Percentage CPU > 70 avg 5m" \
    --scale out 1

# Add scale-in rule
az monitor autoscale rule create \
    --resource-group supporthub-rg \
    --autoscale-name supporthub-autoscale \
    --condition "Percentage CPU < 30 avg 10m" \
    --scale in 1
```

### Backup Strategy

**Database Backups:**
```bash
# Azure Database for PostgreSQL has automatic backups
# Configure backup retention
az postgres server update \
    --resource-group supporthub-rg \
    --name supporthub-db-server \
    --backup-retention 14

# Create manual backup
az postgres server replica create \
    --name supporthub-db-replica \
    --source-server supporthub-db-server \
    --resource-group supporthub-rg
```

**Application Backups:**
```bash
# Create storage account for backups
az storage account create \
    --name supporthubbackups \
    --resource-group supporthub-rg \
    --location eastus \
    --sku Standard_LRS

# Enable App Service backup
az webapp config backup update \
    --resource-group supporthub-rg \
    --webapp-name supporthub-app-unique-name \
    --container-url "https://supporthubbackups.blob.core.windows.net/backups" \
    --frequency 1 \
    --retain-one true \
    --retention 30
```

### Traffic Manager (Multi-region)

```bash
# Create Traffic Manager profile
az network traffic-manager profile create \
    --resource-group supporthub-rg \
    --name supporthub-tm \
    --routing-method Priority \
    --unique-dns-name supporthub-global

# Add endpoints
az network traffic-manager endpoint create \
    --resource-group supporthub-rg \
    --profile-name supporthub-tm \
    --name primary-endpoint \
    --type azureEndpoints \
    --target-resource-id /subscriptions/{subscription-id}/resourceGroups/supporthub-rg/providers/Microsoft.Web/sites/supporthub-app-unique-name \
    --priority 1
```

## 🆘 Troubleshooting

### Common Azure Issues

**Database Connection Issues:**
```bash
# Check firewall rules
az postgres server firewall-rule list \
    --resource-group supporthub-rg \
    --server-name supporthub-db-server

# Test connection
psql "host=supporthub-db-server.postgres.database.azure.com port=5432 dbname=supporthub user=supporthub@supporthub-db-server sslmode=require"
```

**App Service Issues:**
```bash
# View application logs
az webapp log tail \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name

# Check app settings
az webapp config appsettings list \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name

# Restart app
az webapp restart \
    --resource-group supporthub-rg \
    --name supporthub-app-unique-name
```

**SSL Certificate Issues:**
```bash
# Check certificate status
az webapp config ssl list \
    --resource-group supporthub-rg

# View certificate details
az webapp config ssl show \
    --resource-group supporthub-rg \
    --certificate-thumbprint <thumbprint>
```

### Cost Optimization

**Right-sizing resources:**
- Use Azure Advisor recommendations
- Monitor with Azure Monitor
- Consider reserved instances for production

**Database optimization:**
- Use Basic tier for development
- Enable auto-growth for storage
- Consider Azure Database for PostgreSQL Flexible Server

### Support Resources

- Azure Documentation: https://docs.microsoft.com/azure/
- Azure CLI Reference: https://docs.microsoft.com/cli/azure/
- Support tickets via Azure Portal

This completes the Azure deployment guide. Your SupportHub application should now be running on Azure with proper security, monitoring, and scaling capabilities.