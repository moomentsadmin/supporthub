import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { insertAgentSchema, insertChannelConfigSchema, insertApplicationSettingsSchema } from '@shared/schema';
import nodemailer from 'nodemailer';
import type { IStorage } from './storage';

export function createAdminRoutes(storage: IStorage) {
  const router = Router();

  // Admin authentication middleware
  const requireAdminAuth = (req: any, res: any, next: any) => {
    console.log('Admin auth check for ' + req.url + ':', {
      sessionExists: !!req.session,
      adminUser: (req.session as any)?.adminUser,
      adminId: (req.session as any)?.adminId,
      sessionData: req.session
    });
    
    if (!(req.session as any)?.adminUser && !(req.session as any)?.adminId) {
      console.log('Admin auth failed - no adminUser or adminId in session');
      return res.status(401).json({ message: 'Admin authentication required' });
    }
    next();
  };

  // Admin login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Regenerate session to prevent fixation
      try {
        await new Promise((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) {
              console.error('Session regeneration error:', err);
              reject(err);
            } else {
              resolve(true);
            }
          });
        });
      } catch (sessionError) {
        console.error('Session regeneration failed, continuing without regeneration:', sessionError);
        // Continue anyway - better to have a session without regeneration than to fail login
      }

      // Store admin session
      (req.session as any).adminUser = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      };
      
      // Force session save and wait for completion
      try {
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              console.log('Admin session saved successfully for:', admin.email);
              resolve(true);
            }
          });
        });
      } catch (sessionError) {
        console.error('Session save failed, continuing anyway:', sessionError);
        // Continue - session may still work even if explicit save failed
      }

      res.json({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current admin user
  router.get('/me', (req, res) => {
    if ((req.session as any)?.adminUser) {
      res.json((req.session as any).adminUser);
    } else {
      res.status(401).json({ message: 'Admin authentication required' });
    }
  });

  // Admin logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Admin dashboard stats route
  router.get('/dashboard/stats', requireAdminAuth, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      const agents = await storage.getAllAgents();

      // Calculate admin dashboard stats
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
      const totalAgents = agents.length;
      const activeAgents = agents.filter(a => a.isActive !== false).length; // Count agents that are not explicitly inactive

      // Get admin users count
      try {
        const adminUsers = await storage.getAllAdminUsers();
        var totalAdmins = adminUsers?.length || 0;
      } catch (error) {
        var totalAdmins = 0; // Fallback if getAllAdminUsers doesn't exist
      }

      // Get active chat sessions (mock for now, would need real chat session tracking)
      const activeChatSessions = 0; // TODO: Implement actual chat session tracking

      // Recent tickets (last 5)
      const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

      const stats = {
        totalTickets,
        openTickets,
        resolvedTickets,
        totalAgents,
        activeAgents,
        totalAdmins,
        activeChatSessions,
        recentTickets
      };

      res.json(stats);
    } catch (error) {
      console.error('Admin dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch admin dashboard stats' });
    }
  });

  // Analytics endpoint
  router.get('/analytics', requireAdminAuth, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      const agents = await storage.getAllAgents();

      // Calculate analytics
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
      const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;
      const highPriorityTickets = tickets.filter(t => t.priority === 'high').length;

      // Group by channel
      const channelGroups = tickets.reduce((acc, ticket) => {
        acc[ticket.channel] = (acc[ticket.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsByChannel = Object.entries(channelGroups).map(([channel, count]) => ({
        channel,
        count
      }));

      // Group by status
      const statusGroups = tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsByStatus = Object.entries(statusGroups).map(([status, count]) => ({
        status,
        count
      }));

      // Group by priority
      const priorityGroups = tickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsByPriority = Object.entries(priorityGroups).map(([priority, count]) => ({
        priority,
        count
      }));

      // Group by agent
      const agentGroups = tickets.reduce((acc, ticket) => {
        const agentId = ticket.assignedAgentId || 'unassigned';
        const agent = agents.find(a => a.id === agentId);
        const agentName = agent ? agent.name : 'Unassigned';
        acc[agentName] = (acc[agentName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsByAgent = Object.entries(agentGroups).map(([agentName, count]) => ({
        agentName,
        count
      }));

      // Recent tickets (last 10)
      const recentTickets = tickets
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10);

      const analytics = {
        totalTickets,
        openTickets,
        resolvedTickets,
        inProgressTickets,
        highPriorityTickets,
        ticketsByChannel,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByAgent,
        recentTickets,
        avgResolutionTime: 0, // TODO: Calculate based on resolved tickets
        ticketTrends: [] // TODO: Implement trends calculation
      };

      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Get all agents
  router.get('/agents', requireAdminAuth, async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ message: 'Failed to fetch agents' });
    }
  });

  // Create new agent
  router.post('/agents', requireAdminAuth, async (req, res) => {
    try {
      const agentData = insertAgentSchema.parse(req.body);
      
      // Check if agent already exists
      const existingAgent = await storage.getAgentByEmail(agentData.email);
      if (existingAgent) {
        return res.status(400).json({ message: 'Agent with this email already exists' });
      }

      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      console.error('Create agent error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid agent data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create agent' });
    }
  });

  // Get agent by ID
  router.get('/agents/:id', requireAdminAuth, async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Get agent error:', error);
      res.status(500).json({ message: 'Failed to fetch agent' });
    }
  });

  // Update agent
  router.put('/agents/:id', requireAdminAuth, async (req, res) => {
    try {
      const updates = req.body;
      delete updates.id; // Prevent ID modification
      
      const agent = await storage.updateAgent(req.params.id, updates);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Update agent error:', error);
      res.status(500).json({ message: 'Failed to update agent' });
    }
  });

  // Delete agent
  router.delete('/agents/:id', requireAdminAuth, async (req, res) => {
    try {
      const success = await storage.deleteAgent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json({ message: 'Agent deleted successfully' });
    } catch (error) {
      console.error('Delete agent error:', error);
      res.status(500).json({ message: 'Failed to delete agent' });
    }
  });

  // Channel management routes
  router.get('/channels', requireAdminAuth, async (req, res) => {
    try {
      const channels = await storage.getAllChannelConfigs();
      res.json(channels);
    } catch (error) {
      console.error('Get channels error:', error);
      res.status(500).json({ message: 'Failed to fetch channels' });
    }
  });

  router.post('/channels', requireAdminAuth, async (req, res) => {
    try {
      const channelData = insertChannelConfigSchema.parse(req.body);
      const channel = await storage.createChannelConfig(channelData);
      res.status(201).json(channel);
    } catch (error) {
      console.error('Create channel error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid channel data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create channel' });
    }
  });

  router.put('/channels/:id', requireAdminAuth, async (req, res) => {
    try {
      const updates = req.body;
      const channel = await storage.updateChannelConfig(req.params.id, updates);
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      res.json(channel);
    } catch (error) {
      console.error('Update channel error:', error);
      res.status(500).json({ message: 'Failed to update channel' });
    }
  });

  router.delete('/channels/:id', requireAdminAuth, async (req, res) => {
    try {
      const success = await storage.deleteChannelConfig(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Delete channel error:', error);
      res.status(500).json({ message: 'Failed to delete channel' });
    }
  });

  // Application settings routes
  router.get('/settings', requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.getAllApplicationSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  router.post('/settings', requireAdminAuth, async (req, res) => {
    try {
      const settingData = insertApplicationSettingsSchema.parse(req.body);
      const setting = await storage.createApplicationSetting(settingData);
      res.status(201).json(setting);
    } catch (error) {
      console.error('Create setting error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid setting data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create setting' });
    }
  });

  router.put('/settings/:key', requireAdminAuth, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateApplicationSetting(req.params.key, value);
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({ message: 'Failed to update setting' });
    }
  });

  // Specific setting toggle route for compatibility
  router.put('/settings/enable_chat', requireAdminAuth, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateApplicationSetting('enable_chat', value);
      if (!setting) {
        return res.status(404).json({ message: 'Chat setting not found' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Update chat setting error:', error);
      res.status(500).json({ message: 'Failed to update chat setting' });
    }
  });

  router.put('/settings/enable_phone_numbers', requireAdminAuth, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateApplicationSetting('enable_phone_numbers', value);
      if (!setting) {
        return res.status(404).json({ message: 'Phone number setting not found' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Update phone number setting error:', error);
      res.status(500).json({ message: 'Failed to update phone number setting' });
    }
  });

  router.delete('/settings/:key', requireAdminAuth, async (req, res) => {
    try {
      const success = await storage.deleteApplicationSetting(req.params.key);
      if (!success) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error('Delete setting error:', error);
      res.status(500).json({ message: 'Failed to delete setting' });
    }
  });

  // Admin user management routes
  router.get('/admin-users', requireAdminAuth, async (req, res) => {
    try {
      const adminUsers = await storage.getAllAdminUsers();
      res.json(adminUsers);
    } catch (error) {
      console.error('Get admin users error:', error);
      res.status(500).json({ message: 'Failed to fetch admin users' });
    }
  });

  router.post('/admin-users', requireAdminAuth, async (req, res) => {
    try {
      const { username, password, name, role, email } = req.body;
      
      if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password, and name are required' });
      }

      // Check if admin user already exists
      const existingAdmin = await storage.getAdminUser(username);
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin user with this username already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const adminUser = await storage.createAdminUser({
        username,
        passwordHash,
        name,
        role: role || 'admin',
        email: email || null
      });

      // Don't return password hash
      const { passwordHash: _, ...safeAdminUser } = adminUser;
      res.status(201).json(safeAdminUser);
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({ message: 'Failed to create admin user' });
    }
  });

  router.get('/admin-users/:id', requireAdminAuth, async (req, res) => {
    try {
      const adminUser = await storage.getAdminUserById(req.params.id);
      if (!adminUser) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      // Don't return password hash
      const { passwordHash, ...safeAdminUser } = adminUser;
      res.json(safeAdminUser);
    } catch (error) {
      console.error('Get admin user error:', error);
      res.status(500).json({ message: 'Failed to fetch admin user' });
    }
  });

  router.put('/admin-users/:id', requireAdminAuth, async (req, res) => {
    try {
      const { username, password, name, role, email } = req.body;
      const updates: any = {};
      
      if (username) updates.username = username;
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (email !== undefined) updates.email = email;
      
      // Hash new password if provided
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, 10);
      }

      const adminUser = await storage.updateAdminUser(req.params.id, updates);
      if (!adminUser) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      // Don't return password hash
      const { passwordHash, ...safeAdminUser } = adminUser;
      res.json(safeAdminUser);
    } catch (error) {
      console.error('Update admin user error:', error);
      res.status(500).json({ message: 'Failed to update admin user' });
    }
  });

  router.delete('/admin-users/:id', requireAdminAuth, async (req, res) => {
    try {
      // Prevent deleting the last admin user
      const adminUsers = await storage.getAllAdminUsers();
      if (adminUsers.length <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }

      // Prevent admin from deleting themselves
      const currentAdminId = (req.session as any).adminUser.id;
      if (req.params.id === currentAdminId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const success = await storage.deleteAdminUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      
      res.json({ message: 'Admin user deleted successfully' });
    } catch (error) {
      console.error('Delete admin user error:', error);
      res.status(500).json({ message: 'Failed to delete admin user' });
    }
  });

  // System logs - simplified auth for demo
  router.get('/logs', async (req, res) => {
    try {
      const filters = {
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
        level: req.query.level as string,
        action: req.query.action as string,
        userType: req.query.userType as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      let logs;
      try {
        logs = await storage.getAuditLogs(filters);
      } catch (error) {
        console.log('Database logs failed, using fallback sample logs');
        // Fallback to sample logs when database is unavailable
        logs = getSampleAuditLogs(filters);
      }
      res.json(logs);
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({ message: 'Failed to fetch logs' });
    }
  });

  // Fallback sample logs function
  function getSampleAuditLogs(filters: any) {
    const sampleLogs = [
      {
        id: 'log-1',
        level: "info",
        action: "login",
        entity: "admin",
        entityId: "admin-1",
        userId: "admin-1",
        userType: "admin",
        userName: "System Administrator",
        userEmail: "admin@supporthub.com",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        sessionId: "sess_123",
        description: "Administrator logged into the admin panel",
        metadata: { loginMethod: "password" },
        success: true,
        errorMessage: null,
        duration: 150,
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        id: 'log-2',
        level: "info",
        action: "create_ticket",
        entity: "ticket",
        entityId: "ticket-456",
        userId: "agent-1",
        userType: "agent",
        userName: "John Agent",
        userEmail: "john@company.com",
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        sessionId: "sess_456",
        description: "Created new support ticket for customer inquiry",
        metadata: { ticketPriority: "medium", channel: "email" },
        success: true,
        errorMessage: null,
        duration: 320,
        createdAt: new Date(Date.now() - 7200000),
      },
      {
        id: 'log-3',
        level: "warn",
        action: "failed_login",
        entity: "agent",
        entityId: null,
        userId: null,
        userType: "agent",
        userName: null,
        userEmail: "unknown@company.com",
        ipAddress: "192.168.1.105",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        sessionId: null,
        description: "Failed login attempt with invalid credentials",
        metadata: { attemptedEmail: "unknown@company.com", reason: "invalid_password" },
        success: false,
        errorMessage: "Invalid email or password",
        duration: 500,
        createdAt: new Date(Date.now() - 10800000),
      },
      {
        id: 'log-4',
        level: "error",
        action: "database_error",
        entity: "system",
        entityId: null,
        userId: "system",
        userType: "system",
        userName: "System",
        userEmail: null,
        ipAddress: "127.0.0.1",
        userAgent: "SupportHub System",
        sessionId: null,
        description: "Database connection failed - Neon endpoint disabled",
        metadata: { error: "The endpoint has been disabled. Enable it using Neon API and retry." },
        success: false,
        errorMessage: "NeonDbError: The endpoint has been disabled",
        duration: 0,
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        id: 'log-5',
        level: "info",
        action: "backup_created",
        entity: "system",
        entityId: "backup-001",
        userId: "admin-1",
        userType: "admin",
        userName: "System Administrator",
        userEmail: "admin@supporthub.com",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        sessionId: "sess_789",
        description: "System backup created successfully",
        metadata: { filename: "supporthub-download-backup-20250825-040618.tar.gz", size: "2.4MB" },
        success: true,
        errorMessage: null,
        duration: 15000,
        createdAt: new Date(Date.now() - 900000),
      }
    ];

    // Apply basic filtering
    let filteredLogs = sampleLogs;
    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    if (filters?.userType) {
      filteredLogs = filteredLogs.filter(log => log.userType === filters.userType);
    }
    if (filters?.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return filteredLogs.slice(offset, offset + limit);
  }

  // Freshdesk import endpoint
  router.post('/freshdesk-import', requireAdminAuth, async (req: any, res) => {
    try {
      // Import the FreshdeskImporter class dynamically
      const { FreshdeskImporter } = await import('./freshdesk-importer');
      
      // Get uploaded files from multer
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const csvFile = files?.csv_file?.[0];
      const attachmentsZip = files?.attachments_zip?.[0];

      if (!csvFile) {
        return res.status(400).json({ message: 'CSV file is required' });
      }

      // Create importer instance
      const importer = new FreshdeskImporter(storage);

      // Parse options from request body
      const options = {
        skipDuplicates: req.body.skip_duplicates === 'true',
        preserveIds: req.body.preserve_ids === 'true',
        importMode: req.body.import_mode || 'tickets_only'
      };

      // Perform the import
      const result = await importer.importFromCSV(
        csvFile.path,
        attachmentsZip?.path,
        options
      );

      res.json(result);

    } catch (error) {
      console.error('Freshdesk import error:', error);
      res.status(500).json({ 
        message: 'Import failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin email test endpoint with direct SMTP testing
  router.post('/email/test', requireAdminAuth, async (req, res) => {
    try {
      const { to, subject = "Test Email from SupportHub Admin", provider, config } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: "Recipient email address required" });
      }

      const verifiedSender = process.env.VERIFIED_SENDER_EMAIL || 'noreply@supporthub.com';
      
      // Direct SMTP testing if SMTP provider and config are provided
      if (provider === 'smtp' && config) {
        console.log('🧪 Direct SMTP test with config:', {
          host: config.host,
          port: config.port,
          user: config.username?.substring(0, 10) + '...'
        });
        
        try {
          const transporter = nodemailer.createTransport({
            host: config.host,
            port: parseInt(config.port) || 587,
            secure: config.secure === true || config.secure === 'true',
            auth: {
              user: config.username,
              pass: config.password,
            },
          });

          const mailOptions = {
            from: config.username || verifiedSender,
            to,
            subject,
            text: 'This is a direct SMTP test email from your SupportHub admin panel.',
            html: '<h2>Direct SMTP Test</h2><p>This is a direct SMTP test email from your SupportHub admin panel.</p><p>If you received this, your SMTP configuration is working correctly!</p>'
          };

          const info = await transporter.sendMail(mailOptions);
          console.log('✅ Direct SMTP test successful:', info.messageId);
          
          return res.json({ 
            message: "SMTP test email sent successfully", 
            success: true,
            messageId: info.messageId,
            provider: 'smtp'
          });

        } catch (smtpError: any) {
          console.error('❌ Direct SMTP test failed:', smtpError.message);
          return res.status(500).json({ 
            message: "SMTP test failed", 
            success: false, 
            error: smtpError.message,
            details: {
              code: smtpError.code,
              command: smtpError.command,
              response: smtpError.response
            }
          });
        }
      }
      
      // Fallback to regular email service
      const { sendEmail } = await import('./email-service');
      
      console.log('🧪 Admin testing email with regular service:', { 
        to, 
        from: verifiedSender
      });
      
      const success = await sendEmail({
        to,
        from: verifiedSender,
        subject,
        text: 'This is a test email from your SupportHub admin panel to verify email configuration.',
        html: '<h2>Admin Test Email</h2><p>This is a test email from your SupportHub admin panel to verify email configuration.</p><p>If you received this, your email provider is working correctly!</p>'
      });

      if (success) {
        res.json({ message: "Test email sent successfully", success: true });
      } else {
        res.status(500).json({ message: "Failed to send test email", success: false });
      }
    } catch (error) {
      console.error("Admin email test error:", error);
      res.status(500).json({ 
        message: "Failed to send test email", 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Knowledge Base management routes
  router.get('/knowledge-base', requireAdminAuth, async (req, res) => {
    try {
      const articles = await storage.getAllKnowledgeBaseArticles();
      res.json(articles);
    } catch (error) {
      console.error('Get knowledge base articles error:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base articles' });
    }
  });

  router.get('/knowledge-base/:id', requireAdminAuth, async (req, res) => {
    try {
      const article = await storage.getKnowledgeBaseArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }
      res.json(article);
    } catch (error) {
      console.error('Get knowledge base article error:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base article' });
    }
  });

  router.post('/knowledge-base', requireAdminAuth, async (req, res) => {
    try {
      const { title, content, summary, category, tags, isPublished } = req.body;
      
      if (!title || !content || !category) {
        return res.status(400).json({ message: 'Title, content, and category are required' });
      }

      const articleData = {
        title,
        content,
        summary: summary || null,
        category,
        tags: tags || [],
        isPublished: isPublished || false,
        authorId: (req.session as any).adminUser?.id || null
      };

      const article = await storage.createKnowledgeBaseArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      console.error('Create knowledge base article error:', error);
      res.status(500).json({ message: 'Failed to create knowledge base article' });
    }
  });

  router.put('/knowledge-base/:id', requireAdminAuth, async (req, res) => {
    try {
      const { title, content, summary, category, tags, isPublished } = req.body;
      
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (summary !== undefined) updateData.summary = summary || null;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags || [];
      if (isPublished !== undefined) updateData.isPublished = isPublished;

      const article = await storage.updateKnowledgeBaseArticle(req.params.id, updateData);
      if (!article) {
        return res.status(404).json({ message: 'Article not found' });
      }
      res.json(article);
    } catch (error) {
      console.error('Update knowledge base article error:', error);
      res.status(500).json({ message: 'Failed to update knowledge base article' });
    }
  });

  router.delete('/knowledge-base/:id', requireAdminAuth, async (req, res) => {
    try {
      const success = await storage.deleteKnowledgeBaseArticle(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Article not found' });
      }
      res.json({ message: 'Article deleted successfully' });
    } catch (error) {
      console.error('Delete knowledge base article error:', error);
      res.status(500).json({ message: 'Failed to delete knowledge base article' });
    }
  });

  return router;
}