import type { AutomationRule, Ticket, Agent } from "@shared/schema";

export class AutomationService {
  private rules: AutomationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.rules = [
      {
        id: 'auto-assign-high-priority',
        name: 'Auto-assign high priority tickets',
        conditions: {
          priority: 'high',
          channel: 'any'
        },
        actions: {
          type: 'assign',
          criteria: 'least_loaded_senior_agent'
        },
        isActive: true,
        priority: 1,
        createdAt: new Date()
      },
      {
        id: 'auto-response-whatsapp',
        name: 'Auto-response for WhatsApp',
        conditions: {
          channel: 'whatsapp',
          isNewTicket: true
        },
        actions: {
          type: 'send_template',
          templateId: 'whatsapp-acknowledgment'
        },
        isActive: true,
        priority: 2,
        createdAt: new Date()
      },
      {
        id: 'escalate-urgent',
        name: 'Escalate urgent tickets',
        conditions: {
          urgencyScore: { gte: 8 },
          timeOpen: { gte: 3600000 } // 1 hour
        },
        actions: {
          type: 'escalate',
          priority: 'high',
          notifyManagement: true
        },
        isActive: true,
        priority: 3,
        createdAt: new Date()
      },
      {
        id: 'ai-sentiment-response',
        name: 'AI response for negative sentiment',
        conditions: {
          sentiment: 'negative',
          channel: ['livechat', 'whatsapp']
        },
        actions: {
          type: 'ai_response',
          tone: 'empathetic',
          maxLength: 200
        },
        isActive: true,
        priority: 4,
        createdAt: new Date()
      }
    ];
  }

  async processTicket(ticket: Ticket, agents: Agent[]): Promise<{
    assignedAgentId?: string;
    autoResponses?: string[];
    escalated?: boolean;
    aiSuggestions?: string[];
  }> {
    const results = {
      assignedAgentId: undefined as string | undefined,
      autoResponses: [] as string[],
      escalated: false,
      aiSuggestions: [] as string[]
    };

    // Sort rules by priority
    const activeRules = this.rules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.conditions, ticket)) {
        await this.executeActions(rule.actions, ticket, agents, results);
      }
    }

    return results;
  }

  private evaluateConditions(conditions: any, ticket: Ticket): boolean {
    // Priority check
    if (conditions.priority && conditions.priority !== ticket.priority) {
      return false;
    }

    // Channel check
    if (conditions.channel) {
      if (conditions.channel === 'any') {
        // Always matches
      } else if (Array.isArray(conditions.channel)) {
        if (!conditions.channel.includes(ticket.channel)) {
          return false;
        }
      } else if (conditions.channel !== ticket.channel) {
        return false;
      }
    }

    // Urgency score check
    if (conditions.urgencyScore) {
      const score = ticket.urgencyScore || 5;
      if (conditions.urgencyScore.gte && score < conditions.urgencyScore.gte) {
        return false;
      }
      if (conditions.urgencyScore.lte && score > conditions.urgencyScore.lte) {
        return false;
      }
    }

    // Sentiment check
    if (conditions.sentiment && conditions.sentiment !== ticket.sentiment) {
      return false;
    }

    // Time-based checks
    if (conditions.timeOpen) {
      const timeOpen = Date.now() - new Date(ticket.createdAt!).getTime();
      if (conditions.timeOpen.gte && timeOpen < conditions.timeOpen.gte) {
        return false;
      }
    }

    // New ticket check
    if (conditions.isNewTicket) {
      const timeSinceCreation = Date.now() - new Date(ticket.createdAt!).getTime();
      if (timeSinceCreation > 300000) { // 5 minutes
        return false;
      }
    }

    return true;
  }

  private async executeActions(actions: any, ticket: Ticket, agents: Agent[], results: any): Promise<void> {
    switch (actions.type) {
      case 'assign':
        if (!ticket.assignedAgentId) {
          const agentId = this.findBestAgent(actions.criteria, agents, ticket);
          if (agentId) {
            results.assignedAgentId = agentId;
          }
        }
        break;

      case 'send_template':
        const template = this.getTemplate(actions.templateId);
        if (template) {
          results.autoResponses.push(template);
        }
        break;

      case 'escalate':
        results.escalated = true;
        if (actions.notifyManagement) {
          // In real app, would send notifications
          console.log('Management notified of escalated ticket:', ticket.id);
        }
        break;

      case 'ai_response':
        const aiResponse = await this.generateAIResponse(ticket, actions);
        if (aiResponse) {
          results.aiSuggestions.push(aiResponse);
        }
        break;
    }
  }

  private findBestAgent(criteria: string, agents: Agent[], ticket: Ticket): string | null {
    const availableAgents = agents.filter(agent => agent.role !== 'admin');
    
    if (availableAgents.length === 0) return null;

    switch (criteria) {
      case 'least_loaded_senior_agent':
        const seniorAgents = availableAgents.filter(agent => 
          agent.role === 'senior_agent' || agent.role === 'lead_agent'
        );
        return seniorAgents.length > 0 
          ? seniorAgents[0].id 
          : availableAgents[0].id;

      case 'round_robin':
        // Simple round-robin (in real app, would track assignment history)
        return availableAgents[Math.floor(Math.random() * availableAgents.length)].id;

      case 'priority_based':
        if (ticket.priority === 'high') {
          const seniorAgents = availableAgents.filter(agent => 
            agent.role === 'senior_agent' || agent.role === 'lead_agent'
          );
          return seniorAgents.length > 0 
            ? seniorAgents[0].id 
            : availableAgents[0].id;
        }
        return availableAgents[0].id;

      default:
        return availableAgents[0].id;
    }
  }

  private getTemplate(templateId: string): string | null {
    const templates = {
      'whatsapp-acknowledgment': 'Thank you for contacting us via WhatsApp! We have received your message and a support agent will respond shortly.',
      'email-acknowledgment': 'Thank you for contacting our support team. We have received your email and will respond within 24 hours.',
      'urgent-escalation': 'Your urgent request has been escalated to our senior support team. You will receive a response within the next hour.',
      'ai-empathetic': 'I understand this situation must be frustrating for you. Let me help you resolve this issue as quickly as possible.'
    };

    return templates[templateId] || null;
  }

  private async generateAIResponse(ticket: Ticket, actions: any): Promise<string | null> {
    // Simplified AI response generation
    // In a real app, this would call an AI service like OpenAI
    
    const { tone, maxLength } = actions;
    const context = {
      subject: ticket.subject,
      description: ticket.description,
      channel: ticket.channel,
      sentiment: ticket.sentiment
    };

    // Mock AI response based on context
    let response = '';
    
    if (tone === 'empathetic' && ticket.sentiment === 'negative') {
      response = `I sincerely apologize for the inconvenience you're experiencing with ${context.subject.toLowerCase()}. I understand how frustrating this must be, and I'm here to help resolve this issue for you as quickly as possible.`;
    } else if (ticket.priority === 'high') {
      response = `Thank you for bringing this urgent matter to our attention. I'm prioritizing your request and will work to resolve this immediately.`;
    } else {
      response = `Thank you for contacting us regarding ${context.subject.toLowerCase()}. I'll be happy to assist you with this matter.`;
    }

    // Respect maxLength if specified
    if (maxLength && response.length > maxLength) {
      response = response.substring(0, maxLength - 3) + '...';
    }

    return response;
  }

  async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    // Simplified sentiment analysis
    // In a real app, this would use a proper NLP service
    
    const positiveWords = ['thank', 'great', 'excellent', 'good', 'happy', 'satisfied', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'frustrated', 'angry', 'disappointed', 'broken', 'problem'];
    
    const lowercaseText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowercaseText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowercaseText.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  addRule(rule: Omit<AutomationRule, 'id' | 'createdAt'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date()
    };
    
    this.rules.push(newRule);
    return newRule;
  }

  updateRule(id: string, updates: Partial<AutomationRule>): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      return true;
    }
    return false;
  }

  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): AutomationRule[] {
    return [...this.rules];
  }
}

export const automationService = new AutomationService();