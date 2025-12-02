import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { registerExtendedRoutes } from "./routes-extended";
import { createAdminRoutes } from "./admin-routes";
import { registerCustomerRoutes } from "./customer-routes";
import { log } from "./logger";
import { validateDatabaseConnection } from "./db";
import { runSecurityChecks } from "./security-checks";

const app = express();

// Trust proxy for rate limiting and proper IP detection behind nginx
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : 0);

// Security Headers - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // eval needed for Vite dev
      connectSrc: ["'self'", "ws:", "wss:"], // WebSocket for dev
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
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
}));

// Request Size Limits (prevent DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session configuration
const PgSession = connectPgSimple(session);

// Validate session secret in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: true,
  saveUninitialized: false, // Don't save uninitialized sessions
  name: 'connect.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
    domain: undefined,
    path: '/'
  }
};

// Use database session store if available, otherwise fallback to memory store
if (process.env.DATABASE_URL) {
  try {
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true, // Auto-create sessions table
      tableName: 'sessions'
    });
  } catch (error) {
    console.log('Database session store failed, using memory store');
    // Will use default memory store
  }
} else {
  console.log('No DATABASE_URL, using memory session store');
}

app.use(session(sessionConfig));

// Simple session debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Session ID: ${req.sessionID || 'none'} - Admin: ${(req.session as any)?.adminUser?.email || 'none'}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});


