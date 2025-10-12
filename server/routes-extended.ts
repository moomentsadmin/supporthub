import type { Express, Request, Response } from "express";
import { WebSocketServer } from "ws";
import { Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./services/whatsapp";
import { automationService } from "./services/automation";
import { 
  insertChatSessionSchema,
  insertAutomationRuleSchema,
  type WhatsAppWebhook,
  type LiveChatMessage,
  type AdvancedAnalytics 
} from "@shared/schema";

interface AuthenticatedRequest extends Request {
  session: {
    agentId?: string;
    destroy: (callback: (err: any) => void) => void;
  };
}

// Authentication middleware
const requireAuth = (req: AuthenticatedRequest, res: Response, next: () => void) => {
  if (!req.session?.agentId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export function registerExtendedRoutes(app: Express, server: Server) {
  // WhatsApp Business API integration
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && challenge) {
      const result = whatsappService.verifyWebhook(mode as string, token as string, challenge as string);
      if (result) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send("Forbidden");
      }
    } else {
      res.status(400).send("Bad Request");
    }
  });

  app.post("/api/whatsapp/webhook", async (req: Request, res: Response) => {
    try {
      const webhook: WhatsAppWebhook = req.body;
      await whatsappService.handleWebhook(webhook);
      res.status(200).send("OK");
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/api/whatsapp/send", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { to, message } = req.body;
      await whatsappService.sendMessage(to, message);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to send WhatsApp message" });
    }
  });

  // Live chat session management
  app.post("/api/chat/sessions", async (req: Request, res: Response) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get("/api/chat/sessions/active", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await storage.getActiveChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.patch("/api/chat/sessions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      const session = await storage.updateChatSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  // Advanced analytics
  app.get("/api/analytics/advanced", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tickets = await storage.getAllTickets();
      const agents = await storage.getAllAgents();
      
      const analytics: AdvancedAnalytics = {
        totalTickets: tickets.length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
        avgResponseTime: 145, // Mock data - would calculate from real data
        avgResolutionTime: 1200, // Mock data 
        customerSatisfaction: 4.2,
        agentPerformance: agents.map(agent => ({
          agentId: agent.id,
          name: agent.name,
          ticketsHandled: tickets.filter(t => t.assignedAgentId === agent.id).length,
          avgResponseTime: 120 + Math.random() * 100,
          resolutionRate: 0.7 + Math.random() * 0.3
        })),
        channelMetrics: [
          { channel: 'email', ticketCount: tickets.filter(t => t.channel === 'email').length, satisfaction: 4.1 },
          { channel: 'whatsapp', ticketCount: tickets.filter(t => t.channel === 'whatsapp').length, satisfaction: 4.3 },
          { channel: 'twitter', ticketCount: tickets.filter(t => t.channel === 'twitter').length, satisfaction: 3.9 },
          { channel: 'facebook', ticketCount: tickets.filter(t => t.channel === 'facebook').length, satisfaction: 4.0 },
          { channel: 'livechat', ticketCount: tickets.filter(t => t.channel === 'livechat').length, satisfaction: 4.4 }
        ],
        sentimentAnalysis: {
          positive: 65,
          negative: 15,
          neutral: 20
        }
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/trends", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Mock trend data - in real app would calculate from database
      const trends = {
        volumeTrends: [
          { date: '2025-08-01', tickets: 45 },
          { date: '2025-08-02', tickets: 52 },
          { date: '2025-08-03', tickets: 38 },
          { date: '2025-08-04', tickets: 61 },
          { date: '2025-08-05', tickets: 49 },
          { date: '2025-08-06', tickets: 55 },
          { date: '2025-08-07', tickets: 43 },
          { date: '2025-08-08', tickets: 58 }
        ],
        responseTimeTrends: [
          { date: '2025-08-01', avgResponseTime: 155 },
          { date: '2025-08-02', avgResponseTime: 142 },
          { date: '2025-08-03', avgResponseTime: 138 },
          { date: '2025-08-04', avgResponseTime: 151 },
          { date: '2025-08-05', avgResponseTime: 134 },
          { date: '2025-08-06', avgResponseTime: 128 },
          { date: '2025-08-07', avgResponseTime: 145 },
          { date: '2025-08-08', avgResponseTime: 139 }
        ],
        sentimentTrends: [
          { date: '2025-08-01', positive: 62, negative: 18, neutral: 20 },
          { date: '2025-08-02', positive: 65, negative: 15, neutral: 20 },
          { date: '2025-08-03', positive: 68, negative: 12, neutral: 20 },
          { date: '2025-08-04', positive: 64, negative: 16, neutral: 20 },
          { date: '2025-08-05', positive: 66, negative: 14, neutral: 20 },
          { date: '2025-08-06', positive: 70, negative: 10, neutral: 20 },
          { date: '2025-08-07', positive: 67, negative: 13, neutral: 20 },
          { date: '2025-08-08', positive: 65, negative: 15, neutral: 20 }
        ]
      };

      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  // Automation rules management
  app.get("/api/automation/rules", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rules = await storage.getAllAutomationRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch automation rules" });
    }
  });

  app.post("/api/automation/rules", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleData = insertAutomationRuleSchema.parse(req.body);
      const rule = await storage.createAutomationRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid rule data" });
    }
  });

  // AI-powered ticket processing
  app.post("/api/tickets/:id/process", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const agents = await storage.getAllAgents();
      const result = await automationService.processTicket(ticket, agents);

      // Update ticket if auto-assigned
      if (result.assignedAgentId) {
        await storage.updateTicket(req.params.id, { 
          assignedAgentId: result.assignedAgentId,
          autoAssigned: true 
        });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to process ticket" });
    }
  });

  // Enhanced channel status
  app.get("/api/channels/status", requireAuth, (req: Request, res: Response) => {
    res.json({
      email: "connected",
      whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? "connected" : "disconnected", 
      twitter: "connected",
      facebook: "reconnect_needed",
      livechat: "connected",
      sms: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER ? "connected" : "disconnected"
    });
  });

  // Notification count endpoint
  app.get("/api/notifications/count", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get count of unread notifications for the agent
      // This would be the count of new tickets assigned to the agent or other notifications
      const agentId = req.session.agentId;
      const count = await storage.getUnreadNotificationCount(agentId);
      res.json(count);
    } catch (error) {
      console.error('Failed to get notification count:', error);
      res.json(0); // Return 0 on error to prevent UI issues
    }
  });

  // WebSocket for live chat
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/chat'
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    console.log(`Chat WebSocket connected for session: ${sessionId}`);

    ws.on('message', async (data) => {
      try {
        const message: LiveChatMessage = JSON.parse(data.toString());
        
        // Broadcast to other connections in the same session
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(message));
          }
        });

        // Store message in database (if needed)
        // In real app, would create message record
        
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Chat WebSocket disconnected for session: ${sessionId}`);
    });
  });

  console.log('Extended routes and WebSocket server initialized');
}