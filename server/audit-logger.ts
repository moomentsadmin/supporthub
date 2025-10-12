import type { Request } from 'express';
import type { IStorage } from './storage';
import type { InsertAuditLog } from '@shared/schema';

export interface AuditContext {
  userId?: string;
  userType: 'agent' | 'customer' | 'admin' | 'system';
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class AuditLogger {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async log(
    action: string,
    description: string,
    context: AuditContext,
    options: {
      level?: 'info' | 'warn' | 'error' | 'debug';
      entity?: string;
      entityId?: string;
      metadata?: Record<string, any>;
      success?: boolean;
      errorMessage?: string;
      duration?: number;
    } = {}
  ): Promise<void> {
    try {
      const auditLog: InsertAuditLog = {
        level: options.level || 'info',
        action,
        entity: options.entity || null,
        entityId: options.entityId || null,
        userId: context.userId || null,
        userType: context.userType,
        userName: context.userName || null,
        userEmail: context.userEmail || null,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        sessionId: context.sessionId || null,
        description,
        metadata: options.metadata || null,
        success: options.success ?? true,
        errorMessage: options.errorMessage || null,
        duration: options.duration || null,
      };

      await this.storage.createAuditLog(auditLog);
    } catch (error) {
      // Fail silently to avoid breaking the main application
      console.error('Failed to log audit event:', error);
    }
  }

  // Helper method to extract context from Express request
  static extractContextFromRequest(req: Request): Partial<AuditContext> {
    return {
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                 (req.connection as any)?.socket?.remoteAddress || null,
      userAgent: req.get('User-Agent') || null,
      sessionId: req.sessionID || null,
    };
  }

  // Common logging methods
  async logLogin(context: AuditContext, success: boolean, errorMessage?: string): Promise<void> {
    await this.log(
      'login',
      success 
        ? `User ${context.userName || context.userEmail} logged in successfully`
        : `Failed login attempt for ${context.userEmail}`,
      context,
      {
        level: success ? 'info' : 'warn',
        success,
        errorMessage,
      }
    );
  }

  async logLogout(context: AuditContext): Promise<void> {
    await this.log(
      'logout',
      `User ${context.userName || context.userEmail} logged out`,
      context
    );
  }

  async logTicketCreation(context: AuditContext, ticketId: string, ticketNumber: string): Promise<void> {
    await this.log(
      'create_ticket',
      `Created ticket ${ticketNumber}`,
      context,
      {
        entity: 'ticket',
        entityId: ticketId,
      }
    );
  }

  async logTicketUpdate(context: AuditContext, ticketId: string, ticketNumber: string, changes: string[]): Promise<void> {
    await this.log(
      'update_ticket',
      `Updated ticket ${ticketNumber}: ${changes.join(', ')}`,
      context,
      {
        entity: 'ticket',
        entityId: ticketId,
        metadata: { changes },
      }
    );
  }

  async logChannelUpdate(context: AuditContext, channelId: string, channelName: string, action: string): Promise<void> {
    await this.log(
      'update_channel',
      `${action} channel ${channelName}`,
      context,
      {
        entity: 'channel',
        entityId: channelId,
      }
    );
  }

  async logSystemEvent(description: string, metadata?: Record<string, any>, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    await this.log(
      'system_event',
      description,
      { userType: 'system' },
      {
        level,
        metadata,
      }
    );
  }

  async logError(action: string, error: Error, context: Partial<AuditContext> = {}): Promise<void> {
    await this.log(
      action,
      `Error in ${action}: ${error.message}`,
      { userType: 'system', ...context },
      {
        level: 'error',
        success: false,
        errorMessage: error.message,
        metadata: {
          stack: error.stack,
        },
      }
    );
  }
}

// Global audit logger instance
let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(storage: IStorage): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger(storage);
  }
  return auditLoggerInstance;
}