(async () => {
  // Run security checks before starting server
  await runSecurityChecks();

  // Import rate limiters
  const { rateLimiters } = await import('./rate-limiter');


  // Log database connection status
  const dbConnected = validateDatabaseConnection();
  if (dbConnected) {
    log("Database connection validated successfully");
  } else {
    log("Warning: DATABASE_URL not found. Running with fallback storage.");
  }

  
  // Apply rate limiting to authentication endpoints
  app.use('/api/admin/login', rateLimiters.auth);
  app.use('/api/agent/login', rateLimiters.auth);
  app.use('/api/customer/login', rateLimiters.auth);
  app.use('/api/auth', rateLimiters.auth);
  
  // Apply rate limiting to ticket creation
  app.use('/api/tickets', rateLimiters.ticketCreation);
  
  // General API rate limiting
  app.use('/api/', rateLimiters.api);
  
  const server = await registerRoutes(app);
  registerExtendedRoutes(app, server);
  
  // Admin routes
  const { getStorage } = await import('./storage');
  const adminRoutes = createAdminRoutes(getStorage());
  app.use('/api/admin', adminRoutes);
  
  // Agent routes
  const { createAgentRoutes } = await import('./agent-routes');
  const agentRoutes = createAgentRoutes(getStorage());
  app.use('/api/agent', agentRoutes);
  
  registerCustomerRoutes(app);
  
  // Serve working admin login page
  app.get('/admin-login-working.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin-login-working.html'));
  });

  // Serve agent HTML pages directly (bypasses React router)
  app.get('/agent-login-working.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../agent-login-working.html'));
  });

  app.get('/agent-dashboard-working.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../agent-dashboard-working.html'));
  });
  
  // Serve standalone test page
  app.get('/test-logs', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/public/test-logs.html'));
  });

  // Serve admin logs HTML page directly
  app.get('/admin-logs-working.html', (req, res) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Admin System Logs - Working</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header h1 { margin: 0 0 8px 0; color: #1f2937; }
        .header p { margin: 0 0 16px 0; color: #6b7280; }
        .button { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; margin-right: 12px; font-weight: 500; text-decoration: none; display: inline-block; }
        .button:hover { background: #2563eb; }
        .button.secondary { background: #6b7280; }
        .button.secondary:hover { background: #4b5563; }
        .status { padding: 12px 16px; margin: 16px 0; border-radius: 8px; border-left: 4px solid; }
        .status.success { background: #f0f9ff; color: #0c4a6e; border-color: #0ea5e9; }
        .status.error { background: #fef2f2; color: #991b1b; border-color: #ef4444; }
        .status.info { background: #fefce8; color: #a16207; border-color: #eab308; }
        .logs-container { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
        .log-entry { border-bottom: 1px solid #f3f4f6; padding: 16px; }
        .log-entry:last-child { border-bottom: none; }
        .log-entry.info { border-left: 4px solid #3b82f6; }
        .log-entry.warn { border-left: 4px solid #f59e0b; }
        .log-entry.error { border-left: 4px solid #ef4444; }
        .log-entry.debug { border-left: 4px solid #6b7280; }
        .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .log-level { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
        .log-time { color: #6b7280; font-size: 0.875rem; }
        .log-details { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 0.875rem; margin-bottom: 8px; }
        .log-label { font-weight: 500; color: #374151; }
        .log-value { color: #6b7280; }
        .log-description { color: #1f2937; font-weight: 500; }
        .metadata { margin-top: 12px; }
        .metadata summary { cursor: pointer; font-weight: 500; color: #374151; }
        .metadata pre { background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 0.75rem; margin-top: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>System Logs - Admin Panel</h1>
            <p>Working admin logs with direct authentication bypass</p>
            <button class="button" onclick="establishSession()">Establish Session & Load Logs</button>
            <a href="/admin/login" class="button secondary">Back to Admin Login</a>
        </div>
        
        <div id="status"></div>
        <div id="logs"></div>
    </div>

    <script>
    let sessionEstablished = false;

    async function establishSession() {
        const status = document.getElementById('status');
        status.innerHTML = '<div class="status info">Establishing admin session...</div>';
        
        try {
            console.log('Starting admin session establishment...');
            
            // Step 1: Login
            const loginResp = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: 'admin@supporthub.com',
                    password: 'admin123'
                })
            });
            
            if (!loginResp.ok) {
                const errorData = await loginResp.json();
                throw new Error(\`Login failed: \${loginResp.status} - \${errorData.message || 'Unknown error'}\`);
            }
            
            const loginData = await loginResp.json();
            console.log('✓ Login successful:', loginData);
            
            // Step 2: Verify session
            const authResp = await fetch('/api/admin/me', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!authResp.ok) {
                throw new Error(\`Session verification failed: \${authResp.status}\`);
            }
            
            const adminData = await authResp.json();
            console.log('✓ Session verified:', adminData);
            sessionEstablished = true;
            
            status.innerHTML = \`<div class="status success">✓ Admin session established for \${adminData.email} (\${adminData.role})</div>\`;
            
            // Step 3: Load logs
            await loadLogs();
            
        } catch (error) {
            console.error('Session establishment failed:', error);
            status.innerHTML = \`<div class="status error">✗ Session establishment failed: \${error.message}</div>\`;
        }
    }

    async function loadLogs() {
        const logsContainer = document.getElementById('logs');
        const status = document.getElementById('status');
        
        try {
            status.innerHTML += '<div class="status info">Loading system logs...</div>';
            
            const response = await fetch('/api/admin/logs?limit=25', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(\`Failed to load logs: \${response.status} \${response.statusText}\`);
            }
            
            const logs = await response.json();
            console.log('Logs loaded:', logs?.length || 0, 'entries');
            
            if (!Array.isArray(logs) || logs.length === 0) {
                logsContainer.innerHTML = '<div class="status info">No logs found in the system database</div>';
                return;
            }
            
            status.innerHTML = \`<div class="status success">✓ Successfully loaded \${logs.length} log entries from the database</div>\`;
            
            logsContainer.innerHTML = \`
                <div class="logs-container">
                    <div style="padding: 16px; border-bottom: 1px solid #f3f4f6; background: #f9fafb;">
                        <h2 style="margin: 0; color: #1f2937;">System Logs (\${logs.length} entries)</h2>
                    </div>
                    \${logs.map(log => \`
                        <div class="log-entry \${log.level}">
                            <div class="log-header">
                                <span class="log-level \${log.level}">[\${log.level}]</span>
                                <span class="log-time">\${new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="log-details">
                                <span class="log-label">Action:</span>
                                <span class="log-value">\${log.action}</span>
                                <span class="log-label">Entity:</span>
                                <span class="log-value">\${log.entity}\${log.entityId ? ' (' + log.entityId + ')' : ''}</span>
                                <span class="log-label">User:</span>
                                <span class="log-value">\${log.userName || 'System'} \${log.userEmail ? '(' + log.userEmail + ')' : ''}</span>
                                <span class="log-label">User Type:</span>
                                <span class="log-value">\${log.userType}</span>
                            </div>
                            <div class="log-description">\${log.description}</div>
                            \${log.metadata ? \`
                                <div class="metadata">
                                    <details>
                                        <summary>View Metadata</summary>
                                        <pre>\${JSON.stringify(log.metadata, null, 2)}</pre>
                                    </details>
                                </div>
                            \` : ''}
                        </div>
                    \`).join('')}
                </div>
            \`;
            
        } catch (error) {
            console.error('Failed to load logs:', error);
            status.innerHTML = \`<div class="status error">✗ Failed to load logs: \${error.message}</div>\`;
            logsContainer.innerHTML = '';
        }
    }

    // Auto-establish session on page load
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Admin logs page loaded - establishing session...');
        establishSession();
    });
    </script>
</body>
</html>`;
    res.send(html);
  });

  // Initialize email polling for active email channels
  const { getEmailPoller } = await import('./email-poller');
  setTimeout(async () => {
    try {
      const storage = getStorage();
      const emailPoller = getEmailPoller(storage);
      const channels = await storage.getAllChannelConfigs();
      
      for (const channel of channels) {
        if (channel.type === 'email' && channel.isActive && channel.pollingConfig?.enabled) {
          console.log(`Starting email polling for channel: ${channel.name}`);
          await emailPoller.startPolling(channel.id, {
            interval: channel.pollingConfig.interval || 1,
            enabled: true,
            maxEmails: channel.pollingConfig.maxEmails || 50
          });
        }
      }
    } catch (error) {
      console.error('Error initializing email polling:', error);
    }
  }, 5000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = status === 500 ? 'Internal server error' : (err?.message || 'Error');

    if (process.env.NODE_ENV === 'production') {
      console.error('Error:', { status, message });
    } else {
      console.error('Error:', err);
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.platform === 'win32' ? 'localhost' : '0.0.0.0';
  const listenOptions: any = { port, host };
  
  // reusePort is not supported on Windows
  if (process.platform !== 'win32') {
    listenOptions.reusePort = true;
  }
  
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
