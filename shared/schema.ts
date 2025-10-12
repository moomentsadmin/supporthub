import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("agent"),
  avatar: text("avatar"),
  signature: text("signature"), // HTML email signature
  signatureImage: text("signature_image"), // Company logo for signature
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  avatar: text("avatar"),
  isVerified: boolean("is_verified").default(false),
  verificationToken: text("verification_token"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in-progress, resolved, closed
  priority: text("priority").notNull().default("medium"), // low, medium, high
  channel: text("channel").notNull(), // email, whatsapp, twitter, facebook, livechat, sms
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  customerId: varchar("customer_id").references(() => customers.id), // Link to customer if registered
  assignedAgentId: varchar("assigned_agent_id").references(() => agents.id),
  autoAssigned: boolean("auto_assigned").default(false),
  aiPowered: boolean("ai_powered").default(false),
  sentiment: text("sentiment"), // positive, negative, neutral
  urgencyScore: integer("urgency_score").default(5), // 1-10 scale
  whatsappMessageId: text("whatsapp_message_id"),
  emailMessageId: text("email_message_id"),
  livechatSessionId: text("livechat_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, active, ended
  assignedAgentId: varchar("assigned_agent_id").references(() => agents.id),
  assignedAgentName: text("assigned_agent_name"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id),
  chatSessionId: varchar("chat_session_id").references(() => chatSessions.id),
  senderId: varchar("sender_id"), // null for customer messages
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content"), // HTML version of message
  emailTo: text("email_to"), // TO email addresses (comma separated)
  emailCc: text("email_cc"), // CC email addresses (comma separated)
  emailBcc: text("email_bcc"), // BCC email addresses (comma separated)
  isHtmlFormat: boolean("is_html_format").default(false),
  sender: text("sender").notNull().default("customer"), // customer, agent, system
  isInternal: boolean("is_internal").notNull().default(false),
  attachments: json("attachments").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => tickets.id),
  messageId: varchar("message_id").references(() => messages.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  category: text("category").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  conditions: json("conditions").notNull(), // JSON object defining trigger conditions
  actions: json("actions").notNull(), // JSON object defining actions to take
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});



