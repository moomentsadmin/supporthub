import { Router } from 'express';
import type { IStorage } from './storage';

export function createAgentRoutes(storage: IStorage) {
  const router = Router();

  // Agent authentication middleware
  const requireAgentAuth = (req: any, res: any, next: any) => {
    if (!(req.session as any)?.user) {
      return res.status(401).json({ message: 'Agent authentication required' });
    }
    next();
  };

  // Agent dashboard data
  router.get('/dashboard', requireAgentAuth, async (req, res) => {
    try {
      const agentId = (req.session as any).user.id;
      const allTickets = await storage.getAllTickets();
      const agents = await storage.getAllAgents();

      // Get tickets assigned to this agent
      const myTickets = allTickets.filter(ticket => ticket.assignedAgentId === agentId);
      
      // Get available tickets (unassigned or auto-assigned but not taken)
      const availableTickets = allTickets.filter(ticket => 
        !ticket.assignedAgentId || (ticket.autoAssigned && ticket.assignedAgentId !== agentId)
      );

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
      console.error('Agent dashboard error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
  });

  // Assign ticket to agent
  router.post('/tickets/:id/assign', requireAgentAuth, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const agentId = (req.session as any).user.id;

      const tickets = await storage.getAllTickets();
      const existingTicket = tickets.find(t => t.id === ticketId);
      
      if (!existingTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      const ticket = await storage.updateTicket(ticketId, {
        assignedAgentId: agentId,
        status: 'in-progress'
      });

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Assign ticket error:', error);
      res.status(500).json({ message: 'Failed to assign ticket' });
    }
  });

  // Chat session routes
  router.get('/chat-sessions', requireAgentAuth, async (req, res) => {
    try {
      const chatSessions = await storage.getAllChatSessions();
      res.json(chatSessions);
    } catch (error) {
      console.error('Get chat sessions error:', error);
      res.status(500).json({ message: 'Failed to fetch chat sessions' });
    }
  });

  router.get('/chat-sessions/:id', requireAgentAuth, async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: 'Chat session not found' });
      }
      res.json(session);
    } catch (error) {
      console.error('Get chat session error:', error);
      res.status(500).json({ message: 'Failed to fetch chat session' });
    }
  });

  router.post('/chat-sessions/:id/messages', requireAgentAuth, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const agentId = (req.session as any).user.id;
      const agent = await storage.getAgent(agentId);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      const message = await storage.createChatMessage({
        sessionId,
        content: content.trim(),
        sender: 'agent',
        senderName: agent?.name || 'Agent',
        timestamp: new Date().toISOString()
      });

      res.json(message);
    } catch (error) {
      console.error('Send chat message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  router.post('/chat-sessions/:id/assign', requireAgentAuth, async (req, res) => {
    try {
      const sessionId = req.params.id;
      const agentId = (req.session as any).user.id;
      const agent = await storage.getAgent(agentId);

      const updatedSession = await storage.updateChatSession(sessionId, {
        assignedAgentId: agentId,
        assignedAgentName: agent?.name || 'Agent',
        status: 'active'
      });

      if (!updatedSession) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('Assign chat session error:', error);
      res.status(500).json({ message: 'Failed to assign chat session' });
    }
  });

  router.post('/chat-sessions/:id/end', requireAgentAuth, async (req, res) => {
    try {
      const sessionId = req.params.id;
      
      const updatedSession = await storage.updateChatSession(sessionId, {
        status: 'ended',
        endedAt: new Date()
      });

      if (!updatedSession) {
        return res.status(404).json({ message: 'Chat session not found' });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('End chat session error:', error);
      res.status(500).json({ message: 'Failed to end chat session' });
    }
  });

  return router;
}