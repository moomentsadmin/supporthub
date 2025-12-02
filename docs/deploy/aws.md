# AWS Deployment Guide

Complete guide for deploying SupportHub on Amazon Web Services using various service combinations.

## 🚀 Deployment Options

### Option 1: EC2 + RDS (Recommended for production)
- **Compute**: EC2 t3.small+ instance
- **Database**: RDS PostgreSQL
- **Storage**: EBS volumes
- **Benefits**: Full control, scalable, managed database

### Option 2: ECS Fargate + RDS (Serverless containers)
- **Compute**: ECS Fargate
- **Database**: RDS PostgreSQL
- **Storage**: EFS for shared files
- **Benefits**: Serverless, auto-scaling, managed infrastructure

### Option 3: App Runner + RDS (Fully managed)
- **Compute**: AWS App Runner
- **Database**: RDS PostgreSQL
- **Benefits**: Fully managed, automatic deployments

## 📋 Option 1: EC2 + RDS Deployment

### Step 1: Create RDS PostgreSQL Database

**Using AWS CLI:**
```bash
# Create RDS subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name supporthub-subnet-group \
    --db-subnet-group-description "SupportHub DB subnet group" \
    --subnet-ids subnet-12345678 subnet-87654321

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
    --db-subnet-group-name supporthub-subnet-group \
    --backup-retention-period 7 \
    --publicly-accessible \
    --storage-encrypted
```

**Using AWS Console:**
1. Go to RDS → Create database
2. Choose PostgreSQL, version 14.x
3. Templates: Production (or Dev/Test for smaller deployments)
4. DB instance identifier: `supporthub-db`
5. Master username: `supporthub`
6. Master password: Strong password
7. Instance class: `db.t3.micro` (or larger)
8. Storage: 20 GB, enable auto-scaling
9. VPC: Default or custom VPC
10. Public access: Yes (for initial setup)
11. VPC security group: Create new or use existing
12. Enable automated backups

### Step 2: Configure Security Groups

**Database Security Group:**
```bash
# Create security group for RDS
aws ec2 create-security-group \
    --group-name supporthub-db-sg \
    --description "SupportHub Database Security Group"

# Allow PostgreSQL access from application security group
aws ec2 authorize-security-group-ingress \
    --group-id sg-db-12345678 \
    --protocol tcp \
    --port 5432 \
    --source-group sg-app-87654321
```

**Application Security Group:**
```bash
# Create security group for EC2
aws ec2 create-security-group \
    --group-name supporthub-app-sg \
    --description "SupportHub Application Security Group"

# Allow HTTP, HTTPS, and SSH
aws ec2 authorize-security-group-ingress \
    --group-id sg-app-87654321 \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-app-87654321 \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id sg-app-87654321 \
    --protocol tcp \
    --port 22 \
    --cidr your.ip.address/32
```

### Step 3: Launch EC2 Instance

**Using AWS CLI:**
```bash
# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --count 1 \
    --instance-type t3.small \
    --key-name your-key-pair \
    --security-group-ids sg-app-87654321 \
    --subnet-id subnet-12345678 \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SupportHub-App}]'
```

**Using AWS Console:**
1. Go to EC2 → Launch Instance
2. Choose Amazon Linux 2 or Ubuntu 22.04 LTS
3. Instance type: t3.small (or larger)
4. Key pair: Select existing or create new
5. Network: Select VPC and subnet
6. Security group: Use created application security group
7. Storage: 20 GB gp3 volume
8. Advanced details → User data (optional initialization script)

### Step 4: Setup EC2 Instance

**SSH into your instance:**
```bash
ssh -i your-key.pem ec2-user@your-instance-ip

# For Ubuntu instances:
ssh -i your-key.pem ubuntu@your-instance-ip
```

**Install required packages:**
```bash
# Update system (Amazon Linux)
sudo yum update -y

# For Ubuntu:
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# For Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other requirements
sudo yum install -y nginx git
# For Ubuntu: sudo apt install -y nginx git

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL client for testing
sudo yum install -y postgresql
# For Ubuntu: sudo apt install -y postgresql-client
```

