import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

export type EmailProvider = 'sendgrid' | 'mailgun' | 'mailjet' | 'elastic' | 'smtp';

interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

interface EmailConfig {
  provider: EmailProvider;
  apiKey?: string;
  domain?: string;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

class EmailService {
  private config: EmailConfig;
  private fallbackProviders: EmailProvider[] = ['mailgun', 'smtp'];

  constructor() {
    this.config = this.getEmailConfig();
    this.initializeProvider();
  }

  // Allow runtime configuration updates
  updateConfig(newConfig: Partial<EmailConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.initializeProvider();
  }

  private getEmailConfig(): EmailConfig {
    const provider = (process.env.EMAIL_PROVIDER as EmailProvider) || 'sendgrid';
    
    return {
      provider,
      apiKey: process.env.EMAIL_API_KEY || process.env.SENDGRID_API_KEY,
      domain: process.env.EMAIL_DOMAIN,
      username: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true'
    };
  }

  private initializeProvider(): void {
    switch (this.config.provider) {
      case 'sendgrid':
        if (this.config.apiKey) {
          sgMail.setApiKey(this.config.apiKey);
        }
        break;
      case 'mailgun':
      case 'mailjet':
      case 'elastic':
      case 'smtp':
        // These are initialized per request
        break;
      default:
        console.warn(`Unknown email provider: ${this.config.provider}`);
    }
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    // Try primary provider first
    const primaryResult = await this.tryProvider(this.config.provider, emailData);
    if (primaryResult.success) {
      return true;
    }

    // If primary fails due to configuration, don't try fallbacks
    if (!this.isConfigured()) {
      console.log(`❌ ${this.config.provider} not configured - email not sent:`, {
        to: emailData.to,
        subject: emailData.subject,
        provider: this.config.provider,
        apiKey: this.config.apiKey ? 'Present' : 'Missing'
      });
      return false;
    }

    // Try fallback providers for SendGrid IP issues
    if (this.config.provider === 'sendgrid' && primaryResult.error?.code === 401) {
      console.log('🔄 SendGrid failed due to IP restrictions, trying fallback providers...');
      
      for (const fallbackProvider of this.fallbackProviders) {
        if (this.isProviderConfigured(fallbackProvider)) {
          console.log(`🔄 Trying fallback provider: ${fallbackProvider}`);
          const fallbackResult = await this.tryProvider(fallbackProvider, emailData);
          if (fallbackResult.success) {
            console.log(`✅ Email sent successfully via fallback provider: ${fallbackProvider}`);
            return true;
          }
        }
      }
    }

    console.error('❌ All email providers failed - email not sent');
    return false;
  }

  private async tryProvider(provider: EmailProvider, emailData: EmailData): Promise<{success: boolean, error?: any}> {
    console.log(`📧 Attempting to send email via ${provider}:`, {
      to: emailData.to,
      subject: emailData.subject
    });

    try {
      switch (provider) {
        case 'sendgrid':
          await this.sendWithSendGrid(emailData);
          return { success: true };
        case 'mailgun':
          await this.sendWithMailgun(emailData);
          return { success: true };
        case 'mailjet':
          await this.sendWithMailjet(emailData);
          return { success: true };
        case 'elastic':
          await this.sendWithElasticEmail(emailData);
          return { success: true };
        case 'smtp':
          await this.sendWithSMTP(emailData);
          return { success: true };
        default:
          throw new Error(`Unsupported email provider: ${provider}`);
      }
    } catch (error: any) {
      console.error(`❌ ${provider} email error:`, {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        response: error.response?.body || error.response?.data
      });
      
      if (provider === 'sendgrid' && error.code === 401) {
        console.error('🚨 SendGrid IP Address Issue - trying fallback providers');
      }
      
      return { success: false, error };
    }
  }

  private isProviderConfigured(provider: EmailProvider): boolean {
    switch (provider) {
      case 'sendgrid':
        return !!process.env.SENDGRID_API_KEY;
      case 'mailgun':
        return !!(process.env.EMAIL_API_KEY && process.env.EMAIL_DOMAIN);
      case 'mailjet':
        return !!(process.env.EMAIL_API_KEY && process.env.EMAIL_USERNAME);
      case 'elastic':
        return !!process.env.EMAIL_API_KEY;
      case 'smtp':
        return !!(process.env.SMTP_HOST && process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD);
      default:
        return false;
    }
  }

  private isConfigured(): boolean {
    switch (this.config.provider) {
      case 'sendgrid':
        return !!this.config.apiKey;
      case 'mailgun':
        return !!(this.config.apiKey && this.config.domain);
      case 'mailjet':
        return !!(this.config.apiKey && this.config.username);
      case 'elastic':
        return !!this.config.apiKey;
      case 'smtp':
        return !!(this.config.host && this.config.username && this.config.password);
      default:
        return false;
    }
  }

