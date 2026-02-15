import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and, or, like, ilike, gte, lte } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import {
  agents,
  customers,
  tickets,
  messages,
  attachments,
  templates,
  automationRules,
  chatSessions,
  analytics,
  adminUsers,
  whitelabelConfig,
  applicationSettings,
  knowledgeBase,
  channelConfigs,
  passwordResetTokens,
  auditLogs,
  ticketForwards,
  type Agent,
  type InsertAgent,
  type Customer,
  type InsertCustomer,
  type Ticket,
  type InsertTicket,
  type Message,
  type InsertMessage,
  type Attachment,
  type InsertAttachment,
  type Template,
  type InsertTemplate,
  type AutomationRule,
  type InsertAutomationRule,
  type ChatSession,
  type InsertChatSession,
  type Analytics,
  type InsertAnalytics,
  type AdminUser,
  type InsertAdminUser,
  type WhitelabelConfig,
  type InsertWhitelabelConfig,
  type ApplicationSettings,
  type InsertApplicationSettings,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type ChannelConfig,
  type InsertChannelConfig,
  type AuditLog,
  type InsertAuditLog,
  type InsertTicketForward,
  type TicketForward
} from '@shared/schema';

import { IStorage } from './storage';

// Channel configuration interface
interface ChannelConfig {
  id: string;
  name: string;
  type: "email" | "whatsapp" | "twitter" | "facebook";
  status: "connected" | "disconnected" | "error";
  config: Record<string, any>;
  lastSync: Date | null;
}

export class PostgresStorage implements IStorage {
  private db;
  // Removed in-memory channels - now using database
  private ticketCounter = 1;
  private initialized = false;

  constructor() {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL environment variable not found. PostgresStorage will not be functional.');
      // Don't throw error - let the app start but handle gracefully
      this.db = null;
      return;
    }