export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  metric: text("metric").notNull(), // tickets_created, tickets_resolved, response_time, etc.
  value: integer("value").notNull(),
  channel: text("channel"),
  agentId: varchar("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whitelabelConfig = pgTable("whitelabel_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"),
  secondaryColor: text("secondary_color").default("#64748b"),
  accentColor: text("accent_color").default("#10b981"),
  customDomain: text("custom_domain"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  contactSectionTitle: text("contact_section_title"),
  faviconUrl: text("favicon_url"),
  customCss: text("custom_css"),
  footerText: text("footer_text"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin
  permissions: json("permissions").$type<string[]>().default([]),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applicationSettings = pgTable("application_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(), // general, email, whatsapp, security, etc.
  type: text("type").notNull(), // string, number, boolean, json
  description: text("description"),
  isPublic: boolean("is_public").default(false), // whether setting can be read by non-admin users
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => adminUsers.id),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  category: text("category").notNull(), // account, billing, technical, general
  tags: json("tags").$type<string[]>().default([]),
  isPublished: boolean("is_published").default(false),
  views: integer("views").default(0),
  helpful: integer("helpful").default(0),
  notHelpful: integer("not_helpful").default(0),
  authorId: varchar("author_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channel configurations table  
export const channelConfigs = pgTable("channel_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type", { enum: ["email", "whatsapp", "twitter", "facebook", "sms"] }).notNull(),
  status: text("status", { enum: ["connected", "disconnected", "error"] }).default("disconnected"),
  config: json("config").$type<Record<string, any>>().notNull(), // Store configuration as JSON
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false), // Track online/offline status
  errorMessage: text("error_message"), // Store detailed error messages
  lastErrorTime: timestamp("last_error_time"), // Track when the last error occurred
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Email-specific configuration fields
  provider: text("provider"), // "gmail", "office365", "outlook", "smtp"
  inboundSettings: json("inbound_settings").$type<{
    server?: string;
    port?: number;
    protocol?: "imap" | "pop3";
    username?: string;
    password?: string;
    ssl?: boolean;
    tls?: boolean;
  }>(),
  outboundSettings: json("outbound_settings").$type<{
    smtp_host?: string;
    smtp_port?: number;
    username?: string;
    password?: string;
    ssl?: boolean;
    tls?: boolean;
    auth_method?: "login" | "oauth2";
  }>(),
  pollingConfig: json("polling_config").$type<{
    interval?: number; // minutes
    enabled?: boolean;
    maxEmails?: number;
  }>().default({ interval: 1, enabled: false, maxEmails: 50 }),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs table for tracking all system activities
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level", { enum: ["info", "warn", "error", "debug"] }).notNull().default("info"),
  action: text("action").notNull(), // "login", "logout", "create_ticket", "update_channel", etc.
  entity: text("entity"), // "agent", "customer", "ticket", "channel", etc.
  entityId: varchar("entity_id"), // ID of the entity being acted upon
  userId: varchar("user_id"), // ID of the user performing the action (agent or admin)
  userType: text("user_type", { enum: ["agent", "customer", "admin", "system"] }).notNull(),
  userName: text("user_name"), // Name of the user for easy reading
  userEmail: text("user_email"), // Email of the user
  ipAddress: text("ip_address"), // IP address of the request
  userAgent: text("user_agent"), // Browser/client information
  sessionId: text("session_id"), // Session identifier
  description: text("description").notNull(), // Human-readable description
  metadata: json("metadata").$type<Record<string, any>>(), // Additional context data
  success: boolean("success").default(true), // Whether the action was successful
  errorMessage: text("error_message"), // Error details if action failed
  duration: integer("duration"), // How long the action took (ms)
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketForwards = pgTable("ticket_forwards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id),
  forwardedBy: varchar("forwarded_by").notNull().references(() => agents.id),
  forwardedByName: text("forwarded_by_name").notNull(),
  forwardType: text("forward_type").notNull(), // internal, external
  recipientAgentId: varchar("recipient_agent_id").references(() => agents.id), // For internal forwards
  recipientEmail: text("recipient_email"), // For external forwards
  recipientName: text("recipient_name"), // For external forwards
  forwardMessage: text("forward_message"), // Optional message from forwarding agent
  status: text("status").notNull().default("sent"), // sent, delivered, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationToken: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
  lastLogin: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

// Removed duplicate - using the ones below

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export const insertWhitelabelConfigSchema = createInsertSchema(whitelabelConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertApplicationSettingsSchema = createInsertSchema(applicationSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  views: true,
  helpful: true,
  notHelpful: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelConfigSchema = createInsertSchema(channelConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertTicketForwardSchema = createInsertSchema(ticketForwards).omit({
  id: true,
  createdAt: true,
});

// Login schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const customerRegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

export const customerReplySchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Types
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;
export type CustomerLoginRequest = z.infer<typeof customerLoginSchema>;
export type CustomerRegisterRequest = z.infer<typeof customerRegisterSchema>;
export type CustomerReplyRequest = z.infer<typeof customerReplySchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type WhitelabelConfig = typeof whitelabelConfig.$inferSelect;
export type InsertWhitelabelConfig = z.infer<typeof insertWhitelabelConfigSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type ApplicationSettings = typeof applicationSettings.$inferSelect;
export type InsertApplicationSettings = z.infer<typeof insertApplicationSettingsSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type ChannelConfig = typeof channelConfigs.$inferSelect;
export type InsertChannelConfig = typeof insertChannelConfigSchema._type;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type TicketForward = typeof ticketForwards.$inferSelect;
export type InsertTicketForward = z.infer<typeof insertTicketForwardSchema>;

// API Response types
export type TicketWithAgent = Ticket & {
  assignedAgent?: Pick<Agent, 'id' | 'name' | 'email' | 'avatar'> | null;
};

export type DashboardStats = {
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  avgResponse: string;
};

export type ChannelStatus = {
  email: string;
  whatsapp: string;
  twitter: string;
  facebook: string;
  livechat: string;
  sms: string;
};

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

export type WhatsAppWebhook = {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
};

export type LiveChatMessage = {
  sessionId: string;
  message: string;
  sender: 'visitor' | 'agent';
  timestamp: Date;
  senderName?: string;
};

export type AdvancedAnalytics = {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  agentPerformance: Array<{
    agentId: string;
    name: string;
    ticketsHandled: number;
    avgResponseTime: number;
    resolutionRate: number;
  }>;
  channelMetrics: Array<{
    channel: string;
    ticketCount: number;
    satisfaction: number;
  }>;
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
};
