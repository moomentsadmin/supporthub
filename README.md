# SupportHub 🎫

A comprehensive customer support ticket management system built with modern web technologies. SupportHub provides a centralized platform for managing customer inquiries across multiple communication channels including email, WhatsApp, Twitter, and Facebook.

![SupportHub Dashboard](https://via.placeholder.com/800x400?text=SupportHub+Dashboard)

## ✨ Features

### 🎯 Core Functionality
- **Multi-Channel Support** - Handle tickets from email, WhatsApp, Twitter, Facebook
- **Real-time Ticket Management** - Create, assign, update, and resolve tickets efficiently
- **Agent Dashboard** - Comprehensive view of assigned tickets and workload
- **Customer Portal** - Self-service portal for customers to track tickets
- **Admin Control Panel** - Complete system administration and configuration

### 📊 Ticket Management
- **Priority System** - Low, Medium, High priority categorization
- **Status Tracking** - Open, In-Progress, Resolved, Closed workflow
- **Agent Assignment** - Manual and automatic ticket assignment
- **Escalation System** - Automated escalation based on priority and time
- **Bulk Operations** - Handle multiple tickets simultaneously

### 💬 Communication Features
- **Rich Text Messaging** - HTML-formatted responses with attachments
- **Email Integration** - SendGrid integration for automated notifications
- **SMS Support** - Twilio integration for SMS communications
- **File Attachments** - Support for documents, images, and media files
- **Response Templates** - Pre-defined responses for common inquiries

### 👥 User Management
- **Role-Based Access** - Admin, Agent, and Customer role separation
- **Agent Profiles** - Individual agent management and performance tracking
- **Team Collaboration** - Internal notes and agent-to-agent communication
- **Session Management** - Secure authentication with session persistence

### 📈 Analytics & Reporting
- **Dashboard Metrics** - Real-time statistics and KPIs
- **Performance Analytics** - Agent performance and response time tracking
- **Ticket Analytics** - Volume trends and resolution metrics
- **Custom Reports** - Exportable data for business intelligence

### 🔧 Administrative Features
- **System Configuration** - Email settings, notification preferences
- **Channel Management** - Configure communication channels and integrations
- **Knowledge Base** - Internal documentation and FAQ management
- **System Logs** - Comprehensive logging and audit trails
- **Backup & Restore** - Automated backup system with easy restoration

## 🚀 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with **shadcn/ui** components
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **Radix UI** for accessible components

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** for production database
- **In-memory fallback** for development
- **Session-based authentication** with bcrypt
- **Multer** for file uploads

### Infrastructure
- **Node.js 20+** runtime
- **PM2** for production process management
- **Nginx** reverse proxy configuration
- **Docker** containerization support
- **SSL/TLS** security with Let's Encrypt

### External Integrations
- **SendGrid** - Email delivery service
- **Twilio** - SMS and WhatsApp messaging
- **PostgreSQL** - Database (Neon, Supabase, AWS RDS, etc.)
- **Object Storage** - File attachment storage

## 📦 Deployment Options

### 🖥️ Traditional Server Deployment

#### Ubuntu Server
Perfect for VPS deployments with full control:
```bash
# Quick setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx postgresql

# Deploy application
tar -xzf supporthub_backup.tar.gz
npm ci --production
npm run build
npm run db:push
pm2 start ecosystem.prod.config.js --env production
```

**Features:**
- Full server control
- Custom configurations
- Cost-effective for high usage
- Manual scaling

[📖 Full Ubuntu Guide](docs/deploy/ubuntu.md)

### ☁️ Cloud Platform Deployment

#### Digital Ocean
Managed services with excellent developer experience:

**Option 1: Droplet + Managed Database**
```bash
# Create managed PostgreSQL
doctl databases create supporthub-db --engine postgres --version 14

# Deploy to droplet
doctl compute droplet create supporthub-app --image ubuntu-22-04-x64
```

**Option 2: Docker Deployment**
```bash
# Use provided Docker configuration
docker-compose -f compose.external-db.yml up -d
```

**Features:**
- Simple pricing
- Managed database with backups
- One-click scaling
- Excellent documentation

[📖 Full Digital Ocean Guide](docs/deploy/digitalocean.md)

#### Amazon Web Services (AWS)
Enterprise-grade deployment with maximum scalability:

**Option 1: EC2 + RDS**
```bash
# Create RDS PostgreSQL
aws rds create-db-instance --db-instance-identifier supporthub-db \
    --engine postgres --db-instance-class db.t3.micro

# Launch EC2 instance
aws ec2 run-instances --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.small
```

**Option 2: ECS Fargate (Serverless)**
```bash
# Deploy containerized application
aws ecs create-service --cluster supporthub-cluster \
    --service-name supporthub --launch-type FARGATE
```

**Option 3: App Runner (Fully Managed)**
```bash
# Fully managed deployment
aws apprunner create-service --service-name supporthub
```

**Features:**
- Global infrastructure
- Auto-scaling capabilities
- Comprehensive monitoring
- Enterprise security

[📖 Full AWS Guide](docs/deploy/aws.md)

#### Microsoft Azure
Integrated Microsoft ecosystem deployment:

**Option 1: App Service + Azure Database**
```bash
# Create PostgreSQL server
az postgres server create --name supporthub-db-server \
    --resource-group supporthub-rg

# Create App Service
az webapp create --name supporthub-app --plan supporthub-plan \
    --runtime "NODE|20-lts"
```

**Option 2: Virtual Machine**
```bash
# Create Ubuntu VM
az vm create --name supporthub-vm --image Ubuntu2204 \
    --admin-username azureuser
```

**Option 3: Container Instances**
```bash
# Serverless containers
az container create --name supporthub-container \
    --image supporthub:latest --cpu 1 --memory 2
```

**Features:**
- Microsoft ecosystem integration
- Enterprise Active Directory support
- Hybrid cloud capabilities
- Advanced security features

[📖 Full Azure Guide](docs/deploy/azure.md)

### 🐳 Docker Deployment

#### Internal Database (Development/Small Production)
```bash
# Use internal PostgreSQL container
docker-compose -f compose.internal-db.yml up -d
```

#### External Database (Production)
```bash
# Use managed database service
docker-compose -f compose.external-db.yml up -d
```

**Features:**
- Consistent environments
- Easy scaling
- Container orchestration
- Portable deployments

## 🗄️ Database Options

### Managed Database Services (Recommended)

| Provider | Pricing | Features | Best For |
|----------|---------|----------|----------|
| **AWS RDS** | $15+/month | Multi-AZ, automated backups | Enterprise, high availability |
| **Digital Ocean** | $15+/month | Simple setup, automated maintenance | Startups, developers |
| **Azure Database** | $18+/month | Azure integration, security | Microsoft ecosystem |
| **Google Cloud SQL** | $17+/month | Global availability, auto-scaling | Google services integration |
| **Supabase** | Free tier available | Built-in features, real-time | Rapid prototyping |
| **Neon** | Free tier available | Serverless, database branching | Development, scaling |

### Self-Hosted Options

#### Local PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo -u postgres createuser supporthub
sudo -u postgres createdb supporthub
```

#### Docker PostgreSQL
```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: supporthub
      POSTGRES_USER: supporthub
      POSTGRES_PASSWORD: secure_password
```

[📖 Complete Database Guide](docs/deploy/database.md)

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Domain name (for production)

### Development Setup
```bash
# 1. Clone and setup
git clone https://github.com/yourusername/supporthub.git
cd supporthub
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database and API keys

# 3. Setup database
npm run db:push

# 4. Start development server
npm run dev
```

### Production Deployment
```bash
# 1. Build application
npm run build

# 2. Start with PM2
pm2 start ecosystem.prod.config.js --env production

# 3. Setup reverse proxy (Nginx)
sudo cp configs/nginx-host.conf /etc/nginx/sites-available/supporthub
sudo ln -s /etc/nginx/sites-available/supporthub /etc/nginx/sites-enabled/

# 4. Setup SSL
sudo certbot --nginx -d yourdomain.com
```

## 🔧 Configuration

### Environment Variables

#### Required Settings
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Security
SESSION_SECRET=your-very-long-random-session-secret-here
NODE_ENV=production

# Application
PORT=5000
TRUST_PROXY=1
```

#### Email Configuration (SendGrid)
```bash
SENDGRID_API_KEY=SG.your_api_key_here
VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
```

#### SMS Configuration (Twilio)
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

[📖 Complete Configuration Guide](.env.production.example)

## 📚 Documentation

### Deployment Guides
- [Ubuntu Server Deployment](docs/deploy/ubuntu.md)
- [Digital Ocean Deployment](docs/deploy/digitalocean.md)
- [AWS Deployment](docs/deploy/aws.md)
- [Azure Deployment](docs/deploy/azure.md)
- [Database Configuration](docs/deploy/database.md)
- [Troubleshooting Guide](docs/deploy/troubleshooting.md)

### API Documentation
- **Health Check**: `GET /api/health`
- **Tickets API**: `GET|POST|PUT|DELETE /api/tickets`
- **Agents API**: `GET|POST|PUT|DELETE /api/agents`
- **Messages API**: `GET|POST /api/messages`
- **Admin API**: `GET|POST|PUT|DELETE /api/admin/*`

### Default Credentials
```
Admin Portal: /admin
Username: admin@supporthub.com
Password: admin123

Agent Portal: /agent  
Username: agent@supporthub.com
Password: agent123
```

## 🔒 Security Features

### Authentication & Authorization
- **Session-based authentication** with secure cookies
- **Role-based access control** (Admin, Agent, Customer)
- **Password hashing** with bcrypt
- **CSRF protection** via session middleware

### Data Security
- **SSL/TLS encryption** for all communications
- **Database encryption** at rest and in transit
- **Input validation** using Zod schemas
- **SQL injection prevention** via parameterized queries

### Infrastructure Security
- **Firewall configuration** guides for all platforms
- **Rate limiting** for API endpoints
- **Security headers** (HSTS, CSP, X-Frame-Options)
- **Environment variable** management for secrets

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Application health check
curl http://localhost:5000/api/health

# Process monitoring
pm2 monit

# System resources
htop && df -h
```

### Backup Strategy
```bash
# Automated backups
./scripts/backup.sh

# Database backups
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
./scripts/restore.sh backup_file.tar.gz
```

### Log Management
- **Application logs**: PM2 log rotation
- **System logs**: journalctl integration
- **Error tracking**: Structured error logging
- **Performance monitoring**: Query performance analysis

## 🤝 Contributing

### Development Guidelines
1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code style**: ESLint + Prettier configuration
4. **Write tests**: Unit and integration tests
5. **Update documentation**: Keep README and docs current
6. **Submit pull request**: Detailed description of changes

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Database**: Drizzle ORM with type-safe queries
- **Styling**: Tailwind CSS with component composition

### Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A and suggestions
- **Documentation**: Comprehensive deployment guides

### Professional Support
- **Consulting**: Custom deployment and configuration
- **Training**: Team training and best practices
- **Priority Support**: SLA-based support packages

### Troubleshooting
Common issues and solutions are documented in our [Troubleshooting Guide](docs/deploy/troubleshooting.md).

For deployment-specific issues, check the platform-specific guides:
- [Ubuntu Issues](docs/deploy/ubuntu.md#troubleshooting)
- [Digital Ocean Issues](docs/deploy/digitalocean.md#troubleshooting)
- [AWS Issues](docs/deploy/aws.md#troubleshooting)
- [Azure Issues](docs/deploy/azure.md#troubleshooting)

## 🎯 Roadmap

### Upcoming Features
- [ ] **Mobile App** - iOS and Android applications
- [ ] **Advanced Analytics** - Custom dashboards and reporting
- [ ] **AI Integration** - Automated response suggestions
- [ ] **Multi-language Support** - Internationalization
- [ ] **Advanced Workflows** - Custom automation rules
- [ ] **Integration Marketplace** - Third-party service connectors

### Performance Improvements
- [ ] **Caching Layer** - Redis integration for performance
- [ ] **CDN Integration** - Asset delivery optimization
- [ ] **Database Optimization** - Query performance enhancements
- [ ] **Auto-scaling** - Dynamic resource allocation

---

**Built with ❤️ for customer support teams worldwide**

*SupportHub - Simplifying customer support, one ticket at a time.*