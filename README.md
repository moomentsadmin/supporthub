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

### 💬 Communication Features
- **Rich Text Messaging** - HTML-formatted responses with attachments
- **Email Integration** - SendGrid integration
- **SMS Support** - Twilio integration
- **File Attachments** - Support for documents, images, and media files
- **Response Templates** - Pre-defined responses for common inquiries

### 👥 User Management
- **Role-Based Access** - Admin, Agent, and Customer role separation
- **Session Management** - Secure authentication with session persistence

## 🚀 Technology Stack

### Frontend
- **React 18** with TypeScript & Vite
- **Tailwind CSS** with **shadcn/ui** components
- **TanStack Query** for state management

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **Node.js 20+**

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** reverse proxy (with Let's Encrypt SSL support)

## 🐳 Deployment

SupportHub is deployed via Docker Compose. Four production configurations are supported:

| Setup | Compose File | Script | Use When |
|-------|-------------|--------|----------|
| SSL + Internal DB | `compose.production.yml` | `./scripts/deploy.sh` | Server directly on internet |
| SSL + Managed DB | `compose.production.yml` (edit) | `./scripts/deploy.sh` | RDS / Azure / DO database |
| No-SSL + Internal DB | `compose.nossl.yml` | `./scripts/deploy-nossl.sh` | Behind Nginx Proxy Manager / Traefik |
| No-SSL + Managed DB | `compose.nossl.yml` (edit) | `./scripts/deploy-nossl.sh` | Proxy + managed database |

### Quick Start

```bash
# 1. Clone and configure
git clone <repository_url> supporthub && cd supporthub
cp .env.example .env
nano .env   # Fill in required values (see below)

# 2a. Deploy WITH SSL (Let's Encrypt — server must have a real domain)
chmod +x scripts/deploy.sh && ./scripts/deploy.sh

# 2b. Deploy WITHOUT SSL (behind Nginx Proxy Manager, Traefik, Cloudflare, etc.)
chmod +x scripts/deploy-nossl.sh && ./scripts/deploy-nossl.sh
```

### Minimum `.env` for Internal DB

```env
NODE_ENV=production
DOMAIN=yourdomain.com
EMAIL=you@yourdomain.com
SESSION_SECRET=<openssl rand -base64 48>
TRUST_PROXY=1

POSTGRES_USER=supporthub
POSTGRES_PASSWORD=<openssl rand -base64 32>
POSTGRES_DB=supporthub
DATABASE_URL=postgresql://supporthub:<same-password>@db:5432/supporthub
```

### Minimum `.env` for Managed DB (RDS / Azure / DO)

```env
NODE_ENV=production
DOMAIN=yourdomain.com
EMAIL=you@yourdomain.com
SESSION_SECRET=<openssl rand -base64 48>
TRUST_PROXY=1

DATABASE_URL=postgresql://user:password@your-db-host:5432/supporthub?sslmode=require
```

> See [docs/deploy/PRODUCTION_GUIDE.md](docs/deploy/PRODUCTION_GUIDE.md) for full instructions including managed DB compose edits, proxy configuration examples, and maintenance commands.

### Local Development

```bash
# Uses self-signed certificate on https://localhost
docker compose -f compose.dev.yml up -d --build
```

## 🔒 Default Credentials

| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| Admin | `/admin` | `admin@supporthub.com` | `admin123` |
| Agent | `/` | `agent@example.com` | `password123` |

> ⚠️ Change both passwords immediately after first login.

## 📚 Documentation

- [Production Deployment Guide](docs/deploy/PRODUCTION_GUIDE.md) — all deployment paths, proxy setup, maintenance
- [Database Configuration](docs/deploy/database.md) — managed DB setup for all providers
- [Troubleshooting](docs/deploy/troubleshooting.md)

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.