### Step 5: Deploy Application

**Setup application:**
```bash
# Create application directory
sudo mkdir -p /var/www/supporthub
sudo chown $USER:$USER /var/www/supporthub

# Deploy application
cd /var/www/supporthub

# Upload and extract backup
# (Use scp to upload your backup file)
scp -i your-key.pem supporthub_backup.tar.gz ec2-user@your-instance-ip:/var/www/supporthub/
tar -xzf supporthub_backup.tar.gz

# Install dependencies
npm ci --production

# Configure environment
cp .env.production.example .env
nano .env
```

**Configure .env with RDS connection:**
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://supporthub:YourSecurePassword123@supporthub-db.region.rds.amazonaws.com/postgres?sslmode=require
SESSION_SECRET=your_very_long_random_session_secret_here
TRUST_PROXY=1
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
SENDGRID_API_KEY=your_sendgrid_api_key
```

**Test database connection:**
```bash
psql "postgresql://supporthub:YourSecurePassword123@supporthub-db.region.rds.amazonaws.com/postgres?sslmode=require" -c "SELECT version();"
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

### Step 6: Configure Nginx and SSL

**Setup Nginx:**
```bash
# Create Nginx configuration
sudo cp configs/nginx-host.conf /etc/nginx/conf.d/supporthub.conf

# Edit configuration
sudo nano /etc/nginx/conf.d/supporthub.conf
# Replace 'your-domain.com' with your actual domain

# Test configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Setup SSL with Let's Encrypt:**
```bash
# Install Certbot
sudo amazon-linux-extras install epel -y
sudo yum install -y certbot python3-certbot-nginx

# For Ubuntu:
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 7: Configure Load Balancer (Optional)

**Create Application Load Balancer:**
```bash
# Create target group
aws elbv2 create-target-group \
    --name supporthub-targets \
    --protocol HTTP \
    --port 5000 \
    --vpc-id vpc-12345678 \
    --health-check-path /api/health

# Register targets
aws elbv2 register-targets \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/supporthub-targets \
    --targets Id=i-1234567890abcdef0

# Create load balancer
aws elbv2 create-load-balancer \
    --name supporthub-alb \
    --subnets subnet-12345678 subnet-87654321 \
    --security-groups sg-alb-12345678
```

## 📋 Option 2: ECS Fargate Deployment

### Step 1: Create ECS Infrastructure

**Create ECS cluster:**
```bash
aws ecs create-cluster --cluster-name supporthub-cluster
```

**Create task definition:**
```json
{
  "family": "supporthub",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "supporthub",
      "image": "your-account.dkr.ecr.region.amazonaws.com/supporthub:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "5000"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:region:account:secret:supporthub/database"},
        {"name": "SESSION_SECRET", "valueFrom": "arn:aws:secretsmanager:region:account:secret:supporthub/session"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supporthub",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 2: Build and Push Docker Image

**Setup ECR repository:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name supporthub

# Get login token
aws ecr get-login-password --region region | docker login --username AWS --password-stdin your-account.dkr.ecr.region.amazonaws.com

# Build and push image
docker build -f Dockerfile.prod -t supporthub .
docker tag supporthub:latest your-account.dkr.ecr.region.amazonaws.com/supporthub:latest
docker push your-account.dkr.ecr.region.amazonaws.com/supporthub:latest
```

### Step 3: Create ECS Service

```bash
# Create ECS service
aws ecs create-service \
    --cluster supporthub-cluster \
    --service-name supporthub-service \
    --task-definition supporthub:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-12345678],assignPublicIp=ENABLED}"
```

## 📋 Option 3: AWS App Runner

### Step 1: Create App Runner Service

