import type { WhatsAppWebhook } from "@shared/schema";

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private verifyToken: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token';
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return challenge;
    }
    return null;
  }

  async handleWebhook(webhook: WhatsAppWebhook) {
    try {
      for (const entry of webhook.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const { value } = change;
            
            if (value.messages) {
              for (const message of value.messages) {
                await this.processIncomingMessage(message, value);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  private async processIncomingMessage(message: any, value: any) {
    const { from, text, id: messageId, timestamp } = message;
    
    if (!text?.body) return; // Only handle text messages for now

    // Extract customer info
    const contact = value.contacts?.[0];
    const customerName = contact?.profile?.name || `WhatsApp User ${from}`;
    
    // Create ticket data
    const ticketData = {
      subject: `WhatsApp message from ${customerName}`,
      description: text.body,
      channel: 'whatsapp',
      customerName,
      customerContact: from,
      whatsappMessageId: messageId,
      priority: this.calculatePriority(text.body),
      urgencyScore: this.calculateUrgencyScore(text.body)
    };

    // Auto-assign based on rules
    const assignedAgentId = await this.autoAssignTicket(ticketData);
    if (assignedAgentId) {
      ticketData.assignedAgentId = assignedAgentId;
      ticketData.autoAssigned = true;
    }

    // Create ticket via storage (this would be injected in real app)
    // const ticket = await storage.createTicket(ticketData);

    // Send auto-response if configured
    await this.sendAutoResponse(from, text.body);

    return ticketData;
  }

  private calculatePriority(message: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap', 'immediately'];
    const highKeywords = ['problem', 'issue', 'bug', 'error', 'broken'];
    
    const lowercaseMessage = message.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      return 'high';
    }
    
    if (highKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private calculateUrgencyScore(message: string): number {
    // AI-powered urgency scoring (simplified)
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap'];
    const problemKeywords = ['problem', 'issue', 'bug', 'error', 'broken', 'not working'];
    const politeKeywords = ['please', 'thank you', 'help', 'could you'];
    
    let score = 5; // Base score
    
    urgentKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) score += 2;
    });
    
    problemKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) score += 1;
    });
    
    politeKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) score -= 0.5;
    });
    
    return Math.min(Math.max(score, 1), 10);
  }

  private async autoAssignTicket(ticketData: any): Promise<string | null> {
    // Simple round-robin assignment (in real app, this would use more sophisticated logic)
    // This would connect to your agent management system
    return null;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp credentials not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('WhatsApp message sent:', result);
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  private async sendAutoResponse(to: string, originalMessage: string): Promise<void> {
    // AI-powered auto-response (simplified)
    const autoResponses = {
      greeting: "Thank you for contacting us! We've received your message and will respond shortly.",
      problem: "We understand you're experiencing an issue. Our support team will investigate and get back to you soon.",
      urgent: "We've marked your request as urgent and prioritized it. You'll hear from us within the next hour.",
      general: "Thank you for reaching out. A member of our support team will assist you shortly."
    };

    let responseType = 'general';
    const message = originalMessage.toLowerCase();

    if (message.includes('hello') || message.includes('hi')) {
      responseType = 'greeting';
    } else if (message.includes('urgent') || message.includes('emergency')) {
      responseType = 'urgent';
    } else if (message.includes('problem') || message.includes('issue')) {
      responseType = 'problem';
    }

    await this.sendMessage(to, autoResponses[responseType]);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) return;

    try {
      await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
          })
        }
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }
}

export const whatsappService = new WhatsAppService();