  private parseRecipients(recipients?: string): string[] | undefined {
    return recipients ? recipients.split(',').map(e => e.trim()).filter(e => e) : undefined;
  }

  private async sendWithSendGrid(emailData: EmailData): Promise<boolean> {
    const msg = {
      to: emailData.to,
      cc: this.parseRecipients(emailData.cc),
      bcc: this.parseRecipients(emailData.bcc),
      from: emailData.from,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    // Remove undefined fields
    Object.keys(msg).forEach(key => {
      if (msg[key as keyof typeof msg] === undefined) {
        delete msg[key as keyof typeof msg];
      }
    });

    const response = await sgMail.send(msg);
    console.log(`✅ SendGrid: Email sent successfully to ${emailData.to}`, {
      statusCode: response[0]?.statusCode,
      messageId: response[0]?.headers?.['x-message-id']
    });
    return true;
  }

  private async sendWithMailgun(emailData: EmailData): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append('from', emailData.from);
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    formData.append('text', emailData.text);
    
    if (emailData.html) {
      formData.append('html', emailData.html);
    }
    if (emailData.cc) {
      formData.append('cc', emailData.cc);
    }
    if (emailData.bcc) {
      formData.append('bcc', emailData.bcc);
    }

    const response = await fetch(`https://api.mailgun.net/v3/${this.config.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }

    console.log(`Mailgun: Email sent successfully to ${emailData.to}`);
    return true;
  }

  private async sendWithMailjet(emailData: EmailData): Promise<boolean> {
    const payload = {
      Messages: [{
        From: { Email: emailData.from },
        To: [{ Email: emailData.to }],
        Subject: emailData.subject,
        TextPart: emailData.text,
        HTMLPart: emailData.html,
        Cc: emailData.cc ? this.parseRecipients(emailData.cc)?.map(email => ({ Email: email })) : undefined,
        Bcc: emailData.bcc ? this.parseRecipients(emailData.bcc)?.map(email => ({ Email: email })) : undefined,
      }]
    };

    // Remove undefined fields
    Object.keys(payload.Messages[0]).forEach(key => {
      if (payload.Messages[0][key as keyof typeof payload.Messages[0]] === undefined) {
        delete payload.Messages[0][key as keyof typeof payload.Messages[0]];
      }
    });

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Mailjet API error: ${response.status} ${response.statusText}`);
    }

    console.log(`Mailjet: Email sent successfully to ${emailData.to}`);
    return true;
  }

  private async sendWithElasticEmail(emailData: EmailData): Promise<boolean> {
    const payload = {
      apikey: this.config.apiKey,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      bodyText: emailData.text,
      bodyHtml: emailData.html,
      cc: emailData.cc,
      bcc: emailData.bcc,
    };

    // Remove undefined fields and prepare clean data
    const cleanPayload: Record<string, string> = {};
    Object.keys(payload).forEach(key => {
      const value = payload[key as keyof typeof payload];
      if (value !== undefined) {
        cleanPayload[key] = String(value);
      }
    });

    const formData = new URLSearchParams(cleanPayload);

    const response = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Elastic Email API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as any;
    if (!result.success) {
      throw new Error(`Elastic Email error: ${result.error}`);
    }

    console.log(`Elastic Email: Email sent successfully to ${emailData.to}`);
    return true;
  }

  private async sendWithSMTP(emailData: EmailData): Promise<boolean> {
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
    });

    const mailOptions = {
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`SMTP: Email sent successfully to ${emailData.to}`);
    return true;
  }

  getProviderInfo(): { provider: EmailProvider; configured: boolean } {
    return {
      provider: this.config.provider,
      configured: this.isConfigured()
    };
  }
}

// Global email service instance
const emailService = new EmailService();

// Export functions for backward compatibility
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  return emailService.sendEmail(emailData);
}

export async function sendTicketReply(
  ticket: any,
  message: any,
  agentName: string,
  emailConfig: any
): Promise<boolean> {
  const verifiedSender = process.env.VERIFIED_SENDER_EMAIL;
  const fromEmail = verifiedSender || emailConfig.from || 'support@company.com';
  
  return emailService.sendEmail({
    to: ticket.customerContact,
    from: fromEmail,
    subject: `Re: ${ticket.subject}`,
    text: message.content,
    html: message.htmlContent || message.content.replace(/\n/g, '<br>')
  });
}

export function getEmailProviderInfo(): { provider: EmailProvider; configured: boolean } {
  return emailService.getProviderInfo();
}

export function updateEmailProvider(provider: EmailProvider, config: any) {
  emailService.updateConfig({ provider, ...config });
}