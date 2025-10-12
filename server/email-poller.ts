import Imap from 'imap';
import { simpleParser } from 'mailparser';
import type { IStorage } from './storage';
import type { ChannelConfig, InsertTicket, InsertMessage } from '@shared/schema';

interface EmailPollerConfig {
  interval: number; // in minutes
  enabled: boolean;
  maxEmails: number;
}

export class EmailPoller {
  private storage: IStorage;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isPolling: Map<string, boolean> = new Map();
  private processedEmails: Set<string> = new Set(); // Track processed email message IDs

  constructor(storage: IStorage) {
    this.storage = storage;
    // Load previously processed emails on startup
    this.loadProcessedEmails();
  }

  private async loadProcessedEmails() {
    try {
      const tickets = await this.storage.getAllTickets();
      tickets.forEach(ticket => {
        if (ticket.emailMessageId) {
          this.processedEmails.add(ticket.emailMessageId);
        }
      });
      console.log(`Loaded ${this.processedEmails.size} previously processed emails`);
    } catch (error) {
      console.error('Error loading processed emails:', error);
    }
  }

  async startPolling(channelId: string, config: EmailPollerConfig) {
    if (this.pollingIntervals.has(channelId)) {
      this.stopPolling(channelId);
    }

    if (!config.enabled) {
      return;
    }

    console.log(`Starting email polling for channel ${channelId} every ${config.interval} minutes`);

    const interval = setInterval(async () => {
      try {
        await this.pollEmails(channelId);
      } catch (error) {
        console.error(`Error polling emails for channel ${channelId}:`, error);
      }
    }, config.interval * 60 * 1000);

    this.pollingIntervals.set(channelId, interval);

    // Poll immediately on start
    setTimeout(() => this.pollEmails(channelId), 5000);
  }

  stopPolling(channelId: string) {
    const interval = this.pollingIntervals.get(channelId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(channelId);
      this.isPolling.delete(channelId);
      console.log(`Stopped email polling for channel ${channelId}`);
    }
  }

  async pollEmails(channelId: string): Promise<void> {
    if (this.isPolling.get(channelId)) {
      console.log(`Already polling emails for channel ${channelId}, skipping...`);
      return;
    }

    this.isPolling.set(channelId, true);

    try {
      const channel = await this.storage.getChannelConfig(channelId);
      if (!channel || !channel.isActive || !channel.inboundSettings) {
        return;
      }

      console.log(`Polling emails for channel: ${channel.name}`);

      const emails = await this.fetchEmails(channel);
      console.log(`Found ${emails.length} new emails for channel ${channel.name}`);

      for (const email of emails) {
        await this.processEmail(email, channel);
      }

      // Update last sync time
      await this.storage.updateChannelConfig(channelId, {
        lastSync: new Date(),
        status: 'connected'
      });

    } catch (error) {
      console.error(`Error in pollEmails for channel ${channelId}:`, error);
      // Update channel status to error
      await this.storage.updateChannelConfig(channelId, {
        status: 'error'
      });
    } finally {
      this.isPolling.set(channelId, false);
    }
  }

  private async fetchEmails(channel: ChannelConfig): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const { inboundSettings } = channel;
      if (!inboundSettings) {
        return resolve([]);
      }

      const imap = new (Imap as any)({
        user: inboundSettings.username,
        password: inboundSettings.password,
        host: inboundSettings.server,
        port: inboundSettings.port || 993,
        tls: inboundSettings.tls || true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 60000,
        authTimeout: 5000
      });

