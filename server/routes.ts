import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import { storage } from "./storage";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { z } from "zod";
import {
  insertTicketSchema,
  insertMessageSchema,
  insertTicketForwardSchema,
  loginSchema
} from "@shared/schema";
import * as bcrypt from "bcrypt";
// Email service will be imported as needed
import { validateDatabaseConnection } from "./db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

// Configure multer for file uploads with allowlist
const allowedMimeTypes = [
  'image/png', 'image/jpeg', 'image/gif',
  'application/pdf',
  'text/plain'
];
const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt'];

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase();
      const base = crypto.randomBytes(12).toString('hex');
      cb(null, `${base}${safeExt}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const typeOk = allowedMimeTypes.includes(file.mimetype);
    const extOk = allowedExtensions.includes(ext);
    if (!typeOk || !extOk) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});

// Session types
interface AuthenticatedRequest extends Request {
  session: {
    agentId?: string;
    destroy: (callback: (err: any) => void) => void;
  } & session.Session;
}

// Authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: Response, next: () => void) => {
  if (!req.session?.agentId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Admin authentication middleware
const requireAdminAuth = (req: any, res: Response, next: () => void) => {
  if (!req.session?.adminId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    const dbConnected = validateDatabaseConnection();
    res.json({
      status: "ok",
      database: dbConnected ? "connected" : "unavailable",
      timestamp: new Date().toISOString()
    });
  });

  // Public ticket creation (no auth required)
  app.post("/api/tickets", async (req: Request, res: Response) => {
    try {
      const ticketData = req.body;

      // Validate required fields
      if (!ticketData.subject || !ticketData.description || !ticketData.customerName || !ticketData.customerContact || !ticketData.channel) {
        return res.status(400).json({
          message: "Missing required fields: subject, description, customerName, customerContact, channel"
        });
      }

      // Remove ticketNumber from input as it will be auto-generated
      delete ticketData.ticketNumber;

      const ticket = await storage.createTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket", error: (error as Error).message });
    }
  });

  // Public ticket search by email (no auth required) - MUST come before :id route
  app.get("/api/public/tickets/search", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      console.log(`Searching tickets for email: ${email}`);
      const allTickets = await storage.getAllTickets();
      console.log(`Total tickets in database: ${allTickets.length}`);

      const userTickets = allTickets.filter(ticket =>
        ticket.customerContact?.toLowerCase() === email.toLowerCase()
      );

      console.log(`Found ${userTickets.length} tickets for ${email}`);

      // Return limited public information
      const publicTickets = userTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        customerName: ticket.customerName,
        customerContact: ticket.customerContact,
        createdAt: ticket.createdAt
      }));

      res.json(publicTickets);
    } catch (error) {
      console.error("Error searching tickets:", error);
      res.status(500).json({ message: "Failed to search tickets" });
    }
  });

  // Public ticket search by ID (no auth required) - MUST come after /search route
  app.get("/api/public/tickets/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ticket = await storage.getTicket(id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Return limited public information
      const publicTicket = {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        customerName: ticket.customerName,
        customerContact: ticket.customerContact,
        createdAt: ticket.createdAt
      };

      res.json(publicTicket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Public ticket reply endpoint (no auth required)
  app.post("/api/public/tickets/:id/reply", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get the ticket to verify it exists
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Create a message from the customer
      const newMessage = await storage.createMessage({
        ticketId: id,
        content: message.trim(),
        sender: 'customer',
        senderName: ticket.customerName,
        senderId: null
      });

      // Update ticket status to 'open' if it was resolved/closed
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await storage.updateTicket(id, {
          status: 'open',
          updatedAt: new Date()
        });
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating ticket reply:", error);
      res.status(500).json({ message: "Failed to send reply", error: (error as Error).message });
    }
  });

  // Public Knowledge Base routes (no auth required)
  app.get("/api/public/kb", async (req: Request, res: Response) => {
    try {
      const { category, search } = req.query;
      let articles;

      if (search && typeof search === 'string') {
        articles = await storage.searchKnowledgeBase(search);
      } else if (category && typeof category === 'string') {
        articles = await storage.getKnowledgeBaseArticlesByCategory(category);
      } else {
        articles = await storage.getPublishedKnowledgeBaseArticles();
      }

      // Return articles without full content for listing
      const articleSummaries = articles.map(article => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        category: article.category,
        tags: article.tags,
        views: article.views,
        helpful: article.helpful,
        notHelpful: article.notHelpful,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }));

      res.json(articleSummaries);
    } catch (error) {
      console.error("Error fetching knowledge base articles:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base articles" });
    }
  });

  app.get("/api/public/kb/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const article = await storage.getKnowledgeBaseArticle(id);

      if (!article || !article.isPublished) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Increment view count
      await storage.incrementKnowledgeBaseViews(id);

      // Return full article content
      res.json(article);
    } catch (error) {
      console.error("Error fetching knowledge base article:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base article" });
    }
  });

  app.post("/api/public/kb/:id/rate", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { helpful } = req.body;

      if (typeof helpful !== 'boolean') {
        return res.status(400).json({ message: "Helpful parameter must be boolean" });
      }

      const article = await storage.getKnowledgeBaseArticle(id);
      if (!article || !article.isPublished) {
        return res.status(404).json({ message: "Article not found" });
      }

      await storage.rateKnowledgeBaseArticle(id, helpful);
      res.json({ message: "Rating recorded successfully" });
    } catch (error) {
      console.error("Error rating knowledge base article:", error);
      res.status(500).json({ message: "Failed to rate knowledge base article" });
    }
  });

  app.get("/api/public/kb/categories", async (req: Request, res: Response) => {
    try {
      const articles = await storage.getPublishedKnowledgeBaseArticles();
      const categoriesSet = new Set(articles.map(article => article.category));
      const categories = Array.from(categoriesSet);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching knowledge base categories:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base categories" });
    }
  });

  // Public live chat endpoints
  app.post("/api/public/chat/start", async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ message: "Name, email, and initial message are required" });
      }

      // Create chat session using existing storage
      const session = await storage.createChatSession({
        customerName: name,
        customerEmail: email,
        status: 'waiting',
        startTime: new Date(),
        isActive: true
      });

      // Add initial message
      await storage.createMessage({
        chatSessionId: session.id,
        content: message,
        sender: 'customer',
        senderName: name,
        isInternal: false
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Start chat error:', error);
      res.status(500).json({ message: 'Failed to start chat session' });
    }
  });

  // Customer send message endpoint (public)
  app.post("/api/public/chat/sessions/:id/messages", async (req: Request, res: Response) => {
    try {
      const { content, sender, senderName } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const message = await storage.createMessage({
        chatSessionId: req.params.id,
        content,
        sender: sender || 'customer',
        senderName: senderName || 'Customer',
        isInternal: false
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get("/api/public/chat/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      // Get messages for this session
      const messages = await storage.getMessagesByChatSession(sessionId);

      res.json({
        ...session,
        messages
      });
    } catch (error) {
      console.error('Get chat session error:', error);
      res.status(500).json({ message: 'Failed to get chat session' });
    }
  });

  app.post("/api/public/chat/message", async (req: Request, res: Response) => {
    try {
      const { sessionId, content } = req.body;

      if (!sessionId || !content) {
        return res.status(400).json({ message: "Session ID and content are required" });
      }

      // Verify session exists
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      // Create message
      const message = await storage.createMessage({
        chatSessionId: sessionId,
        content,
        sender: 'customer',
        senderName: session.customerName,
        isInternal: false
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Send chat message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const agent = await storage.validateAgent(email, password);

      if (!agent) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent fixation
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err: any) => {
          if (err) {
            console.error('Session regeneration error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      req.session.agentId = agent.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.json({ agent: { ...agent, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", (req: AuthenticatedRequest, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.session?.agentId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const agent = await storage.getAgent(req.session.agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    res.json({ agent: { ...agent, password: undefined } });
  });

  // Shorthand route for ticket access (used by ticket detail component)
  app.get("/api/tickets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      let assignedAgent = null;
      if (ticket.assignedAgentId) {
        assignedAgent = await storage.getAgent(ticket.assignedAgentId);
        if (assignedAgent) {
          assignedAgent = { ...assignedAgent, password: undefined };
        }
      }

      res.json({ ...ticket, assignedAgent });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.get("/api/tickets/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessagesByTicket(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/tickets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const ticket = await storage.updateTicket(req.params.id, updates);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Ticket forwarding routes
  app.post("/api/tickets/:id/forward", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = req.params.id;
      const agentId = req.session.agentId!;

      // Get the current agent info
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(401).json({ message: "Agent not found" });
      }

      // Validate the request body
      const forwardData = insertTicketForwardSchema.parse({
        ...req.body,
        ticketId,
        forwardedBy: agentId,
        forwardedByName: agent.name
      });

      // Create the forward record
      const forward = await storage.forwardTicket(forwardData);

      // TODO: Send email notification if external forward
      // TODO: Send internal notification if internal forward

      res.json(forward);
    } catch (error) {
      console.error("Failed to forward ticket:", error);
      res.status(500).json({ message: "Failed to forward ticket" });
    }
  });

  app.get("/api/tickets/:id/forwards", requireAuth, async (req: Request, res: Response) => {
    try {
      const forwards = await storage.getTicketForwards(req.params.id);
      res.json(forwards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket forwards" });
    }
  });

  // Agent ticket routes (authenticated)
  app.get("/api/agent/tickets", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, assignedTo } = req.query;
      let tickets;

      if (status) {
        tickets = await storage.getTicketsByStatus(status as string);
      } else if (assignedTo) {
        tickets = await storage.getTicketsByAgent(assignedTo as string);
      } else {
        tickets = await storage.getAllTickets();
      }

      // Get assigned agents for tickets
      const ticketsWithAgents = await Promise.all(
        tickets.map(async (ticket) => {
          let assignedAgent = null;
          if (ticket.assignedAgentId) {
            assignedAgent = await storage.getAgent(ticket.assignedAgentId);
            if (assignedAgent) {
              assignedAgent = { ...assignedAgent, password: undefined };
            }
          }
          return { ...ticket, assignedAgent };
        })
      );

      res.json(ticketsWithAgents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Agent-specific tickets by assignee
  app.get("/api/agent/my-tickets", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const tickets = await storage.getTicketsByAgent(agentId);

      // Get assigned agents for tickets
      const ticketsWithAgents = await Promise.all(
        tickets.map(async (ticket) => {
          let assignedAgent = null;
          if (ticket.assignedAgentId) {
            assignedAgent = await storage.getAgent(ticket.assignedAgentId);
            if (assignedAgent) {
              assignedAgent = { ...assignedAgent, password: undefined };
            }
          }
          return { ...ticket, assignedAgent };
        })
      );

      res.json(ticketsWithAgents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post("/api/agent/tickets/create", requireAuth, async (req: Request, res: Response) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicket(ticketData);

      // Send notification to available agents
      try {
        const { sendAgentNotification } = await import('./services/email');
        const agents = await storage.getAllAgents();

        for (const agent of agents) {
          if (agent.email && agent.id !== (req.session as any)?.agentId) { // Don't notify the creator
            await sendAgentNotification(agent.email, ticket);
            console.log(`Sent notification to agent: ${agent.email}`);
          }
        }
      } catch (notificationError) {
        console.error('Failed to send agent notifications:', notificationError);
      }

      res.status(201).json(ticket);
    } catch (error) {
      res.status(400).json({ message: "Invalid ticket data" });
    }
  });

  app.patch("/api/agent/tickets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const ticket = await storage.updateTicket(req.params.id, updates);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Message routes
  app.get("/api/agent/tickets/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getMessagesByTicket(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Agent dashboard endpoint
  app.get("/api/agent/dashboard", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;

      // Get all tickets for the dashboard view
      const allTickets = await storage.getAllTickets();

      // Get agent's assigned tickets
      const myTickets = await storage.getTicketsByAgent(agentId);

      // Get available tickets (unassigned)
      const availableTickets = allTickets.filter(ticket => !ticket.assignedAgentId);

      // Calculate stats
      const myOpenTickets = myTickets.filter(t => t.status === 'open').length;
      const myInProgressTickets = myTickets.filter(t => t.status === 'in-progress').length;
      const myResolvedToday = myTickets.filter(t => {
        const today = new Date().toDateString();
        const ticketDate = new Date((t.updatedAt || t.createdAt) as Date).toDateString();
        return t.status === 'resolved' && ticketDate === today;
      }).length;

      // Add agent info to tickets
      const myTicketsWithAgents = await Promise.all(
        myTickets.map(async (ticket) => {
          let assignedAgent = null;
          if (ticket.assignedAgentId) {
            assignedAgent = await storage.getAgent(ticket.assignedAgentId);
            if (assignedAgent) {
              assignedAgent = { ...assignedAgent, password: undefined };
            }
          }
          return { ...ticket, assignedAgent };
        })
      );

      const availableTicketsWithAgents = await Promise.all(
        availableTickets.map(async (ticket) => {
          let assignedAgent = null;
          if (ticket.assignedAgentId) {
            assignedAgent = await storage.getAgent(ticket.assignedAgentId);
            if (assignedAgent) {
              assignedAgent = { ...assignedAgent, password: undefined };
            }
          }
          return { ...ticket, assignedAgent };
        })
      );

      res.json({
        myTickets: myTicketsWithAgents,
        availableTickets: availableTicketsWithAgents,
        stats: {
          myOpenTickets,
          myInProgressTickets,
          myResolvedToday,
          availableTickets: availableTickets.length
        }
      });
    } catch (error) {
      console.error("Error fetching agent dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.post("/api/agent/tickets/:id/messages", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agent = await storage.getAgent(req.session.agentId!);
      if (!agent) {
        return res.status(401).json({ message: "Agent not found" });
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        ticketId: req.params.id,
        senderId: agent.id,
        senderName: agent.name,
        isFromAgent: true,
      });

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Ticket reply endpoint (combines message creation with optional status update)
  // Enhanced ticket reply endpoint with HTML support, CC/BCC, and signatures
  app.post("/api/tickets/:id/reply", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agent = await storage.getAgent(req.session.agentId!);
      if (!agent) {
        return res.status(401).json({ message: "Agent not found" });
      }

      const {
        content,
        message,
        htmlContent,
        isHtmlFormat = false,
        status,
        sendEmail = true,
        emailTo,
        emailCc,
        emailBcc,
        useSignature = true
      } = req.body;

      const messageText = content || message;

      if (!messageText) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Get the ticket first
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Prepare final HTML content with signature if requested
      let finalHtmlContent = htmlContent || messageText.replace(/\n/g, '<br>');
      if (useSignature && agent.signature && sendEmail) {
        finalHtmlContent += '<br><br>' + agent.signature;
      }

      // Create the reply message with enhanced email data
      const messageData = {
        ticketId: req.params.id,
        senderId: agent.id,
        senderName: agent.name,
        content: messageText,
        htmlContent: isHtmlFormat ? finalHtmlContent : undefined,
        emailTo: emailTo || ticket.customerContact,
        emailCc: emailCc || undefined,
        emailBcc: emailBcc || undefined,
        isHtmlFormat,
        sender: "agent",
        isInternal: false,
        attachments: []
      };

      const createdMessage = await storage.createMessage(messageData);

      // Update ticket status if provided
      if (status) {
        await storage.updateTicket(req.params.id, { status });
      }

      // Send email notification if enabled and ticket is from email channel
      if (sendEmail && ticket.channel === 'email') {
        try {
          // Use SendGrid for enhanced email sending
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);

          const emailData = {
            to: emailTo || ticket.customerContact,
            cc: emailCc || undefined,
            bcc: emailBcc || undefined,
            from: agent.email, // Use agent's email as sender
            subject: `Re: ${ticket.subject}`,
            text: messageText,
            html: isHtmlFormat ? finalHtmlContent : messageText.replace(/\n/g, '<br>')
          };

          // Remove undefined fields
          Object.keys(emailData).forEach((key) => {
            if ((emailData as any)[key] === undefined) {
              delete (emailData as any)[key];
            }
          });

          await sgMail.send(emailData);
          console.log(`Enhanced email sent to ${emailTo || ticket.customerContact}`);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          // Continue execution - don't fail the reply if email fails
        }
      }

      res.status(201).json(createdMessage);
    } catch (error) {
      console.error("Error creating ticket reply:", error);
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  // Agent signature endpoints
  app.get("/api/agents/signature", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agent = await storage.getAgent(req.session.agentId!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({ signature: agent.signature || "", signatureImage: agent.signatureImage || "" });
    } catch (error) {
      console.error("Error fetching agent signature:", error);
      res.status(500).json({ message: "Failed to fetch signature" });
    }
  });

  app.put("/api/agents/signature", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { signature, signatureImage } = req.body;
      const agent = await storage.updateAgent(req.session.agentId!, {
        signature,
        signatureImage
      });
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({ signature: agent.signature, signatureImage: agent.signatureImage });
    } catch (error) {
      console.error("Error updating agent signature:", error);
      res.status(500).json({ message: "Failed to update signature" });
    }
  });

  app.put("/api/agents/:agentId/signature", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { signature, signatureImage } = req.body;
      const { agentId } = req.params;

      const agent = await storage.updateAgent(agentId, {
        signature,
        signatureImage
      });
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({ signature: agent.signature, signatureImage: agent.signatureImage });
    } catch (error) {
      console.error("Error updating agent signature:", error);
      res.status(500).json({ message: "Failed to update signature" });
    }
  });

  // Object storage endpoints for attachments
  app.post("/api/objects/upload", requireAuth, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Local storage upload handler
  app.put("/api/storage/upload/local", requireAuth, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      await objectStorageService.handleLocalUpload(req, res);
    } catch (error) {
      console.error("Local upload error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
    }
  });

  // Create attachment record after file is uploaded to object storage
  app.put("/api/attachments", requireAuth, async (req: Request, res: Response) => {
    try {
      const { attachmentURL, ticketId, messageId, filename, mimeType, size } = req.body;

      if (!attachmentURL || !filename) {
        return res.status(400).json({ error: "attachmentURL and filename are required" });
      }

      // Validate MIME type and extension
      const ext = path.extname(filename).toLowerCase();
      if (!allowedExtensions.includes(ext) || (mimeType && !allowedMimeTypes.includes(mimeType))) {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(attachmentURL);

      const attachment = await storage.createAttachment({
        ticketId: ticketId || null,
        messageId: messageId || null,
        filename: objectPath,
        originalName: filename,
        mimeType: mimeType || 'application/octet-stream',
        size: size || 0,
        url: objectPath,
      });

      res.json({
        attachment,
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve objects from object storage
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get attachments for a ticket
  app.get("/api/tickets/:ticketId/attachments", requireAuth, async (req: Request, res: Response) => {
    try {
      const attachments = await storage.getAttachmentsByTicket(req.params.ticketId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  // Legacy file upload (fallback for old functionality)
  app.post("/api/upload", requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Validate MIME type and extension against allowlist
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      // Reject files with suspicious names
      const original = req.file.originalname.toLowerCase();
      if (original.includes('..') || original.includes('/') || original.includes('\\')) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      const attachment = await storage.createAttachment({
        ticketId: req.body.ticketId || null,
        messageId: req.body.messageId || null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
      });

      res.status(201).json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Serve uploaded files (legacy support)
  app.use('/uploads', express.static('uploads'));

  // Agent routes
  app.get("/api/agents", requireAuth, async (req: Request, res: Response) => {
    try {
      const agents = await storage.getAllAgents();
      const agentsWithoutPasswords = agents.map(agent => ({ ...agent, password: undefined }));
      res.json(agentsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Template routes
  app.get("/api/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const template = await storage.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Escalate ticket (change priority to high and status to in-progress)
  app.post("/api/agent/tickets/:id/escalate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = req.params.id;

      const ticket = await storage.updateTicket(ticketId, {
        priority: 'high',
        status: 'in-progress'
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json({ message: "Ticket escalated successfully", ticket });
    } catch (error) {
      console.error("Error escalating ticket:", error);
      res.status(500).json({ message: "Failed to escalate ticket" });
    }
  });

  // Get available agents for reassignment
  app.get("/api/agent/agents", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agents = await storage.getAllAgents();
      // Remove password from response
      const safeAgents = agents.map((agent: any) => ({ ...agent, password: undefined }));
      res.json(safeAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Forward ticket endpoint
  app.post("/api/tickets/:id/forward", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticketId = req.params.id;
      const { forwardTo, ccEmails, message, assignToAgent } = req.body;

      if (!forwardTo) {
        return res.status(400).json({ message: "Forward to email is required" });
      }

      // Get the ticket to forward
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Get ticket messages
      const messages = await storage.getMessagesByTicket(ticketId);

      // Create forward message
      const forwardMessage = await storage.createMessage({
        ticketId,
        senderId: (req.session as any)?.agentId,
        content: message || `Ticket forwarded to ${forwardTo}${ccEmails?.length ? ` (CC: ${ccEmails.join(', ')})` : ''}`,
        senderName: 'System',
        isInternal: true
      });

      // Update ticket assignment if specified
      if (assignToAgent) {
        await storage.updateTicket(ticketId, { assignedAgentId: assignToAgent });
      }

      res.json({
        message: "Ticket forwarded successfully",
        forwardMessage,
        ticket: assignToAgent ? await storage.getTicket(ticketId) : ticket
      });
    } catch (error) {
      console.error("Error forwarding ticket:", error);
      res.status(500).json({ message: "Failed to forward ticket" });
    }
  });

  // Agent profile management routes
  app.patch("/api/agents/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const { name, email, signature } = req.body;

      // Validate input
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const updatedAgent = await storage.updateAgent(agentId, {
        name,
        email,
        signature
      });

      if (!updatedAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json({ message: "Profile updated successfully", agent: { ...updatedAgent, password: undefined } });
    } catch (error) {
      console.error("Error updating agent profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/agents/password", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Get current agent
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, agent.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updatedAgent = await storage.updateAgent(agentId, {
        password: hashedNewPassword
      });

      if (!updatedAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating agent password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Agent signature management routes  
  app.put("/api/agents/signature", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const { signature, signatureImage } = req.body;

      const updatedAgent = await storage.updateAgent(agentId, {
        signature,
        signatureImage
      });

      if (!updatedAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json({ message: "Signature updated successfully" });
    } catch (error) {
      console.error("Error updating signature:", error);
      res.status(500).json({ message: "Failed to update signature" });
    }
  });

  // Email provider configuration and testing
  app.get("/api/email/provider-info", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getEmailProviderInfo } = await import('./email-service');
      const providerInfo = getEmailProviderInfo();
      res.json(providerInfo);
    } catch (error) {
      console.error("Error getting email provider info:", error);
      res.status(500).json({ message: "Failed to get email provider info" });
    }
  });

  app.post("/api/email/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const { to, subject = "Test Email from SupportHub" } = req.body;

      if (!to) {
        return res.status(400).json({ message: "Recipient email address required" });
      }

      const { sendEmail } = await import('./email-service');
      const verifiedSender = process.env.VERIFIED_SENDER_EMAIL || 'noreply@supporthub.com';

      const success = await sendEmail({
        to,
        from: verifiedSender,
        subject,
        text: 'This is a test email from your SupportHub application to verify email configuration.',
        html: '<h2>Test Email</h2><p>This is a test email from your SupportHub application to verify email configuration.</p><p>If you received this, your email provider is working correctly!</p>'
      });

      if (success) {
        res.json({ message: "Test email sent successfully", success: true });
      } else {
        res.status(500).json({ message: "Failed to send test email", success: false });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email", success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Email configuration save route
  app.post("/api/email/configure", requireAuth, async (req: Request, res: Response) => {
    try {
      const { provider, configuration } = req.body;

      if (!provider || !configuration) {
        return res.status(400).json({ message: "Provider and configuration are required" });
      }

      // Note: This is a UI-only configuration for development
      // In production, these would be set as environment variables
      console.log(`Email configuration updated: ${provider}`, configuration);

      res.json({
        message: `${provider} configuration saved successfully. Note: For production, set these as environment variables.`,
        success: true
      });
    } catch (error) {
      console.error("Error saving email configuration:", error);
      res.status(500).json({ message: "Failed to save email configuration", success: false });
    }
  });

  app.put("/api/agents/:id/signature", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { signature, signatureImage } = req.body;

      const updatedAgent = await storage.updateAgent(req.params.id, {
        signature,
        signatureImage
      });

      if (!updatedAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json({ message: "Signature updated successfully" });
    } catch (error) {
      console.error("Error updating agent signature:", error);
      res.status(500).json({ message: "Failed to update signature" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const allTickets = await storage.getAllTickets();
      const openTickets = allTickets.filter(t => t.status === 'open').length;
      const inProgressTickets = allTickets.filter(t => t.status === 'in-progress').length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const resolvedToday = allTickets.filter(t =>
        t.status === 'resolved' &&
        new Date(t.updatedAt!).getTime() >= today.getTime()
      ).length;

      // Calculate average response time (mock for now)
      const avgResponse = "2.4h";

      res.json({
        openTickets,
        inProgressTickets,
        resolvedToday,
        avgResponse
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Agent dashboard data  
  app.get("/api/agent/dashboard", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const allTickets = await storage.getAllTickets();

      // Get tickets assigned to this agent
      const myTickets = allTickets.filter(ticket => ticket.assignedAgentId === agentId);

      // Get available tickets (unassigned)
      const availableTickets = allTickets.filter(ticket => !ticket.assignedAgentId);

      // Calculate stats
      const myOpenTickets = myTickets.filter(t => t.status === 'open').length;
      const myInProgressTickets = myTickets.filter(t => t.status === 'in-progress').length;

      // Resolved today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const myResolvedToday = myTickets.filter(t =>
        t.status === 'resolved' &&
        new Date(t.updatedAt || t.createdAt || 0) >= today
      ).length;

      const dashboardData = {
        myTickets: myTickets.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ),
        availableTickets: availableTickets.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ),
        stats: {
          myOpenTickets,
          myInProgressTickets,
          myResolvedToday,
          availableTickets: availableTickets.length
        }
      };

      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching agent dashboard:", error);
      res.status(500).json({ message: "Failed to fetch agent dashboard data" });
    }
  });

  // Agent performance routes
  app.get("/api/agent/performance", requireAuth, async (req: Request, res: Response) => {
    try {
      const agents = await storage.getAllAgents();
      const allTickets = await storage.getAllTickets();

      const performance = agents.map(agent => {
        const agentTickets = allTickets.filter(t => t.assignedAgentId === agent.id);
        const resolvedTickets = agentTickets.filter(t => t.status === 'resolved');

        return {
          agentId: agent.id,
          agentName: agent.name,
          ticketsHandled: agentTickets.length,
          avgResolutionTime: "2.3h", // Mock calculation
          satisfactionScore: Math.floor(Math.random() * 20) + 80 // 80-100%
        };
      });

      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get("/api/agent/my-performance", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const allTickets = await storage.getAllTickets();
      const agentTickets = allTickets.filter(t => t.assignedAgentId === agentId);
      const resolvedTickets = agentTickets.filter(t => t.status === 'resolved');

      const performance = {
        agentId: agent.id,
        agentName: agent.name,
        ticketsHandled: agentTickets.length,
        avgResolutionTime: "2.1h", // Mock calculation
        satisfactionScore: Math.floor(Math.random() * 15) + 85 // 85-100%
      };

      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  // Agent chat session management
  app.get("/api/agent/chat-sessions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await storage.getActiveChatSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/agent/chat-sessions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Get messages for this session
      const messages = await storage.getMessagesByChatSession(req.params.id);

      res.json({
        ...session,
        messages
      });
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.post("/api/agent/chat-sessions/:id/messages", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(401).json({ message: "Agent not found" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const message = await storage.createMessage({
        chatSessionId: req.params.id,
        content,
        sender: 'agent',
        senderName: agent.name,
        isInternal: false
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/agent/chat-sessions/:id/assign", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agentId = req.session.agentId!;
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(401).json({ message: "Agent not found" });
      }

      const session = await storage.updateChatSession(req.params.id, {
        status: 'active',
        assignedAgentId: agentId,
        assignedAgentName: agent.name
      });

      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error assigning chat session:", error);
      res.status(500).json({ message: "Failed to assign chat session" });
    }
  });

  app.post("/api/agent/chat-sessions/:id/end", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.endChatSession(req.params.id);
      res.json({ message: "Chat session ended successfully" });
    } catch (error) {
      console.error("Error ending chat session:", error);
      res.status(500).json({ message: "Failed to end chat session" });
    }
  });

  // Channel management routes are now in admin-routes.ts

  // All admin channel routes moved to admin-routes.ts



  app.get("/api/channels/status", requireAuth, (req: Request, res: Response) => {
    res.json({
      email: "connected",
      whatsapp: "connected",
      twitter: "error",
      facebook: "disconnected"
    });
  });

  // Public whitelabel configuration endpoint
  app.get("/api/public/whitelabel", async (req: Request, res: Response) => {
    try {
      const config = await storage.getWhitelabelConfig();
      if (!config || !config.isActive) {
        return res.json(null);
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching whitelabel config:", error);
      res.status(500).json({ message: "Failed to fetch whitelabel configuration" });
    }
  });

  // Public chat settings endpoint (for home page widget visibility)
  app.get("/api/public/settings/chat", async (req: Request, res: Response) => {
    try {
      const chatSetting = await storage.getApplicationSetting('enable_chat');
      const isEnabled = chatSetting?.value === 'true';
      res.json({ enabled: isEnabled });
    } catch (error) {
      console.error("Error fetching chat settings:", error);
      // Default to enabled if there's an error or no setting exists
      res.json({ enabled: true });
    }
  });

  // Admin routes with file upload support
  const { createAdminRoutes } = await import('./admin-routes');
  const adminRouter = createAdminRoutes(storage);
  app.use("/api/admin", upload.fields([
    { name: 'csv_file', maxCount: 1 },
    { name: 'attachments_zip', maxCount: 1 }
  ]), adminRouter);

  const httpServer = createServer(app);
  return httpServer;
}
