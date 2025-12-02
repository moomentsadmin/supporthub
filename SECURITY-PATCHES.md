# Security Patches Implementation Guide

This document provides step-by-step instructions to implement security fixes identified in the audit.

## Quick Fix Script

Run this script to apply all critical security fixes:

```bash
#!/bin/bash
# security-fix.sh

echo "🔒 Applying SupportHub Security Fixes..."

# 1. Update vulnerable packages
echo "📦 Updating npm packages..."
npm audit fix
npm update express axios glob

# 2. Install security packages
echo "🛡️ Installing security middleware..."
npm install helmet cors express-rate-limit

echo "✅ Package updates complete!"
echo ""
echo "⚠️  Manual steps required:"
echo "1. Update server/index.ts with security middleware"
echo "2. Generate strong SESSION_SECRET"
echo "3. Change default passwords"
echo "4. Configure CORS whitelist"
echo ""
echo "See SECURITY-PATCHES.md for details"
```

## Patch 1: Fix NPM Vulnerabilities

### Install Updates
```bash
npm audit fix
npm update express axios glob
```

### Verify Fixes
```bash
npm audit
```

Expected: 0 high/critical vulnerabilities

---

## Patch 2: Add Security Middleware

### Install Required Packages
```bash
npm install helmet cors express-rate-limit
```

### Update server/index.ts

Add these imports at the top:
```typescript
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
```

Add middleware BEFORE routes:
```typescript
const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request Size Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', process.env.TRUST_PROXY === '1');
```

---

## Patch 3: Apply Rate Limiting

### Update server/index.ts

Add rate limiting to auth routes:
```typescript
import { rateLimiters } from './rate-limiter';

// Apply to specific routes BEFORE route registration
app.use('/api/admin/login', rateLimiters.auth);
app.use('/api/agent/login', rateLimiters.auth);
app.use('/api/customer/login', rateLimiters.auth);
app.use('/api/auth', rateLimiters.auth);

// Apply to ticket creation
app.use('/api/tickets', rateLimiters.ticketCreation);

// General API rate limiting
app.use('/api/', rateLimiters.api);
```

### Alternative: Express Rate Limit
If you prefer express-rate-limit package:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/admin/login', authLimiter);
app.use('/api/agent/login', authLimiter);
```

---

## Patch 4: Session Regeneration

### Update Login Handlers

For Admin Login (`server/admin-routes.ts`):
```typescript
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await storage.validateAdminUser(email, password);
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ message: 'Session error' });
      }
      
      req.session.adminUser = {
        id: admin.id,
        email: admin.email,
        role: admin.role
      };
      
      res.json({ admin: { ...admin, password: undefined } });
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});
```

Apply same pattern to:
- Agent login
- Customer login

---

## Patch 5: Default Password Warning

### Add Startup Check

Create `server/security-checks.ts`:
```typescript
import { getStorage } from './storage';

export async function runSecurityChecks() {
  const storage = getStorage();
  
  // Check for default passwords
  const defaultPasswords = [
    { email: 'admin@supporthub.com', type: 'Admin' },
    { email: 'agent@example.com', type: 'Agent' }
  ];
  
  console.log('🔒 Running security checks...');
  
  for (const { email, type } of defaultPasswords) {
    try {
      let user;
      if (type === 'Admin') {
        user = await storage.getAdminUserByEmail(email);
      } else {
        user = await storage.getAgentByEmail(email);
      }
      
      if (user) {
        console.warn(`⚠️  WARNING: Default ${type} account detected: ${email}`);
        console.warn(`   Please change the password immediately!`);
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Check SESSION_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET) {
      throw new Error('❌ SESSION_SECRET is required in production!');
    }
    if (process.env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  WARNING: SESSION_SECRET is too short. Use 64+ characters.');
    }
  }
  
  // Check DATABASE_URL has SSL
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.includes('sslmode=require')) {
      console.warn('⚠️  WARNING: DATABASE_URL should include sslmode=require');
    }
  }
  
  console.log('✅ Security checks complete\n');
}
```

### Call in server/index.ts:
```typescript
import { runSecurityChecks } from './security-checks';

