import { 
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
  type TicketForward,
  type InsertTicketForward
} from "@shared/schema";

// Legacy interface - now using ChannelConfig from schema
interface LegacyChannelConfig {
  id: string;
  name: string;
  type: "email" | "whatsapp" | "twitter" | "facebook" | "sms";
  status: "connected" | "disconnected" | "error";
  config: Record<string, any>;
  lastSync: Date | null;
}
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // Agent management
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentByEmail(email: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  getAllAgents(): Promise<Agent[]>;
  
  // Authentication
  validateAgent(email: string, password: string): Promise<Agent | null>;
  
  // Customer management
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  getAllCustomers(): Promise<Customer[]>;
  validateCustomer(email: string, password: string): Promise<Customer | null>;
  
  // Ticket management
  getTicket(id: string): Promise<Ticket | undefined>;
  getAllTickets(): Promise<Ticket[]>;
  getTicketsByAgent(agentId: string): Promise<Ticket[]>;
  getTicketsByStatus(status: string): Promise<Ticket[]>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  
  // Message management
  getMessagesByTicket(ticketId: string): Promise<Message[]>;
  getTicketMessages(ticketId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Attachment management
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  getAttachmentsByTicket(ticketId: string): Promise<Attachment[]>;
  
  // Template management
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Automation rules
  getAllAutomationRules(): Promise<AutomationRule[]>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  
  // Audit logs
  getAuditLogs(filters?: {
    limit?: number;
    offset?: number;
    level?: string;
    action?: string;
    userType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Ticket forwarding
  forwardTicket(forward: InsertTicketForward): Promise<TicketForward>;
  getTicketForwards(ticketId: string): Promise<TicketForward[]>;
  
  // Chat sessions
  getChatSession(id: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getAllChatSessions(): Promise<ChatSession[]>;
  getActiveChatSessions(): Promise<ChatSession[]>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  endChatSession(id: string): Promise<void>;
  getMessagesByChatSession(sessionId: string): Promise<Message[]>;
  createChatMessage(message: any): Promise<any>;
  
  // Analytics
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<Analytics[]>;
  
  // Admin management
  getAdminUser(username: string): Promise<AdminUser | undefined>;
  getAdminUserById(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;
  validateAdminUser(email: string, password: string): Promise<AdminUser | null>;
  
  // Whitelabel configuration
  getWhitelabelConfig(): Promise<WhitelabelConfig | undefined>;
  createWhitelabelConfig(config: InsertWhitelabelConfig): Promise<WhitelabelConfig>;
  updateWhitelabelConfig(id: string, updates: Partial<WhitelabelConfig>): Promise<WhitelabelConfig | undefined>;
  
  // Application settings
  getApplicationSetting(key: string): Promise<ApplicationSettings | undefined>;
  getAllApplicationSettings(): Promise<ApplicationSettings[]>;
  getApplicationSettingsByCategory(category: string): Promise<ApplicationSettings[]>;
  createApplicationSetting(setting: InsertApplicationSettings): Promise<ApplicationSettings>;
  updateApplicationSetting(key: string, value: string, updatedBy?: string): Promise<ApplicationSettings | undefined>;
  deleteApplicationSetting(key: string): Promise<boolean>;
  
  // Channel management (legacy interface - now using ChannelConfig)
  getChannels(): Promise<ChannelConfig[]>;
  createChannel(channel: InsertChannelConfig): Promise<ChannelConfig>;
  updateChannel(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined>;
  getChannel(id: string): Promise<ChannelConfig | undefined>;
  deleteChannel(id: string): Promise<boolean>;
  
  // Knowledge Base
  getKnowledgeBaseArticle(id: string): Promise<KnowledgeBase | undefined>;
  getAllKnowledgeBaseArticles(): Promise<KnowledgeBase[]>;
  getPublishedKnowledgeBaseArticles(): Promise<KnowledgeBase[]>;
  getKnowledgeBaseArticlesByCategory(category: string): Promise<KnowledgeBase[]>;
  searchKnowledgeBase(query: string): Promise<KnowledgeBase[]>;
  createKnowledgeBaseArticle(article: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBaseArticle(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined>;
  deleteKnowledgeBaseArticle(id: string): Promise<boolean>;
  incrementKnowledgeBaseViews(id: string): Promise<void>;
  rateKnowledgeBaseArticle(id: string, helpful: boolean): Promise<void>;
  
  // Channel Configuration management
  getChannelConfig(id: string): Promise<ChannelConfig | undefined>;
  getAllChannelConfigs(): Promise<ChannelConfig[]>;
  createChannelConfig(config: InsertChannelConfig): Promise<ChannelConfig>;
  updateChannelConfig(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined>;
  deleteChannelConfig(id: string): Promise<boolean>;
  getChannelConfigByType(type: string): Promise<ChannelConfig[]>;
  toggleChannelOnlineStatus(id: string, isOnline: boolean): Promise<ChannelConfig | undefined>;

  // Password Reset operations
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<any>;
  deletePasswordResetToken(token: string): Promise<void>;
  
  // Notification operations
  getUnreadNotificationCount(agentId: string): Promise<number>;
  
  // Audit logging operations
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    level?: string;
    action?: string;
    userType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;
  getAuditLogById(id: string): Promise<AuditLog | undefined>;
}

export class MemStorage implements IStorage {
  private channels = new Map<string, ChannelConfig>();
  private agents: Map<string, Agent> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private messages: Map<string, Message> = new Map();
  private attachments: Map<string, Attachment> = new Map();
  private templates: Map<string, Template> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private analytics: Map<string, Analytics> = new Map();
  private adminUsers: Map<string, AdminUser> = new Map();
  private whitelabelConfig: WhitelabelConfig | null = {
    id: "default",
    isActive: true,
    companyName: "SupportHub",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#1f2937",
    accentColor: "#10b981",
    customCss: "",
    metaTitle: "SupportHub - Customer Support",
    metaDescription: "Comprehensive customer support platform",
    createdAt: new Date(),
    updatedAt: new Date()
  };
  private applicationSettings: Map<string, ApplicationSettings> = new Map();
  private knowledgeBase: Map<string, KnowledgeBase> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private ticketCounter = 1;

  constructor() {
    // Initialize synchronously
    this.initializeData();
  }

  private initializeData() {
    // Create sample agents synchronously  
    const agentPassword = bcrypt.hashSync("password123", 10);
    const adminPassword = bcrypt.hashSync("admin123", 10);
    
    const agents = [
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

    // Create agents synchronously
    for (const agent of agents) {
      const id = randomUUID();
      const agentData: Agent = { 
        ...agent, 
        id,
        avatar: agent.avatar || null,
        createdAt: new Date() 
      };
      this.agents.set(id, agentData);
    }

    // Create sample templates
    const templates = [
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

    for (const template of templates) {
      const id = randomUUID();
      const templateData: Template = { 
        ...template, 
        id, 
        subject: template.subject || null,
        isAiGenerated: false,
        createdAt: new Date() 
      };
      this.templates.set(id, templateData);
    }
    
    // Create default admin user
    const adminId = randomUUID();
    const defaultAdmin: AdminUser = {
      id: adminId,
      name: "System Administrator",
      email: "admin@supporthub.com",
      password: adminPassword,
      role: "super_admin",
      permissions: ["all"],
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.adminUsers.set(adminId, defaultAdmin);
    
    // Create default whitelabel config
    const whitelabelId = randomUUID();
    this.whitelabelConfig = {
      id: whitelabelId,
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
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create default application settings
    const settings = [
      { key: "app_name", value: "SupportHub", category: "general", type: "string", description: "Application name", isPublic: true },
      { key: "tickets_per_page", value: "20", category: "general", type: "number", description: "Number of tickets to show per page", isPublic: false },
      { key: "enable_auto_assignment", value: "true", category: "automation", type: "boolean", description: "Enable automatic ticket assignment", isPublic: false },
      { key: "default_ticket_priority", value: "medium", category: "tickets", type: "string", description: "Default priority for new tickets", isPublic: false },
      { key: "enable_whatsapp", value: "false", category: "integrations", type: "boolean", description: "Enable WhatsApp integration", isPublic: false }
    ];
    
    for (const setting of settings) {
      const id = randomUUID();
      const settingData: ApplicationSettings = {
        ...setting,
        id,
        description: setting.description || null,
        updatedAt: new Date(),
        updatedBy: adminId
      };
      this.applicationSettings.set(setting.key, settingData);
    }

    // Add sample tickets for testing
    this.addSampleTickets();
    
    // Add sample knowledge base articles
    this.addSampleKnowledgeBase();
  }

  private async addSampleTickets() {
    // Create some sample tickets for testing
    const sampleTickets = [
      {
        ticketNumber: "TK-001",
        subject: "Login Issues",
        description: "Unable to login to my account. Getting error message when entering credentials.",
        status: "open" as const,
        priority: "high" as const,
        channel: "email" as const,
        customerName: "John Doe",
        customerContact: "john.doe@example.com"
      },
      {
        ticketNumber: "TK-002", 
        subject: "Password Reset Request",
        description: "Need help resetting my password. The reset email is not arriving.",
        status: "in-progress" as const,
        priority: "medium" as const,
        channel: "whatsapp" as const,
        customerName: "Jane Smith",
        customerContact: "jane.smith@example.com"
      },
      {
        ticketNumber: "TK-003",
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
      await this.createTicket(ticket);
    }
  }


  // Agent methods
  async getAgent(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async getAgentByEmail(email: string): Promise<Agent | undefined> {
    return Array.from(this.agents.values()).find(agent => agent.email === email);
  }

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertAgent.password, 10);
    const agent: Agent = { 
      ...insertAgent, 
      id, 
      password: hashedPassword,
      role: insertAgent.role || "agent",
      avatar: insertAgent.avatar || null,
      createdAt: new Date() 
    };
    this.agents.set(id, agent);
    return agent;
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const updatedAgent = { ...agent, ...updates };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  async validateAgent(email: string, password: string): Promise<Agent | null> {
    const agent = await this.getAgentByEmail(email);
    if (!agent) return null;
    
    const isValid = await bcrypt.compare(password, agent.password);
    return isValid ? agent : null;
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertCustomer.password, 10);
    const customer: Customer = {
      ...insertCustomer,
      id,
      password: hashedPassword,
      emailVerified: insertCustomer.emailVerified ?? false,
      isVerified: insertCustomer.isVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    
    const updatedCustomer = { ...customer, ...updates, updatedAt: new Date() };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async validateCustomer(email: string, password: string): Promise<Customer | null> {
    const customer = await this.getCustomerByEmail(email);
    if (!customer) return null;
    
    const isValid = await bcrypt.compare(password, customer.password);
    return isValid ? customer : null;
  }

  // Ticket methods
  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getTicketsByAgent(agentId: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(ticket => 
      ticket.assignedAgentId === agentId
    );
  }

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(ticket => 
      ticket.status === status
    );
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const ticketNumber = `TK-${new Date().getFullYear()}-${String(this.ticketCounter++).padStart(3, '0')}`;
    const ticket: Ticket = { 
      ...insertTicket, 
      id, 
      ticketNumber,
      status: insertTicket.status || "open",
      priority: insertTicket.priority || "medium",
      assignedAgentId: insertTicket.assignedAgentId || null,
      autoAssigned: insertTicket.autoAssigned || false,
      aiPowered: insertTicket.aiPowered || false,
      sentiment: insertTicket.sentiment || null,
      urgencyScore: insertTicket.urgencyScore || 5,
      whatsappMessageId: insertTicket.whatsappMessageId || null,
      livechatSessionId: insertTicket.livechatSessionId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;
    
    const updatedTicket = { ...ticket, ...updates, updatedAt: new Date() };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  // Message methods
  async getMessagesByTicket(ticketId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      senderId: insertMessage.senderId || null,
      isInternal: insertMessage.isInternal ?? false,
      attachments: (insertMessage.attachments as string[]) || [],
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    
    // Update ticket's updatedAt timestamp
    if (insertMessage.ticketId) {
      await this.updateTicket(insertMessage.ticketId, {});
    }
    
    return message;
  }

  async getTicketMessages(ticketId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  // Attachment methods
  async getAttachment(id: string): Promise<Attachment | undefined> {
    return this.attachments.get(id);
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = randomUUID();
    const attachment: Attachment = { 
      ...insertAttachment, 
      id, 
      ticketId: insertAttachment.ticketId || null,
      messageId: insertAttachment.messageId || null,
      createdAt: new Date() 
    };
    this.attachments.set(id, attachment);
    return attachment;
  }

  async getAttachmentsByTicket(ticketId: string): Promise<Attachment[]> {
    return Array.from(this.attachments.values()).filter(attachment => 
      attachment.ticketId === ticketId
    );
  }

  // Template methods
  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = { 
      ...insertTemplate, 
      id, 
      subject: insertTemplate.subject || null,
      isAiGenerated: insertTemplate.isAiGenerated || false,
      createdAt: new Date() 
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Automation rules methods
  async getAllAutomationRules(): Promise<AutomationRule[]> {
    return Array.from(this.automationRules.values());
  }

  async createAutomationRule(insertRule: InsertAutomationRule): Promise<AutomationRule> {
    const id = randomUUID();
    const rule: AutomationRule = { 
      ...insertRule, 
      id, 
      isActive: insertRule.isActive ?? true,
      priority: insertRule.priority || 1,
      createdAt: new Date() 
    };
    this.automationRules.set(id, rule);
    return rule;
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
    // Generate sample audit logs for demonstration
    const sampleLogs: AuditLog[] = [
      {
        id: randomUUID(),
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
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(Date.now() - 10800000), // 3 hours ago
      },
      {
        id: randomUUID(),
        level: "info",
        action: "email_polling",
        entity: "channel",
        entityId: "channel-789",
        userId: "system",
        userType: "system",
        userName: "Email Poller",
        userEmail: null,
        ipAddress: "127.0.0.1",
        userAgent: "EmailPoller/1.0",
        sessionId: null,
        description: "Email polling completed successfully - found 3 new emails",
        metadata: { channelName: "Support Email", emailsFound: 3, channelType: "email" },
        success: true,
        errorMessage: null,
        duration: 2300,
        createdAt: new Date(Date.now() - 14400000), // 4 hours ago
      },
      {
        id: randomUUID(),
        level: "error",
        action: "database_connection",
        entity: "system",
        entityId: null,
        userId: "system",
        userType: "system",
        userName: "Database Service",
        userEmail: null,
        ipAddress: "127.0.0.1",
        userAgent: "DatabaseService/1.0",
        sessionId: null,
        description: "Database connection failed during startup",
        metadata: { connectionString: "postgresql://***", retryAttempt: 3 },
        success: false,
        errorMessage: "Connection timeout after 30 seconds",
        duration: 30000,
        createdAt: new Date(Date.now() - 18000000), // 5 hours ago
      },
    ];

    // Apply filters
    let filteredLogs = sampleLogs;
    
    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    
    if (filters?.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    if (filters?.userType) {
      filteredLogs = filteredLogs.filter(log => log.userType === filters.userType);
    }

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return {
      id: randomUUID(),
      ...log,
      createdAt: new Date(),
    };
  }

  // Chat session methods
  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = { 
      ...insertSession, 
      id,
      isActive: insertSession.isActive ?? true,
      userAgent: insertSession.userAgent || null,
      ipAddress: insertSession.ipAddress || null,
      country: insertSession.country || null,
      assignedAgentId: insertSession.assignedAgentId || null,
      endedAt: insertSession.endedAt || null,
      createdAt: new Date() 
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getActiveChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(session => session.isActive);
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values());
  }

  async endChatSession(id: string): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      session.isActive = false;
      session.status = 'ended';
      session.endTime = new Date();
    }
  }

  async getMessagesByChatSession(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatSessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  }

  async createChatMessage(messageData: any): Promise<any> {
    const id = randomUUID();
    const message = {
      ...messageData,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  // Analytics methods
  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const id = randomUUID();
    const analytics: Analytics = { 
      ...insertAnalytics, 
      id,
      channel: insertAnalytics.channel || null,
      agentId: insertAnalytics.agentId || null,
      createdAt: new Date() 
    };
    this.analytics.set(id, analytics);
    return analytics;
  }

  async getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<Analytics[]> {
    return Array.from(this.analytics.values()).filter(analytics => {
      const date = new Date(analytics.date);
      return date >= startDate && date <= endDate;
    });
  }

  // Admin user methods
  async getAdminUser(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(admin => admin.email === username);
  }

  async getAdminUserById(id: string): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(admin => admin.email === email);
  }

  async createAdminUser(insertAdmin: InsertAdminUser): Promise<AdminUser> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertAdmin.password, 10);
    const admin: AdminUser = { 
      ...insertAdmin, 
      id, 
      password: hashedPassword,
      role: insertAdmin.role || "admin",
      permissions: (insertAdmin.permissions as string[]) || [],
      isActive: insertAdmin.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.adminUsers.set(id, admin);
    return admin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values());
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | undefined> {
    const admin = this.adminUsers.get(id);
    if (!admin) return undefined;
    
    const updatedAdmin = { ...admin, ...updates, updatedAt: new Date() };
    this.adminUsers.set(id, updatedAdmin);
    return updatedAdmin;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    return this.adminUsers.delete(id);
  }

  async validateAdminUser(email: string, password: string): Promise<AdminUser | null> {
    const admin = await this.getAdminUserByEmail(email);
    if (!admin || !admin.isActive) return null;
    
    const isValid = await bcrypt.compare(password, admin.password);
    if (isValid) {
      // Update last login
      await this.updateAdminUser(admin.id, { lastLogin: new Date() });
      return admin;
    }
    return null;
  }

  // Whitelabel configuration methods
  async getWhitelabelConfig(): Promise<WhitelabelConfig | undefined> {
    return this.whitelabelConfig || undefined;
  }

  async createWhitelabelConfig(insertConfig: InsertWhitelabelConfig): Promise<WhitelabelConfig> {
    const id = randomUUID();
    const config: WhitelabelConfig = { 
      ...insertConfig, 
      id,
      logoUrl: insertConfig.logoUrl || null,
      primaryColor: insertConfig.primaryColor || "#3b82f6",
      secondaryColor: insertConfig.secondaryColor || "#64748b",
      accentColor: insertConfig.accentColor || "#10b981",
      supportEmail: insertConfig.supportEmail || null,
      customDomain: insertConfig.customDomain || null,
      faviconUrl: insertConfig.faviconUrl || null,
      customCss: insertConfig.customCss || null,
      footerText: insertConfig.footerText || null,
      isActive: insertConfig.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.whitelabelConfig = config;
    return config;
  }

  async updateWhitelabelConfig(id: string, updates: Partial<WhitelabelConfig>): Promise<WhitelabelConfig | undefined> {
    if (!this.whitelabelConfig || this.whitelabelConfig.id !== id) return undefined;
    
    this.whitelabelConfig = { ...this.whitelabelConfig, ...updates, updatedAt: new Date() };
    return this.whitelabelConfig;
  }

  // Application settings methods
  async getApplicationSetting(key: string): Promise<ApplicationSettings | undefined> {
    return this.applicationSettings.get(key);
  }

  async getAllApplicationSettings(): Promise<ApplicationSettings[]> {
    return Array.from(this.applicationSettings.values());
  }

  async getApplicationSettingsByCategory(category: string): Promise<ApplicationSettings[]> {
    return Array.from(this.applicationSettings.values()).filter(setting => setting.category === category);
  }

  async createApplicationSetting(insertSetting: InsertApplicationSettings): Promise<ApplicationSettings> {
    const id = randomUUID();
    const setting: ApplicationSettings = { 
      ...insertSetting, 
      id,
      description: insertSetting.description || null,
      isPublic: insertSetting.isPublic ?? false,
      updatedAt: new Date(),
      updatedBy: insertSetting.updatedBy || null
    };
    this.applicationSettings.set(setting.key, setting);
    return setting;
  }

  async updateApplicationSetting(key: string, value: string, updatedBy?: string): Promise<ApplicationSettings | undefined> {
    const setting = this.applicationSettings.get(key);
    if (!setting) return undefined;
    
    const updatedSetting = { ...setting, value, updatedBy: updatedBy || null, updatedAt: new Date() };
    this.applicationSettings.set(key, updatedSetting);
    return updatedSetting;
  }

  async deleteApplicationSetting(key: string): Promise<boolean> {
    return this.applicationSettings.delete(key);
  }

  // Knowledge Base methods
  async getKnowledgeBaseArticle(id: string): Promise<KnowledgeBase | undefined> {
    return this.knowledgeBase.get(id);
  }

  async getAllKnowledgeBaseArticles(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values());
  }

  async getPublishedKnowledgeBaseArticles(): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values()).filter(article => article.isPublished);
  }

  async getKnowledgeBaseArticlesByCategory(category: string): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBase.values()).filter(article => 
      article.category === category && article.isPublished
    );
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.knowledgeBase.values()).filter(article => {
      if (!article.isPublished) return false;
      
      const titleMatch = article.title.toLowerCase().includes(searchTerm);
      const contentMatch = article.content.toLowerCase().includes(searchTerm);
      const summaryMatch = article.summary?.toLowerCase().includes(searchTerm);
      const tagMatch = article.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      
      return titleMatch || contentMatch || summaryMatch || tagMatch;
    }).sort((a, b) => {
      // Sort by relevance - title matches first, then by views
      const aTitleMatch = a.title.toLowerCase().includes(searchTerm);
      const bTitleMatch = b.title.toLowerCase().includes(searchTerm);
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      return (b.views || 0) - (a.views || 0);
    });
  }

  async createKnowledgeBaseArticle(insertArticle: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const id = randomUUID();
    const article: KnowledgeBase = {
      id,
      title: insertArticle.title,
      content: insertArticle.content,
      summary: insertArticle.summary || null,
      category: insertArticle.category,
      tags: (insertArticle.tags as string[]) || [],
      isPublished: insertArticle.isPublished || false,
      views: 0,
      helpful: 0,
      notHelpful: 0,
      authorId: insertArticle.authorId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.knowledgeBase.set(id, article);
    return article;
  }

  async updateKnowledgeBaseArticle(id: string, updates: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    const article = this.knowledgeBase.get(id);
    if (!article) return undefined;
    
    const updatedArticle = { 
      ...article, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.knowledgeBase.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteKnowledgeBaseArticle(id: string): Promise<boolean> {
    return this.knowledgeBase.delete(id);
  }

  async incrementKnowledgeBaseViews(id: string): Promise<void> {
    const article = this.knowledgeBase.get(id);
    if (article) {
      article.views = (article.views || 0) + 1;
      this.knowledgeBase.set(id, article);
    }
  }

  async rateKnowledgeBaseArticle(id: string, helpful: boolean): Promise<void> {
    const article = this.knowledgeBase.get(id);
    if (article) {
      if (helpful) {
        article.helpful = (article.helpful || 0) + 1;
      } else {
        article.notHelpful = (article.notHelpful || 0) + 1;
      }
      this.knowledgeBase.set(id, article);
    }
  }

  private async addSampleKnowledgeBase() {
    const sampleArticles = [
      {
        title: "How to Reset Your Password",
        content: `# How to Reset Your Password

If you've forgotten your password, you can easily reset it by following these steps:

## Step 1: Go to the Login Page
Navigate to the login page and click on "Forgot Password" link.

## Step 2: Enter Your Email
Enter the email address associated with your account.

## Step 3: Check Your Email
We'll send you a password reset link to your email address.

## Step 4: Create New Password
Click the link in the email and follow the instructions to create a new password.

## Need Help?
If you don't receive the reset email within 5 minutes, check your spam folder or contact our support team.`,
        summary: "Learn how to reset your password in 4 simple steps.",
        category: "account",
        tags: ["password", "reset", "login", "email"],
        isPublished: true,
        authorId: undefined
      },
      {
        title: "Understanding Your Bill",
        content: `# Understanding Your Bill

Your monthly bill includes several components that may need explanation:

## Subscription Fee
This is your monthly plan cost based on your selected tier.

## Usage Charges
Additional charges for usage beyond your plan limits.

## Taxes and Fees
Applicable taxes and regulatory fees based on your location.

## Payment Methods
You can pay via credit card, bank transfer, or PayPal.

## Questions About Billing?
Contact our billing department for detailed explanations of any charges.`,
        summary: "Understand the different components of your monthly bill.",
        category: "billing",
        tags: ["billing", "payment", "invoice", "charges"],
        isPublished: true,
        authorId: undefined
      },
      {
        title: "Troubleshooting Connection Issues",
        content: `# Troubleshooting Connection Issues

Having trouble connecting? Try these solutions:

## Check Your Internet Connection
Ensure your internet connection is stable and working.

## Clear Browser Cache
Clear your browser cache and cookies, then try again.

## Disable Browser Extensions
Some browser extensions can interfere with the connection.

## Try a Different Browser
Test with a different web browser to isolate the issue.

## Check Server Status
Visit our status page to see if there are any ongoing issues.

## Contact Support
If none of these steps work, please contact our technical support team.`,
        summary: "Step-by-step guide to resolve common connection problems.",
        category: "technical",
        tags: ["connection", "troubleshooting", "browser", "internet"],
        isPublished: true,
        authorId: undefined
      },
      {
        title: "Getting Started Guide",
        content: `# Getting Started Guide

Welcome! Here's how to get started with our platform:

## Create Your Account
Sign up with your email address and verify your account.

## Complete Your Profile
Add your personal information and preferences.

## Explore Features
Take a tour of the main features and capabilities.

## Set Up Notifications
Configure how and when you want to receive notifications.

## Contact Support
Our support team is here to help you succeed.

Ready to begin? Let's get started!`,
        summary: "Everything you need to know to get started on our platform.",
        category: "general",
        tags: ["getting started", "setup", "onboarding", "new user"],
        isPublished: true,
        authorId: undefined
      }
    ];

    for (const article of sampleArticles) {
      await this.createKnowledgeBaseArticle(article);
    }
    
    // Initialize sample channels
    await this.initializeSampleChannels();
  }

  private async initializeSampleChannels() {
    // Only initialize if no channels exist
    if (this.channels.size === 0) {
      const sampleChannels: Omit<ChannelConfig, 'id'>[] = [
        {
          name: "Primary Email Support",
          type: "email",
          status: "disconnected",
          config: {
            smtp_host: "smtp.gmail.com",
            smtp_port: "587",
            username: "",
            password: ""
          },
          lastSync: null,
          isActive: true,
          isOnline: false,
          errorMessage: null,
          lastErrorTime: null,
          inboundSettings: null,
          outboundSettings: null,
          pollingConfig: null,
          webhookSettings: null,
          integrationSettings: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "WhatsApp Business",
          type: "whatsapp", 
          status: "disconnected",
          config: {
            access_token: "",
            phone_number_id: "",
            webhook_verify_token: ""
          },
          lastSync: null,
          isActive: true,
          isOnline: false,
          errorMessage: null,
          lastErrorTime: null,
          inboundSettings: null,
          outboundSettings: null,
          pollingConfig: null,
          webhookSettings: null,
          integrationSettings: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      for (const channelData of sampleChannels) {
        await this.createChannel(channelData);
      }
    }
  }

  async getChannels(): Promise<ChannelConfig[]> {
    return await this.getAllChannelConfigs();
  }

  async createChannel(channel: InsertChannelConfig): Promise<ChannelConfig> {
    const id = `${channel.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newChannel: ChannelConfig = {
      ...channel,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: channel.status || 'disconnected',
      lastSync: null,
      isActive: channel.isActive ?? true,
      isOnline: false,
      errorMessage: null,
      lastErrorTime: null
    };
    this.channels.set(id, newChannel);
    return newChannel;
  }

  async updateChannel(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    return await this.updateChannelConfig(id, updates);
  }

  async updateChannelOriginal(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    const channel = this.channels.get(id);
    if (!channel) {
      return undefined;
    }
    
    const updatedChannel = { 
      ...channel, 
      ...updates,
      updatedAt: new Date()
    };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async getChannel(id: string): Promise<ChannelConfig | undefined> {
    return await this.getChannelConfig(id);
  }

  async getChannelOriginal(id: string): Promise<ChannelConfig | undefined> {
    return this.channels.get(id);
  }

  async deleteChannel(id: string): Promise<boolean> {
    return this.channels.delete(id);
  }

  async toggleChannelOnlineStatus(id: string, isActive: boolean): Promise<ChannelConfig | undefined> {
    const channel = this.channels.get(id);
    if (channel) {
      const updatedChannel = { 
        ...channel, 
        isActive,
        isOnline: isActive, // Set online status to match active status
        updatedAt: new Date()
      };
      this.channels.set(id, updatedChannel);
      return updatedChannel;
    }
    return undefined;
  }

  // Password Reset operations (in-memory stubs)
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    console.log('Password reset token created (in-memory):', { email, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<any> {
    console.log('Getting password reset token (in-memory):', token);
    return undefined;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    console.log('Deleting password reset token (in-memory):', token);
  }

  // Channel Config operations (stubs for interface compatibility)
  async getChannelConfig(id: string): Promise<ChannelConfig | undefined> {
    return this.channels.get(id);
  }

  async getAllChannelConfigs(): Promise<ChannelConfig[]> {
    return Array.from(this.channels.values());
  }

  async createChannelConfig(config: InsertChannelConfig): Promise<ChannelConfig> {
    return this.createChannel(config);
  }

  async updateChannelConfig(id: string, updates: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    return this.updateChannel(id, updates);
  }

  async deleteChannelConfig(id: string): Promise<boolean> {
    return this.deleteChannel(id);
  }

  async getChannelConfigByType(type: string): Promise<ChannelConfig[]> {
    return Array.from(this.channels.values()).filter(channel => channel.type === type);
  }

  // Notification operations
  async getUnreadNotificationCount(agentId: string): Promise<number> {
    // Count new/unread tickets assigned to this agent
    const agentTickets = Array.from(this.tickets.values()).filter(
      ticket => ticket.assignedAgentId === agentId && ticket.status === 'open'
    );
    return agentTickets.length;
  }

  // Audit logging methods
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      createdAt: new Date()
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
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
    let logs = Array.from(this.auditLogs.values());

    // Apply filters
    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }
    if (filters.userType) {
      logs = logs.filter(log => log.userType === filters.userType);
    }
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.createdAt!) >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.createdAt!) <= filters.endDate!);
    }

    // Sort by created date (newest first)
    logs.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return logs.slice(offset, offset + limit);
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    return this.auditLogs.get(id);
  }

  // Ticket forwarding methods
  private ticketForwards = new Map<string, TicketForward>();

  async forwardTicket(forward: InsertTicketForward): Promise<TicketForward> {
    const id = randomUUID();
    const ticketForward: TicketForward = {
      ...forward,
      id,
      createdAt: new Date()
    };
    this.ticketForwards.set(id, ticketForward);
    return ticketForward;
  }

  async getTicketForwards(ticketId: string): Promise<TicketForward[]> {
    return Array.from(this.ticketForwards.values())
      .filter(forward => forward.ticketId === ticketId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

import { PostgresStorage } from './postgres-storage';

// Initialize storage with fallback handling
function createStorage(): IStorage {
  // For now, always use MemStorage to avoid Neon.tech dependency issues
  // PostgreSQL integration can be enabled later with proper pg driver
  console.log('✓ Using in-memory storage (MemStorage)');
  return new MemStorage();
}

export const storage = createStorage();

// Export getStorage function for compatibility
export function getStorage(): IStorage {
  return storage;
}