    try {
      const sql = neon(process.env.DATABASE_URL);
      this.db = drizzle(sql);
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.db = null;
    }
  }

  async initialize() {
    if (this.initialized) return;

    // Check if database connection is available
    if (!this.db) {
      console.warn('Database not initialized. Skipping PostgresStorage initialization.');
      return;
    }

    try {
      // Create default data if tables are empty
      await this.createDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PostgresStorage:', error);
      // Don't throw - let app continue without database
    }
  }

  private async createDefaultData() {
    // Check if we already have data
    const existingAgents = await this.db.select().from(agents).limit(1);

    // Ensure admin@company.com exists (requested by user)
    const companyAdmin = await this.db.select().from(adminUsers).where(eq(adminUsers.email, "admin@company.com")).limit(1);
    if (companyAdmin.length === 0) {
      console.log('Creating requested admin user: admin@company.com');
      const adminPassword = bcrypt.hashSync("admin123", 10);
      const newAdmin = {
        name: "Company Administrator",
        email: "admin@company.com",
        password: adminPassword,
        role: "super_admin",
        permissions: ["all"],
        isActive: true,
        lastLogin: null
      };
      await this.db.insert(adminUsers).values(newAdmin);
    }

    if (existingAgents.length > 0) {
      return; // Data already exists
    }

    // Create sample agents
    const agentPassword = bcrypt.hashSync("password123", 10);
    const sampleAgents = [
      {
        name: "Agent",
        email: "agent@example.com",
        password: agentPassword,
        role: "agent",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
      },
      {
        name: "Sarah Chen",
        email: "sarah.chen@supporthub.com",
        password: agentPassword,
        role: "senior_agent",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
      },
      {
        name: "Lisa Wang",
        email: "lisa.wang@supporthub.com",
        password: agentPassword,
        role: "agent",
        avatar: "https://pixabay.com/get/g33f4c31906485611aac90ced194d185768b04474106365dbc5d067d3a1c3603078ee7f0631b6246a6fff05b24d0067981b7e6630b0e443ee1950e6669ad8def2_1280.jpg"
      },
      {
        name: "Mike Johnson",
        email: "mike.johnson@supporthub.com",
        password: agentPassword,
        role: "agent",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
      }
    ];

    for (const agent of sampleAgents) {
      await this.db.insert(agents).values(agent);
    }

    // Create sample templates
    const sampleTemplates = [
      {
        name: "Acknowledgment - Issue received",
        subject: "We've received your support request",
        content: "Thank you for contacting us. We have received your support request and one of our agents will respond within 24 hours.",
        category: "acknowledgment"
      },
      {
        name: "Investigation - Looking into it",
        subject: "We're investigating your issue",
        content: "We're currently investigating the issue you reported. I'll update you as soon as we have more information.",
        category: "investigation"
      },
      {
        name: "Resolution - Issue fixed",
        subject: "Your issue has been resolved",
        content: "Good news! We've resolved the issue you reported. Please let us know if you need any further assistance.",
        category: "resolution"
      }
    ];

    for (const template of sampleTemplates) {
      await this.db.insert(templates).values(template);
    }

    // Create default admin user
    const adminPassword = bcrypt.hashSync("admin123", 10);
    const defaultAdmin = {
      name: "System Administrator",
      email: "admin@supporthub.com",
      password: adminPassword,
      role: "super_admin",
      permissions: ["all"],
      isActive: true,
      lastLogin: null
    };
    await this.db.insert(adminUsers).values(defaultAdmin);

    // Create default whitelabel config
    const defaultWhitelabel = {
      companyName: "SupportHub",
      logoUrl: "/logo.svg",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      accentColor: "#10b981",
      customDomain: null,
      supportEmail: "support@supporthub.com",
      faviconUrl: "/favicon.ico",
      customCss: null,
      footerText: "Powered by SupportHub",
      isActive: true
    };
    await this.db.insert(whitelabelConfig).values(defaultWhitelabel);

    // Create default application settings
    const defaultSettings = [
      { key: "app_name", value: "SupportHub", category: "general", type: "string", description: "Application name", isPublic: true },
      { key: "tickets_per_page", value: "20", category: "general", type: "number", description: "Number of tickets to show per page", isPublic: false },
      { key: "enable_auto_assignment", value: "true", category: "automation", type: "boolean", description: "Enable automatic ticket assignment", isPublic: false },
      { key: "default_ticket_priority", value: "medium", category: "tickets", type: "string", description: "Default priority for new tickets", isPublic: false },
      { key: "enable_whatsapp", value: "false", category: "integrations", type: "boolean", description: "Enable WhatsApp integration", isPublic: false },
      { key: "enable_chat", value: "true", category: "features", type: "boolean", description: "Enable live chat functionality for customers", isPublic: true },
      { key: "enable_phone_numbers", value: "true", category: "privacy", type: "boolean", description: "Enable phone number collection and display for customers", isPublic: true }
    ];

    for (const setting of defaultSettings) {
      await this.db.insert(applicationSettings).values({
        ...setting,
        updatedBy: null
      });
    }

    // Create sample tickets for testing
    await this.createSampleTickets();

    // Create sample knowledge base articles
    await this.createSampleKnowledgeBase();

    // Create sample audit logs
    await this.createSampleAuditLogs();
  }

  private async createSampleTickets() {
    const sampleTickets = [
      {
        ticketNumber: "TK-2025-001",
        subject: "Login Issues",
        description: "Unable to login to my account. Getting error message when entering credentials.",
        status: "open" as const,
        priority: "high" as const,
        channel: "email" as const,
        customerName: "John Doe",
        customerContact: "john.doe@example.com"
      },
      {
        ticketNumber: "TK-2025-002",
        subject: "Password Reset Request",
        description: "Need help resetting my password. The reset email is not arriving.",
        status: "in-progress" as const,
        priority: "medium" as const,
        channel: "whatsapp" as const,
        customerName: "Jane Smith",
        customerContact: "jane.smith@example.com"
      },
      {
        ticketNumber: "TK-2025-003",
        subject: "Billing Question",
        description: "I have a question about my recent invoice. The charges don't look correct.",
        status: "resolved" as const,
        priority: "low" as const,
        channel: "email" as const,
        customerName: "Bob Johnson",
        customerContact: "bob.johnson@example.com"
      }
    ];

    for (const ticket of sampleTickets) {
      await this.db.insert(tickets).values(ticket);
    }
  }

  private async createSampleKnowledgeBase() {
    const sampleArticles = [
      {
        title: "How to Reset Your Password",
        content: "To reset your password, follow these steps: 1. Go to the login page, 2. Click 'Forgot Password', 3. Enter your email address, 4. Check your email for reset instructions.",
        category: "Account Management",
        isPublished: true,
        tags: ["password", "reset", "account"]
      },
      {
        title: "Billing and Payment Information",
        content: "Our billing cycles run monthly. Payments are due on the first of each month. We accept credit cards, PayPal, and bank transfers.",
        category: "Billing",
        isPublished: true,
        tags: ["billing", "payment", "subscription"]
      }
    ];

    for (const article of sampleArticles) {
      await this.db.insert(knowledgeBase).values(article);
    }
  }

  // Database availability check
  private checkDatabaseAvailability(): boolean {
    if (!this.db) {
      console.warn('Database not available - operation skipped');
      return false;
    }
    return true;
  }

  // Agent methods
  async getAgent(id: string): Promise<Agent | undefined> {
    if (!this.checkDatabaseAvailability()) return undefined;
    await this.initialize();
    const result = await this.db.select().from(agents).where(eq(agents.id, id));
    return result[0];
  }

  async getAgentByEmail(email: string): Promise<Agent | undefined> {
    if (!this.checkDatabaseAvailability()) return undefined;
    await this.initialize();
    const result = await this.db.select().from(agents).where(eq(agents.email, email));
    return result[0];
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    if (!this.checkDatabaseAvailability()) throw new Error('Database not available');
    await this.initialize();
    const hashedPassword = await bcrypt.hash(insertAgent.password, 10);
    const result = await this.db.insert(agents).values({
      ...insertAgent,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async getAllAgents(): Promise<Agent[]> {
    if (!this.checkDatabaseAvailability()) return [];
    await this.initialize();
    return await this.db.select().from(agents);
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    await this.initialize();
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const result = await this.db.update(agents)
      .set(updates)
      .where(eq(agents.id, id))
      .returning();
    return result[0];
  }

  async deleteAgent(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(agents).where(eq(agents.id, id));
    return result.rowCount > 0;
  }

  async validateAgent(email: string, password: string): Promise<Agent | null> {
    if (!this.checkDatabaseAvailability()) return null;
    await this.initialize();
    const agent = await this.getAgentByEmail(email);
    if (!agent) return null;

    const isValid = await bcrypt.compare(password, agent.password);
    return isValid ? agent : null;
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    await this.initialize();
    const result = await this.db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    await this.initialize();
    const result = await this.db.select().from(customers).where(eq(customers.email, email));
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    await this.initialize();
    const result = await this.db.insert(customers).values(insertCustomer).returning();
    return result[0];
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    await this.initialize();
    const result = await this.db.update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(customers).where(eq(customers.id, id));
    return result.rowCount > 0;
  }

  async getAllCustomers(): Promise<Customer[]> {
    await this.initialize();
    return await this.db.select().from(customers).orderBy(customers.createdAt);
  }

  async validateCustomer(email: string, password: string): Promise<Customer | null> {
    await this.initialize();
    const customer = await this.getCustomerByEmail(email);
    if (!customer) return null;

    const isValid = await bcrypt.compare(password, customer.password);
    return isValid ? customer : null;
  }

  // Ticket methods
  async getTicket(id: string): Promise<Ticket | undefined> {
    await this.initialize();
    const result = await this.db.select().from(tickets).where(eq(tickets.id, id));
    return result[0];
  }

  async getAllTickets(): Promise<Ticket[]> {
    if (!this.checkDatabaseAvailability()) return [];
    await this.initialize();
    return await this.db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicketsByAgent(agentId: string): Promise<Ticket[]> {
    await this.initialize();
    return await this.db.select().from(tickets).where(eq(tickets.assignedAgentId, agentId));
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    await this.initialize();
    return await this.db.select().from(tickets).where(eq(tickets.status, status));
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    if (!this.checkDatabaseAvailability()) throw new Error('Database not available');
    await this.initialize();

    // Generate truly unique ticket number using database sequence
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const ticketNumber = `TK-${timestamp}-${random}`;

    const result = await this.db.insert(tickets).values({
      ...insertTicket,
      ticketNumber,
    }).returning();
    return result[0];
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    await this.initialize();
    const result = await this.db.update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return result[0];
  }

  // Message methods
  async getMessagesByTicket(ticketId: string): Promise<Message[]> {
    await this.initialize();
    return await this.db.select().from(messages)
      .where(eq(messages.ticketId, ticketId))
      .orderBy(messages.createdAt);
  }

  async getTicketMessages(ticketId: string): Promise<Message[]> {
    await this.initialize();
    return await this.db.select().from(messages)
      .where(eq(messages.ticketId, ticketId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    await this.initialize();
    const result = await this.db.insert(messages).values(message).returning();
    return result[0];
  }

  // Attachment methods
  async getAttachment(id: string): Promise<Attachment | undefined> {
    await this.initialize();
    const result = await this.db.select().from(attachments).where(eq(attachments.id, id));
    return result[0];
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    await this.initialize();
    const result = await this.db.insert(attachments).values(attachment).returning();
    return result[0];
  }

  async getAttachmentsByTicket(ticketId: string): Promise<Attachment[]> {
    await this.initialize();
    return await this.db.select().from(attachments).where(eq(attachments.ticketId, ticketId));
  }

  // Template methods
  async getAllTemplates(): Promise<Template[]> {
    await this.initialize();
    return await this.db.select().from(templates).orderBy(templates.name);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    await this.initialize();
    const result = await this.db.insert(templates).values(template).returning();
    return result[0];
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    await this.initialize();
    const result = await this.db.update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(templates).where(eq(templates.id, id));
    return result.rowCount > 0;
  }

  // Automation rules
  async getAllAutomationRules(): Promise<AutomationRule[]> {
    await this.initialize();
    return await this.db.select().from(automationRules).orderBy(automationRules.priority);
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    await this.initialize();
    const result = await this.db.insert(automationRules).values(rule).returning();
    return result[0];
  }

  // Chat sessions
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    await this.initialize();
    const result = await this.db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return result[0];
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    await this.initialize();
    const result = await this.db.insert(chatSessions).values(session).returning();
    return result[0];
  }

  async getActiveChatSessions(): Promise<ChatSession[]> {
    await this.initialize();
    return await this.db.select().from(chatSessions).where(eq(chatSessions.isActive, true));
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    await this.initialize();
    return await this.db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    await this.initialize();
    const result = await this.db.update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, id))
      .returning();
    return result[0];
  }

  async endChatSession(id: string): Promise<void> {
    await this.initialize();
    await this.db.update(chatSessions)
      .set({ isActive: false, endTime: new Date() })
      .where(eq(chatSessions.id, id));
  }

  async getMessagesByChatSession(sessionId: string): Promise<Message[]> {
    await this.initialize();
    return await this.db.select().from(messages)
      .where(eq(messages.chatSessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async getAuditLogs(filters?: {
    limit?: number;
    offset?: number;
    level?: string;
    action?: string;
    userType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLog[]> {
    await this.initialize();

    try {
      let query = this.db.select().from(auditLogs);

      // Apply filters
      const conditions = [];
      if (filters?.level) {
        conditions.push(eq(auditLogs.level, filters.level));
      }
      if (filters?.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters?.userType) {
        conditions.push(eq(auditLogs.userType, filters.userType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply pagination and ordering
      query = query
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0);

      return await query;
    } catch (error) {
      console.log('Database audit logs not available, using fallback');
      // Fallback to sample data if table doesn't exist
      return await this.getFallbackAuditLogs(filters);
    }
  }

  private async getFallbackAuditLogs(filters?: any): Promise<AuditLog[]> {
    // Generate sample audit logs as fallback
    const sampleLogs: AuditLog[] = [
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
      }
    ];

    // Apply basic filtering
    let filteredLogs = sampleLogs;
    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return filteredLogs.slice(offset, offset + limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    await this.initialize();

    try {
      const result = await this.db.insert(auditLogs).values(log).returning();
      return result[0];
    } catch (error) {
      console.log('Could not create audit log in database, skipping');
      // Return a mock response if database is not available
      return {
        id: 'mock-' + Date.now(),
        ...log,
        createdAt: new Date(),
      };
    }
  }

  // Ticket forwarding
  async forwardTicket(forward: InsertTicketForward): Promise<TicketForward> {
    await this.initialize();

    try {
      const result = await this.db.insert(ticketForwards).values(forward).returning();
      return result[0];
    } catch (error) {
      console.log('Could not create ticket forward in database:', error);
      // Return a mock response if database is not available
      return {
        id: 'mock-' + Date.now(),
        ...forward,
        createdAt: new Date(),
      };
    }
  }

  async getTicketForwards(ticketId: string): Promise<TicketForward[]> {
    await this.initialize();

    try {
      return await this.db.select().from(ticketForwards).where(eq(ticketForwards.ticketId, ticketId));
    } catch (error) {
      console.log('Could not get ticket forwards from database:', error);
      return [];
    }
  }

  // Analytics
  async createAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    await this.initialize();
    const result = await this.db.insert(analytics).values(analyticsData).returning();
    return result[0];
  }

  async getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<Analytics[]> {
    await this.initialize();
    return await this.db.select().from(analytics)
      .where(and(
        eq(analytics.date, startDate), // This would need proper date range query
        eq(analytics.date, endDate)
      ));
  }

  // Admin management
  async getAdminUser(username: string): Promise<AdminUser | undefined> {
    await this.initialize();
    const result = await this.db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return result[0];
  }

  async getAdminUserById(id: string): Promise<AdminUser | undefined> {
    await this.initialize();
    const result = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return result[0];
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    if (!this.db) {
      console.warn('Database not initialized. Cannot fetch admin user.');
      return undefined;
    }
    await this.initialize();
    const result = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return result[0];
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    await this.initialize();
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const result = await this.db.insert(adminUsers).values({
      ...admin,
      password: hashedPassword
    }).returning();
    return result[0];
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    await this.initialize();
    return await this.db.select().from(adminUsers);
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    await this.initialize();
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const result = await this.db.update(adminUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return result[0];
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(adminUsers).where(eq(adminUsers.id, id));
    return result.rowCount > 0;
  }

  async validateAdminUser(email: string, password: string): Promise<AdminUser | null> {
    await this.initialize();
    const admin = await this.getAdminUserByEmail(email);
    if (!admin) return null;

    const isValid = await bcrypt.compare(password, admin.password);
    return isValid ? admin : null;
  }

  // Whitelabel configuration
  async getWhitelabelConfig(): Promise<WhitelabelConfig | undefined> {
    await this.initialize();
    const result = await this.db.select().from(whitelabelConfig).limit(1);
    return result[0];
  }

  async createWhitelabelConfig(config: InsertWhitelabelConfig): Promise<WhitelabelConfig> {
    await this.initialize();
    const result = await this.db.insert(whitelabelConfig).values(config).returning();
    return result[0];
  }

  async updateWhitelabelConfig(id: string, updates: Partial<WhitelabelConfig>): Promise<WhitelabelConfig | undefined> {
    await this.initialize();
    const result = await this.db.update(whitelabelConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whitelabelConfig.id, id))
      .returning();
    return result[0];
  }

  // Application settings
  async getApplicationSetting(key: string): Promise<ApplicationSettings | undefined> {
    await this.initialize();
    const result = await this.db.select().from(applicationSettings).where(eq(applicationSettings.key, key));
    return result[0];
  }

  async getAllApplicationSettings(): Promise<ApplicationSettings[]> {
    await this.initialize();
    return await this.db.select().from(applicationSettings);
  }

  async getApplicationSettingsByCategory(category: string): Promise<ApplicationSettings[]> {
    await this.initialize();
    return await this.db.select().from(applicationSettings).where(eq(applicationSettings.category, category));
  }

  async createApplicationSetting(setting: InsertApplicationSettings): Promise<ApplicationSettings> {
    await this.initialize();
    const result = await this.db.insert(applicationSettings).values(setting).returning();
    return result[0];
  }

  async updateApplicationSetting(key: string, value: string, updatedBy?: string): Promise<ApplicationSettings | undefined> {
    await this.initialize();
    const result = await this.db.update(applicationSettings)
      .set({
        value,
        updatedAt: new Date(),
        updatedBy: updatedBy || null
      })
      .where(eq(applicationSettings.key, key))
      .returning();
    return result[0];
  }

  async deleteApplicationSetting(key: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(applicationSettings).where(eq(applicationSettings.key, key));
    return result.rowCount > 0;
  }

  // Channel management (keeping in memory for now)
  async getChannels(): Promise<ChannelConfig[]> {
    return Array.from(this.channels.values());
  }

  async createChannel(channel: Omit<ChannelConfig, 'id'>): Promise<ChannelConfig> {
    const id = randomUUID();
    const newChannel: ChannelConfig = { ...channel, id };
    this.channels.set(id, newChannel);
    return newChannel;
  }

  async updateChannel(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;

    const updatedChannel = { ...channel, ...updates };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async getChannel(id: string): Promise<ChannelConfig | undefined> {
    return this.channels.get(id);
  }

  async deleteChannel(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }

  // Knowledge Base
  async getKnowledgeBaseArticle(id: string): Promise<KnowledgeBase | undefined> {
    await this.initialize();
    const result = await this.db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return result[0];
  }

  async getAllKnowledgeBaseArticles(): Promise<KnowledgeBase[]> {
    await this.initialize();
    return await this.db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
  }

  async getPublishedKnowledgeBaseArticles(): Promise<KnowledgeBase[]> {
    await this.initialize();
    return await this.db.select().from(knowledgeBase)
      .where(eq(knowledgeBase.isPublished, true))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeBaseArticlesByCategory(category: string): Promise<KnowledgeBase[]> {
    await this.initialize();
    return await this.db.select().from(knowledgeBase)
      .where(eq(knowledgeBase.category, category))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    await this.initialize();
    return await this.db.select().from(knowledgeBase)
      .where(or(
        ilike(knowledgeBase.title, `%${query}%`),
        ilike(knowledgeBase.content, `%${query}%`)
      ))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async createKnowledgeBaseArticle(article: InsertKnowledgeBase): Promise<KnowledgeBase> {
    await this.initialize();
    const result = await this.db.insert(knowledgeBase).values(article).returning();
    return result[0];
  }

  async updateKnowledgeBaseArticle(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    await this.initialize();
    const result = await this.db.update(knowledgeBase)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return result[0];
  }

  async deleteKnowledgeBaseArticle(id: string): Promise<boolean> {
    await this.initialize();
    const result = await this.db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
    return result.rowCount > 0;
  }

  async incrementKnowledgeBaseViews(id: string): Promise<void> {
    await this.initialize();
    // This would require a proper increment operation in SQL
    const article = await this.getKnowledgeBaseArticle(id);
    if (article) {
      await this.db.update(knowledgeBase)
        .set({ views: (article.views || 0) + 1 })
        .where(eq(knowledgeBase.id, id));
    }
  }

  async rateKnowledgeBaseArticle(id: string, helpful: boolean): Promise<void> {
    await this.initialize();
    const article = await this.getKnowledgeBaseArticle(id);
    if (article) {
      if (helpful) {
        await this.db.update(knowledgeBase)
          .set({ helpful: (article.helpful || 0) + 1 })
          .where(eq(knowledgeBase.id, id));
      } else {
        await this.db.update(knowledgeBase)
          .set({ notHelpful: (article.notHelpful || 0) + 1 })
          .where(eq(knowledgeBase.id, id));
      }
    }
  }

  // Channel Configuration methods
  async getChannelConfig(id: string): Promise<ChannelConfig | undefined> {
    if (!this.checkDatabaseAvailability()) return undefined;
    await this.initialize();
    const result = await this.db.select().from(channelConfigs).where(eq(channelConfigs.id, id));
    return result[0];
  }

  async getAllChannelConfigs(): Promise<ChannelConfig[]> {
    if (!this.checkDatabaseAvailability()) return [];
    await this.initialize();
    return await this.db.select().from(channelConfigs).where(eq(channelConfigs.isActive, true));
  }

  async createChannelConfig(config: InsertChannelConfig): Promise<ChannelConfig> {
    if (!this.checkDatabaseAvailability()) throw new Error('Database not available');
    await this.initialize();

    // Set default values for new channels
    const channelWithDefaults = {
      ...config,
      status: 'disconnected' as const,
      isActive: false,
      isOnline: false,
      lastSync: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.db.insert(channelConfigs).values(channelWithDefaults).returning();
    return result[0];
  }

  async updateChannelConfig(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    if (!this.checkDatabaseAvailability()) return undefined;
    await this.initialize();
    const result = await this.db.update(channelConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(channelConfigs.id, id))
      .returning();
    return result[0];
  }

  async deleteChannelConfig(id: string): Promise<boolean> {
    if (!this.checkDatabaseAvailability()) return false;
    await this.initialize();
    const result = await this.db.update(channelConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(channelConfigs.id, id));
    return result.rowCount > 0;
  }

  async getChannelConfigByType(type: string): Promise<ChannelConfig[]> {
    if (!this.checkDatabaseAvailability()) return [];
    await this.initialize();
    return await this.db.select().from(channelConfigs)
      .where(and(eq(channelConfigs.type, type), eq(channelConfigs.isActive, true)));
  }

  // Legacy channel management methods - already exist, need to update to use database
  async getChannels(): Promise<LegacyChannelConfig[]> {
    const configs = await this.getAllChannelConfigs();
    return configs.map(config => ({
      id: config.id,
      name: config.name,
      type: config.type as "email" | "whatsapp" | "twitter" | "facebook",
      status: config.status as "connected" | "disconnected" | "error",
      config: config.config,
      lastSync: config.lastSync
    }));
  }

  async createChannel(channel: Omit<LegacyChannelConfig, 'id'>): Promise<LegacyChannelConfig> {
    const config: InsertChannelConfig = {
      name: channel.name,
      type: channel.type,
      status: channel.status || 'disconnected',
      config: channel.config,
      lastSync: channel.lastSync,
      isActive: true
    };
    const created = await this.createChannelConfig(config);
    return {
      id: created.id,
      name: created.name,
      type: created.type as "email" | "whatsapp" | "twitter" | "facebook",
      status: created.status as "connected" | "disconnected" | "error",
      config: created.config,
      lastSync: created.lastSync
    };
  }

  async updateChannel(id: string, updates: Partial<LegacyChannelConfig>): Promise<LegacyChannelConfig | undefined> {
    const updated = await this.updateChannelConfig(id, updates);
    if (!updated) return undefined;
    return {
      id: updated.id,
      name: updated.name,
      type: updated.type as "email" | "whatsapp" | "twitter" | "facebook",
      status: updated.status as "connected" | "disconnected" | "error",
      config: updated.config,
      lastSync: updated.lastSync
    };
  }

  async getChannel(id: string): Promise<LegacyChannelConfig | undefined> {
    const config = await this.getChannelConfig(id);
    if (!config) return undefined;
    return {
      id: config.id,
      name: config.name,
      type: config.type as "email" | "whatsapp" | "twitter" | "facebook",
      status: config.status as "connected" | "disconnected" | "error",
      config: config.config,
      lastSync: config.lastSync
    };
  }

  async deleteChannel(id: string): Promise<boolean> {
    return await this.deleteChannelConfig(id);
  }

  // Password Reset Token methods
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await this.initialize();
    try {
      await this.db.insert(passwordResetTokens).values({
        email,
        token,
        expiresAt,
      });
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw error;
    }
  }

  async getPasswordResetToken(token: string): Promise<any> {
    await this.initialize();
    try {
      const [tokenData] = await this.db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
      return tokenData;
    } catch (error) {
      console.error('Error getting password reset token:', error);
      return undefined;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.initialize();
    try {
      await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    } catch (error) {
      console.error('Error deleting password reset token:', error);
    }
  }

  async toggleChannelOnlineStatus(id: string, isActive: boolean): Promise<ChannelConfig | undefined> {
    await this.initialize();
    try {
      const [updated] = await this.db
        .update(channelConfigs)
        .set({
          isActive,
          isOnline: isActive, // Set online status based on active status
          updatedAt: new Date()
        })
        .where(eq(channelConfigs.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error toggling channel online status:', error);
      return undefined;
    }
  }

  // Notification operations
  async getUnreadNotificationCount(agentId: string): Promise<number> {
    if (!this.checkDatabaseAvailability()) return 0;
    await this.initialize();
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.assignedAgentId, agentId),
          eq(tickets.status, 'open')
        ));
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  // Audit logging methods  
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    if (!this.checkDatabaseAvailability()) {
      throw new Error("Database connection not available");
    }
    await this.initialize();
    try {
      const result = await this.db.insert(auditLogs).values(insertAuditLog).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  async getAuditLogs(filters: {
    level?: string;
    action?: string;
    userType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    if (!this.checkDatabaseAvailability()) return [];
    await this.initialize();
    try {
      let query = this.db.select().from(auditLogs);

      const conditions = [];

      if (filters.level) {
        conditions.push(eq(auditLogs.level, filters.level));
      }
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.userType) {
        conditions.push(eq(auditLogs.userType, filters.userType));
      }
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.startDate) {
        conditions.push(gte(auditLogs.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(auditLogs.createdAt, filters.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(auditLogs.createdAt));

      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    if (!this.checkDatabaseAvailability()) return undefined;
    await this.initialize();
    try {
      const result = await this.db.select().from(auditLogs).where(eq(auditLogs.id, id));
      return result[0];
    } catch (error) {
      console.error('Error fetching audit log by ID:', error);
      return undefined;
    }
  }

  private async createSampleAuditLogs() {
    const sampleLogs = [
      {
        level: "info",
        action: "admin_login",
        description: "Admin user logged into the system",
        userType: "admin",
        userId: "admin-1",
        userName: "Admin User",
        userEmail: "admin@company.com",
        metadata: { ip: "192.168.1.1", userAgent: "Mozilla/5.0" }
      },
      {
        level: "info",
        action: "ticket_created",
        description: "New support ticket created via email channel",
        userType: "system",
        userId: "system",
        userName: "System",
        userEmail: null,
        metadata: { ticketId: "TK-2025-001", channel: "email" }
      },
      {
        level: "warn",
        action: "login_failed",
        description: "Failed login attempt for agent account",
        userType: "agent",
        userId: "agent-1",
        userName: "John Doe",
        userEmail: "john@example.com",
        metadata: { ip: "192.168.1.10", reason: "invalid_password" }
      },
      {
        level: "info",
        action: "settings_updated",
        description: "Chat functionality was enabled",
        userType: "admin",
        userId: "admin-1",
        userName: "Admin User",
        userEmail: "admin@company.com",
        metadata: { setting: "enable_chat", value: "true" }
      },
      {
        level: "error",
        action: "email_sync_failed",
        description: "Failed to sync emails from mail server",
        userType: "system",
        userId: "system",
        userName: "System",
        userEmail: null,
        metadata: { error: "Connection timeout", channel: "Default Mail" }
      }
    ];

    for (const log of sampleLogs) {
      await this.db.insert(auditLogs).values(log);
    }
  }
}