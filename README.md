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

We support deploying SupportHub via Docker, which is the recommended method for consistent environments.

### 1. Prerequisites
- Docker and Docker Compose installed
- A `.env` file configured (copy from `.env.example` and update values)

### 2. Configuration (`.env`)
Ensure you set the following in your `.env` file:
```bash
DATABASE_URL=postgresql://supporthub:securepassword123@db:5432/supporthub
SESSION_SECRET=your_secure_random_string
DOMAIN=your-domain.com # For SSL deployment
EMAIL=admin@your-domain.com # For SSL certificate notifications
```

### 3. Deployment Options

#### Option A: SSL Deployment (Recommended Production)
Automatically sets up Nginx with Let's Encrypt for HTTPS. Ideal for direct internet exposure.

```bash
docker-compose -f compose.production.yml up -d --build
```
> The application will be available at `https://your-domain.com`.

#### Option B: Non-SSL Deployment (Behind Load Balancer)
If you are terminating SSL elsewhere (e.g. AWS ALB, Cloudflare), use this lighter configuration which exposes the app on port 5000.

```bash
docker-compose -f compose.nossl.yml up -d --build
```
> The application will be available at `http://your-server-ip:5000`.

#### Option C: Local Development with Docker
For testing and development on your local machine. Mounts source code for live updates.

```bash
# Uses self-signed certificate for https://localhost
docker-compose -f compose.dev.yml up -d --build
```
> Access at `https://localhost` (accept the self-signed certificate warning).

## 🔒 Default Credentials

**Admin Portal**: `/admin`
- Email: `admin@supporthub.com`
- Password: `admin123`

**Agent Portal**: `/agent`
- Email: `agent@supporthub.com`
- Password: `agent123`

> ⚠️ **IMPORTANT**: Change these passwords immediately upon deployment!

## 📚 Documentation

For advanced platform-specific deployment guides (AWS, Azure, Digital Ocean), refer to the `docs/deploy/` directory.

- [Troubleshooting Guide](docs/deploy/troubleshooting.md)
- [Database Configuration](docs/deploy/database.md)

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.