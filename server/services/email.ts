import { MailService } from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// Initialize SendGrid if API key is available
let sendGridMail: MailService | null = null;
if (process.env.SENDGRID_API_KEY) {
  sendGridMail = new MailService();
  sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize SMTP transporter if SMTP credentials are available
let smtpTransporter: nodemailer.Transporter | null = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Get sender email from application settings or environment variables
  let fromEmail = options.from;
  
  if (!fromEmail) {
    // Use environment variables or default - admin can configure via settings
    fromEmail = process.env.VERIFIED_SENDER_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
  }
  
  try {
    // Try SendGrid first if available
    if (sendGridMail && fromEmail) {
      await sendGridMail.send({
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log('Email sent via SendGrid to:', options.to);
      return true;
    }

    // Fallback to SMTP if available
    if (smtpTransporter) {
      await smtpTransporter.sendMail({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log('Email sent via SMTP to:', options.to);
      return true;
    }

    console.error('No email service configured');
    return false;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export async function sendAgentNotification(agentEmail: string, ticket: any): Promise<boolean> {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const ticketUrl = `https://${domain}/agents/tickets/${ticket.id}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Ticket Assignment</h2>
      <p>A new support ticket has been created and requires your attention.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0; color: #495057;">Ticket Details</h3>
        <p><strong>Ticket ID:</strong> ${ticket.ticketNumber || ticket.id}</p>
        <p><strong>Subject:</strong> ${ticket.subject}</p>
        <p><strong>Customer:</strong> ${ticket.customerName}</p>
        <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
        <p><strong>Channel:</strong> ${ticket.channel.toUpperCase()}</p>
      </div>
      
      <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        View Ticket
      </a>
      
      <p style="margin-top: 20px; color: #666;">
        Please respond to this ticket as soon as possible to maintain our service quality standards.
      </p>
    </div>
  `;

  const text = `
    New Ticket Assignment
    
    A new support ticket has been created and requires your attention.
    
    Ticket Details:
    - Ticket ID: ${ticket.ticketNumber || ticket.id}
    - Subject: ${ticket.subject}
    - Customer: ${ticket.customerName}
    - Priority: ${ticket.priority.toUpperCase()}
    - Channel: ${ticket.channel.toUpperCase()}
    
    View ticket: ${ticketUrl}
    
    Please respond to this ticket as soon as possible to maintain our service quality standards.
  `;

  return sendEmail({
    to: agentEmail,
    subject: `New Ticket: ${ticket.subject}`,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const resetLink = `https://${domain}/customer/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested a password reset for your support account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p style="margin-top: 20px; color: #666;">
        If you didn't request this password reset, please ignore this email.
        This link will expire in 1 hour.
      </p>
    </div>
  `;

  const text = `
    Password Reset Request
    
    You requested a password reset for your support account.
    
    Click the following link to reset your password:
    ${resetLink}
    
    If you didn't request this password reset, please ignore this email.
    This link will expire in 1 hour.
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html,
    text,
  });
}