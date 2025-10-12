// Channel connection testing utilities
import * as nodemailer from 'nodemailer';
import type { ChannelConfig } from '@shared/schema';

export async function testEmailConnection(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
  try {
    if (!channel.inboundSettings?.server || !channel.outboundSettings?.smtp_host) {
      return { success: false, error: "Missing IMAP server or SMTP configuration" };
    }

    if (!channel.outboundSettings.username || !channel.outboundSettings.password) {
      return { success: false, error: "Missing email credentials (username/password)" };
    }

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: channel.outboundSettings.smtp_host,
      port: channel.outboundSettings.smtp_port || 587,
      secure: channel.outboundSettings.ssl || false,
      auth: {
        user: channel.outboundSettings.username,
        pass: channel.outboundSettings.password,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error('Email connection test failed:', error);
    let errorMessage = 'Unknown error occurred';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check username/password. For Gmail, use App Password instead of account password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Check server and port settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Check server address and firewall settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function testSMSConnection(channel: ChannelConfig): Promise<boolean> {
  try {
    if (!channel.config?.twilioAccountSid || !channel.config?.twilioAuthToken) {
      return false;
    }

    // Basic validation - in a real app, you'd test the Twilio connection
    // For now, just check if credentials are present
    return !!(
      channel.config.twilioAccountSid &&
      channel.config.twilioAuthToken &&
      channel.config.twilioPhoneNumber
    );
  } catch (error) {
    console.error('SMS connection test failed:', error);
    return false;
  }
}

export async function testWhatsAppConnection(channel: ChannelConfig): Promise<boolean> {
  try {
    // Basic validation for WhatsApp - implement actual API test as needed
    return !!(channel.config?.apiKey && channel.config?.phoneNumber);
  } catch (error) {
    console.error('WhatsApp connection test failed:', error);
    return false;
  }
}

export async function testTwitterConnection(channel: ChannelConfig): Promise<boolean> {
  try {
    // Basic validation for Twitter - implement actual API test as needed
    return !!(channel.config?.apiKey && channel.config?.apiSecret);
  } catch (error) {
    console.error('Twitter connection test failed:', error);
    return false;
  }
}

export async function testFacebookConnection(channel: ChannelConfig): Promise<boolean> {
  try {
    // Basic validation for Facebook - implement actual API test as needed
    return !!(channel.config?.pageAccessToken && channel.config?.appId);
  } catch (error) {
    console.error('Facebook connection test failed:', error);
    return false;
  }
}

export async function testChannelConnection(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
  switch (channel.type) {
    case 'email':
      return await testEmailConnection(channel);
    case 'sms':
      const smsResult = await testSMSConnection(channel);
      return { success: smsResult, error: smsResult ? undefined : 'SMS configuration incomplete or invalid' };
    case 'whatsapp':
      const whatsappResult = await testWhatsAppConnection(channel);
      return { success: whatsappResult, error: whatsappResult ? undefined : 'WhatsApp configuration incomplete or invalid' };
    case 'twitter':
      const twitterResult = await testTwitterConnection(channel);
      return { success: twitterResult, error: twitterResult ? undefined : 'Twitter configuration incomplete or invalid' };
    case 'facebook':
      const facebookResult = await testFacebookConnection(channel);
      return { success: facebookResult, error: facebookResult ? undefined : 'Facebook configuration incomplete or invalid' };
    default:
      return { success: false, error: 'Unsupported channel type' };
  }
}

export function getChannelHealthStatus(channel: ChannelConfig): 'connected' | 'disconnected' | 'error' | 'connecting' {
  if (!channel.isActive) {
    return 'disconnected';
  }

  // Check if required configuration is present
  const hasRequiredConfig = (() => {
    switch (channel.type) {
      case 'email':
        return !!(
          channel.inboundSettings?.server &&
          channel.inboundSettings?.username &&
          channel.outboundSettings?.smtp_host &&
          channel.outboundSettings?.username
        );
      case 'sms':
        return !!(
          channel.config?.twilioAccountSid &&
          channel.config?.twilioAuthToken &&
          channel.config?.twilioPhoneNumber
        );
      case 'whatsapp':
        return !!(channel.config?.apiKey && channel.config?.phoneNumber);
      case 'twitter':
        return !!(channel.config?.apiKey && channel.config?.apiSecret);
      case 'facebook':
        return !!(channel.config?.pageAccessToken && channel.config?.appId);
      default:
        return false;
    }
  })();

  if (!hasRequiredConfig) {
    return 'error';
  }

  // If we have a recent successful sync, consider it connected
  if (channel.lastSync && channel.status === 'connected') {
    const lastSyncTime = new Date(channel.lastSync).getTime();
    const now = Date.now();
    const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 24) {
      return 'connected';
    }
  }

  return channel.status || 'disconnected';
}