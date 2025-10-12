import { Request } from 'express';

export class SMSService {
  private accountSid: string | null = null;
  private authToken: string | null = null;
  private fromPhoneNumber: string | null = null;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER || null;
  }

  // Initialize from environment variables or configuration
  initialize(config?: { accountSid: string; authToken: string; fromPhoneNumber: string }) {
    if (config) {
      this.accountSid = config.accountSid;
      this.authToken = config.authToken;
      this.fromPhoneNumber = config.fromPhoneNumber;
    }
  }

  // Check if SMS service is properly configured
  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromPhoneNumber);
  }

  // Send SMS message
  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Twilio SMS credentials not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: this.fromPhoneNumber!,
            To: to,
            Body: message
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio SMS API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('SMS message sent:', {
        sid: result.sid,
        to: result.to,
        status: result.status
      });
    } catch (error) {
      console.error('Failed to send SMS message:', error);
      throw error;
    }
  }

  // Process incoming SMS webhook (for future implementation)
  async processIncomingMessage(req: Request): Promise<any> {
    const { From, Body, MessageSid } = req.body;
    
    if (!Body) return null; // Only handle text messages

    // Extract customer info
    const customerName = `SMS User ${From}`;
    
    // Create ticket data
    const ticketData = {
      subject: `SMS message from ${customerName}`,
      description: Body,
      channel: 'sms',
      customerName,
      customerContact: From,
      smsMessageId: MessageSid,
      priority: this.calculatePriority(Body),
      urgencyScore: this.calculateUrgencyScore(Body)
    };

    // Send auto-response if configured
    await this.sendAutoResponse(From, Body);

    return ticketData;
  }

  // Calculate priority based on message content
  private calculatePriority(message: string): string {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap', 'immediately'];
    const lowPriorityKeywords = ['when convenient', 'no rush', 'whenever'];
    
    const lowerMessage = message.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    if (lowPriorityKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'low';
    }
    
    return 'medium';
  }

  // Calculate urgency score (1-10)
  private calculateUrgencyScore(message: string): number {
    const highUrgencyKeywords = ['urgent', 'emergency', 'critical', 'broken', 'down', 'not working'];
    const mediumUrgencyKeywords = ['issue', 'problem', 'help', 'support'];
    
    const lowerMessage = message.toLowerCase();
    
    if (highUrgencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 8;
    }
    
    if (mediumUrgencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 6;
    }
    
    return 4;
  }

  // Send automatic response
  private async sendAutoResponse(to: string, originalMessage: string): Promise<void> {
    const autoResponse = `Thank you for contacting us via SMS. We've received your message and will respond shortly. For urgent matters, please call our support line.`;
    
    try {
      await this.sendMessage(to, autoResponse);
    } catch (error) {
      console.error('Failed to send SMS auto-response:', error);
    }
  }

  // Verify webhook signature (for security)
  verifyWebhookSignature(signature: string, url: string, params: any): boolean {
    if (!this.authToken) return false;
    
    // This would implement Twilio's webhook signature verification
    // For now, we'll return true but in production this should be properly implemented
    return true;
  }
}

// Export singleton instance
export const smsService = new SMSService();