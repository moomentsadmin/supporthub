import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { registerExtendedRoutes } from "./routes-extended";
import { createAdminRoutes } from "./admin-routes";
import { registerCustomerRoutes } from "./customer-routes";
import { log } from "./logger";
import { serveStatic } from "./static";
import { validateDatabaseConnection } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const PgSession = connectPgSimple(session);

// Validate session secret in production
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: false, // Don't save uninitialized sessions
  name: 'connect.sid',
  cookie: {
    secure: false, // Will be set to true when HTTPS is configured
    httpOnly: true, // Prevent XSS attacks
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
    domain: undefined,
    path: '/'
  }
};

if (process.env.DATABASE_URL) {
  try {
    // Validate DATABASE_URL before using it
    new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://'));
    sessionConfig.store = new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sessions'
    });
    console.log('✓ Using PostgreSQL session store');
  } catch (error) {
    console.error('Database session store failed:', error instanceof Error ? error.message : String(error));
    console.log('⚠ Falling back to memory session store');
  }
} else {
  console.log('No DATABASE_URL, using memory session store');
}

app.use(session(sessionConfig));

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
  const dbConnected = validateDatabaseConnection();
  if (dbConnected) {
    log("Database connection validated successfully");
  } else {
    log("Warning: DATABASE_URL not found. Running with fallback storage.");
  }

  const server = await registerRoutes(app);
  registerExtendedRoutes(app, server);
  
  const { getStorage } = await import('./storage');
  const adminRoutes = createAdminRoutes(getStorage());
  app.use('/api/admin', adminRoutes);
  
  const { createAgentRoutes } = await import('./agent-routes');
  const agentRoutes = createAgentRoutes(getStorage());
  app.use('/api/agent', agentRoutes);
  
  registerCustomerRoutes(app);

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
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Production: serve static files
  serveStatic(app);

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