**Create apprunner.yaml:**
```yaml
version: 1.0
runtime: nodejs20
build:
  commands:
    build:
      - npm ci --production
      - npm run build
run:
  runtime-version: 20
  command: npm start
  network:
    port: 5000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

**Deploy via App Runner:**
```bash
# Create App Runner service
aws apprunner create-service \
    --service-name supporthub \
    --source-configuration '{
        "CodeRepository": {
            "RepositoryUrl": "https://github.com/yourusername/supporthub",
            "SourceCodeVersion": {
                "Type": "BRANCH",
                "Value": "main"
            },
            "CodeConfiguration": {
                "ConfigurationSource": "REPOSITORY"
            }
        }
    }' \
    --instance-configuration '{
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
    }'
```

## 🔧 AWS-Specific Features

### Secrets Manager Integration

**Store sensitive configuration:**
```bash
# Store database URL
aws secretsmanager create-secret \
    --name supporthub/database \
    --secret-string "postgresql://user:pass@host:5432/db?sslmode=require"

# Store session secret
aws secretsmanager create-secret \
    --name supporthub/session \
    --secret-string "your-very-long-session-secret"
```

### CloudWatch Monitoring

**Setup CloudWatch alarms:**
```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "SupportHub-High-CPU" \
    --alarm-description "SupportHub high CPU utilization" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
    --evaluation-periods 2
```

### Auto Scaling

**Create Auto Scaling Group (for EC2):**
```bash
# Create launch template
aws ec2 create-launch-template \
    --launch-template-name supporthub-template \
    --launch-template-data '{
        "ImageId": "ami-0c02fb55956c7d316",
        "InstanceType": "t3.small",
        "KeyName": "your-key-pair",
        "SecurityGroupIds": ["sg-12345678"],
        "UserData": "base64-encoded-startup-script"
    }'

# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name supporthub-asg \
    --launch-template LaunchTemplateName=supporthub-template \
    --min-size 1 \
    --max-size 5 \
    --desired-capacity 2 \
    --vpc-zone-identifier "subnet-12345678,subnet-87654321"
```

### Backup Strategy

**RDS Automated Backups:**
- Automatic daily backups (configured during RDS creation)
- Point-in-time recovery up to 35 days
- Manual snapshots for major releases

**Application Backups to S3:**
```bash
# Create S3 bucket for backups
aws s3 mb s3://supporthub-backups-unique-name

# Backup script using AWS CLI
cat > /usr/local/bin/backup-to-s3.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/supporthub_backup_$DATE.tar.gz"

# Create backup
tar -czf $BACKUP_FILE -C /var/www supporthub

# Upload to S3
aws s3 cp $BACKUP_FILE s3://supporthub-backups-unique-name/

# Clean up local backup
rm $BACKUP_FILE

echo "Backup uploaded to S3: supporthub_backup_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-to-s3.sh

# Schedule via cron
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-to-s3.sh
```

## 🆘 Troubleshooting

### Common AWS Issues

**RDS Connection Issues:**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-12345678

# Test connection
telnet your-rds-endpoint.region.rds.amazonaws.com 5432

# Check VPC routing
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-12345678"
```

**EC2 Instance Issues:**
```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0

# View system logs
aws ec2 get-console-output --instance-id i-1234567890abcdef0

# Connect via Session Manager (if configured)
aws ssm start-session --target i-1234567890abcdef0
```

**ECS Service Issues:**
```bash
# Check service status
aws ecs describe-services --cluster supporthub-cluster --services supporthub-service

# View logs
aws logs tail /ecs/supporthub --follow
```

### Cost Optimization

**Right-sizing instances:**
- Use AWS Compute Optimizer recommendations
- Monitor CloudWatch metrics for actual usage
- Consider Reserved Instances for predictable workloads

**Database optimization:**
- Use db.t3 burstable instances for development
- Enable storage auto-scaling
- Consider Aurora Serverless for variable workloads

This completes the AWS deployment guide. Your SupportHub application should now be running on AWS with proper security, monitoring, and scaling capabilities.