(async () => {
  await runSecurityChecks();
  
  // ... rest of server setup
})();
```

---

## Patch 6: Force Password Change on First Login

### Add to Admin/Agent Models

Add field to schema:
```typescript
// shared/schema.ts
export const adminUsers = pgTable("admin_users", {
  // ... existing fields
  mustChangePassword: boolean("must_change_password").default(false),
  passwordChangedAt: timestamp("password_changed_at"),
});
```

### Update Login Response
```typescript
router.post('/login', async (req, res) => {
  // ... authentication
  
  if (admin.mustChangePassword) {
    return res.status(200).json({
      requirePasswordChange: true,
      admin: { ...admin, password: undefined }
    });
  }
  
  // Normal login flow
});
```

### Add Password Change Endpoint
```typescript
router.post('/change-password', async (req, res) => {
  const admin = req.session.adminUser;
  if (!admin) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // Validate current password
  const user = await storage.validateAdminUser(admin.email, currentPassword);
  if (!user) {
    return res.status(401).json({ message: 'Invalid current password' });
  }
  
  // Update password
  await storage.updateAdminUser(admin.id, {
    password: newPassword, // Will be hashed in storage layer
    mustChangePassword: false,
    passwordChangedAt: new Date()
  });
  
  res.json({ message: 'Password changed successfully' });
});
```

---

## Patch 7: Error Message Sanitization

### Create Error Handler Middleware

```typescript
// server/error-handler.ts
export function errorHandler(err: any, req: any, res: any, next: any) {
  console.error('Error:', err);
  
  // Log full error internally
  if (process.env.NODE_ENV === 'production') {
    // Generic error in production
    res.status(err.status || 500).json({
      message: 'An error occurred processing your request',
      requestId: req.id // Add request ID for tracking
    });
  } else {
    // Detailed error in development
    res.status(err.status || 500).json({
      message: err.message,
      stack: err.stack,
      details: err
    });
  }
}
```

### Add to server/index.ts:
```typescript
import { errorHandler } from './error-handler';

// ... routes

// Error handler (must be last)
app.use(errorHandler);
```

---

## Patch 8: File Upload Security

### Update multer configuration:

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Allowed extensions
    const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.txt', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Allowed MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip'
    ];
    
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  }
});
```

---

## Patch 9: Generate Strong SESSION_SECRET

### For Production Deployment:

```bash
# Generate using OpenSSL
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Or using PowerShell (Windows)
[Convert]::ToBase64String((1..64|%{Get-Random -Max 256}))
```

Add to `.env`:
```bash
SESSION_SECRET=<generated-secret-here>
```

---

## Patch 10: CORS Whitelist Configuration

### Update .env:
```bash
# Development
CORS_ORIGIN=http://localhost:3000,http://localhost:5000

# Production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Update CORS config:
```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## Verification Steps

After applying all patches:

### 1. Run Security Audit
```bash
npm audit
# Should show 0 high/critical vulnerabilities
```

### 2. Test Rate Limiting
```bash
# Try login 6 times rapidly
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
  
# 6th request should return 429 Too Many Requests
```

### 3. Verify Security Headers
```bash
curl -I https://yourdomain.com/
# Should see: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
```

### 4. Test CORS
```bash
curl -H "Origin: https://evil.com" https://yourdomain.com/api/health
# Should be blocked
```

### 5. Check Session Security
```bash
# Verify cookies have secure flags in production
```

---

## Deployment Checklist

Before going live:

- [ ] All npm vulnerabilities fixed (`npm audit`)
- [ ] Security middleware installed and configured
- [ ] Rate limiting applied to auth endpoints
- [ ] Session regeneration on login implemented
- [ ] Default passwords changed or removed
- [ ] Strong SESSION_SECRET generated and set
- [ ] CORS whitelist configured
- [ ] Error messages sanitized for production
- [ ] File upload validation implemented
- [ ] Security headers verified
- [ ] HTTPS/SSL certificates installed
- [ ] Database using SSL connection
- [ ] Monitoring and alerting configured

---

## Rollback Plan

If issues occur after deployment:

1. **Quick Rollback**: Revert to previous deployment
2. **Package Rollback**: Use `package-lock.json` to restore exact versions
3. **Configuration Rollback**: Keep backup of working `.env` file

---

## Support

For implementation questions:
- Review `SECURITY.md` for detailed security guidelines
- Check `SECURITY-AUDIT-REPORT.md` for vulnerability details
- Contact: security@yourdomain.com