      const emails: any[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err: any, box: any) => {
          if (err) {
            return reject(err);
          }

          // Get unseen emails from the last hour
          const since = new Date();
          since.setHours(since.getHours() - 1);

          imap.search(['UNSEEN', ['SINCE', since]], (err: any, results: any) => {
            if (err) {
              return reject(err);
            }

            if (!results.length) {
              imap.end();
              return resolve([]);
            }

            // Limit the number of emails to process
            const emailsToFetch = results.slice(0, 50);
            
            const fetch = imap.fetch(emailsToFetch, { bodies: '' });
            let processed = 0;

            fetch.on('message', (msg: any, seqno: any) => {
              msg.on('body', (stream: any, info: any) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) {
                    console.error('Error parsing email:', err);
                  } else {
                    emails.push({
                      seqno,
                      from: (parsed.from as any)?.text || '',
                      to: (parsed.to as any)?.text || '',
                      subject: parsed.subject || '',
                      text: parsed.text || '',
                      html: parsed.html || '',
                      date: parsed.date || new Date(),
                      messageId: parsed.messageId || `${seqno}-${Date.now()}`
                    });
                  }
                  
                  processed++;
                  if (processed === emailsToFetch.length) {
                    imap.end();
                  }
                });
              });
            });

            fetch.on('end', () => {
              resolve(emails);
            });

            fetch.on('error', reject);
          });
        });
      });

      imap.once('error', reject);
      imap.once('end', () => {
        if (emails.length === 0) {
          resolve(emails);
        }
      });

      imap.connect();
    });
  }

  private async processEmail(email: any, channel: ChannelConfig): Promise<void> {
    try {
      // Check if ticket already exists for this email using messageId or unique identifier
      const messageId = email.messageId || `${email.from}-${email.subject}-${email.date}`;
      
      // Check if we already processed this email by looking for existing tickets with same messageId
      const existingTickets = await this.storage.getAllTickets();
      const duplicateTicket = existingTickets.find(ticket => 
        ticket.emailMessageId === messageId
      );
      
      // Also check our in-memory set for faster lookup
      if (duplicateTicket || this.processedEmails.has(messageId)) {
        console.log(`Skipping duplicate email: ${email.subject} (Message ID: ${messageId})`);
        return;
      }

      // Mark as processed immediately
      this.processedEmails.add(messageId);

      // Extract customer email from the 'from' field
      const fromMatch = email.from.match(/<(.+?)>/) || [null, email.from];
      const customerEmail = fromMatch[1] || email.from;

      // Find or create customer
      let customer = await this.storage.getCustomerByEmail(customerEmail);
      if (!customer) {
        customer = await this.storage.createCustomer({
          name: email.from.split('<')[0].trim() || customerEmail,
          email: customerEmail,
          password: '', // Email customers don't need passwords
          phone: null
        });
      }

      // Create ticket with unique messageId tracking
      const ticket = await this.storage.createTicket({
        subject: email.subject || 'No Subject',
        description: email.text || email.html || '',
        customerId: customer.id,
        customerName: customer.name,
        customerContact: customer.email,
        priority: 'medium',
        status: 'open',
        channel: 'email',
        emailMessageId: messageId
      });

      // Create message
      await this.storage.createMessage({
        ticketId: ticket.id,
        senderName: customer.name,
        content: email.text || email.html || '',
        sender: 'customer'
      });

      console.log(`Created ticket ${ticket.ticketNumber} from email: ${email.subject}`);

      // Send notification to available agents
      try {
        const { sendAgentNotification } = await import('./services/email');
        const agents = await this.storage.getAllAgents();
        
        // Send notification to all active agents (or implement assignment logic)
        for (const agent of agents) {
          if (agent.email) {
            await sendAgentNotification(agent.email, ticket);
            console.log(`Sent notification to agent: ${agent.email}`);
          }
        }
      } catch (notificationError) {
        console.error('Failed to send agent notifications:', notificationError);
      }

    } catch (error) {
      console.error('Error processing email:', error);
    }
  }

  async updatePollingConfig(channelId: string, config: EmailPollerConfig) {
    this.stopPolling(channelId);
    if (config.enabled) {
      await this.startPolling(channelId, config);
    }
  }

  getPollingStatus(channelId: string): { isActive: boolean; isCurrentlyPolling: boolean } {
    return {
      isActive: this.pollingIntervals.has(channelId),
      isCurrentlyPolling: this.isPolling.get(channelId) || false
    };
  }

  stopAllPolling() {
    for (const channelId of Array.from(this.pollingIntervals.keys())) {
      this.stopPolling(channelId);
    }
  }
}

// Global email poller instance
let emailPollerInstance: EmailPoller | null = null;

export function getEmailPoller(storage: IStorage): EmailPoller {
  if (!emailPollerInstance) {
    emailPollerInstance = new EmailPoller(storage);
  }
  return emailPollerInstance;
}