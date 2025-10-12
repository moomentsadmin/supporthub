import { parse as parseCSV } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import type { IStorage } from './storage';
import type { InsertTicket, InsertCustomer, InsertMessage } from '@shared/schema';

export interface ImportOptions {
  skipDuplicates: boolean;
  preserveIds: boolean;
  importMode: 'tickets_only' | 'tickets_and_customers' | 'full_import';
}

export interface ImportResult {
  stats: {
    ticketsImported: number;
    customersCreated: number;
    attachmentsImported: number;
    errors: number;
    warnings: number;
  };
  errors: string[];
  warnings: string[];
}

export interface FreshdeskTicketData {
  id?: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  customer_email: string;
  customer_name?: string;
  agent_email?: string;
  created_at?: string;
  updated_at?: string;
  channel?: string;
  tags?: string;
  attachments?: string;
}

export class FreshdeskImporter {
  private storage: IStorage;
  private uploadDir: string;

  constructor(storage: IStorage, uploadDir: string = './uploads') {
    this.storage = storage;
    this.uploadDir = uploadDir;
  }

  async importFromCSV(
    csvPath: string,
    attachmentsZipPath?: string,
    options: ImportOptions = {
      skipDuplicates: true,
      preserveIds: false,
      importMode: 'tickets_only'
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      stats: {
        ticketsImported: 0,
        customersCreated: 0,
        attachmentsImported: 0,
        errors: 0,
        warnings: 0
      },
      errors: [],
      warnings: []
    };

    try {
      // Parse CSV file
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const records: FreshdeskTicketData[] = parseCSV(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"'
      });

      console.log(`Parsed ${records.length} records from CSV`);

      // Extract and prepare attachments if provided
      let attachmentsMap: Map<string, string[]> = new Map();
      if (attachmentsZipPath && fs.existsSync(attachmentsZipPath)) {
        try {
          attachmentsMap = await this.extractAttachments(attachmentsZipPath);
          console.log(`Extracted attachments for ${attachmentsMap.size} tickets`);
        } catch (error) {
          result.warnings.push(`Failed to extract attachments: ${error}`);
        }
      }

      // Process each ticket record
      for (const record of records) {
        try {
          await this.processTicketRecord(record, attachmentsMap, options, result);
        } catch (error) {
          result.errors.push(`Failed to process ticket ${record.id || record.subject}: ${error}`);
          result.stats.errors++;
        }
      }

      console.log('Import completed:', result.stats);
      return result;

    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      result.stats.errors++;
      throw error;
    }
  }

  private async processTicketRecord(
    record: FreshdeskTicketData,
    attachmentsMap: Map<string, string[]>,
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    // Validate required fields
    if (!record.subject || !record.description || !record.customer_email) {
      throw new Error('Missing required fields: subject, description, or customer_email');
    }

    // Check for duplicates if enabled
    if (options.skipDuplicates && record.id) {
      const existingTicket = await this.storage.getTicketByExternalId?.(record.id);
      if (existingTicket) {
        result.warnings.push(`Skipping duplicate ticket: ${record.id}`);
        return;
      }
    }

    // Handle customer creation/lookup
    let customerId: string | undefined;
    if (options.importMode !== 'tickets_only') {
      customerId = await this.handleCustomer(record, result);
    }

    // Handle agent assignment
    let agentId: string | undefined;
    if (record.agent_email) {
      const agent = await this.storage.getAgentByEmail?.(record.agent_email);
      if (agent) {
        agentId = agent.id;
      } else {
        result.warnings.push(`Agent not found: ${record.agent_email}`);
      }
    }

    // Create ticket
    const ticketData: InsertTicket = {
      subject: record.subject,
      description: record.description,
      status: record.status || 'open',
      priority: record.priority || 'medium',
      channel: (record.channel as any) || 'email',
      customerContact: record.customer_email,
      customerName: record.customer_name || this.extractNameFromEmail(record.customer_email),
      customerId: customerId,
      assignedAgentId: agentId,
      externalId: options.preserveIds ? record.id : undefined,
    };

    // Set timestamps if provided
    if (record.created_at) {
      try {
        ticketData.createdAt = new Date(record.created_at);
      } catch (error) {
        result.warnings.push(`Invalid created_at date for ticket ${record.id}: ${record.created_at}`);
      }
    }

    if (record.updated_at) {
      try {
        ticketData.updatedAt = new Date(record.updated_at);
      } catch (error) {
        result.warnings.push(`Invalid updated_at date for ticket ${record.id}: ${record.updated_at}`);
      }
    }

    const createdTicket = await this.storage.createTicket(ticketData);
    result.stats.ticketsImported++;

    // Handle tags if provided
    if (record.tags && options.importMode === 'full_import') {
      const tags = record.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      for (const tag of tags) {
        try {
          // Add tag functionality if implemented
          console.log(`Would add tag "${tag}" to ticket ${createdTicket.id}`);
        } catch (error) {
          result.warnings.push(`Failed to add tag "${tag}" to ticket ${createdTicket.id}`);
        }
      }
    }

    // Handle attachments
    const ticketAttachments = attachmentsMap.get(record.id || '');
    if (ticketAttachments && ticketAttachments.length > 0) {
      for (const attachmentPath of ticketAttachments) {
        try {
          await this.handleAttachment(createdTicket.id, attachmentPath, result);
        } catch (error) {
          result.warnings.push(`Failed to attach file ${attachmentPath} to ticket ${createdTicket.id}`);
        }
      }
    }

    // Create initial message from description
    if (options.importMode === 'full_import') {
      try {
        const messageData: InsertMessage = {
          ticketId: createdTicket.id,
          content: record.description,
          isFromAgent: false,
          senderName: record.customer_name || this.extractNameFromEmail(record.customer_email),
          senderEmail: record.customer_email,
        };

        if (record.created_at) {
          messageData.createdAt = new Date(record.created_at);
        }

        await this.storage.createMessage(messageData);
      } catch (error) {
        result.warnings.push(`Failed to create initial message for ticket ${createdTicket.id}`);
      }
    }
  }

  private async handleCustomer(
    record: FreshdeskTicketData,
    result: ImportResult
  ): Promise<string | undefined> {
    try {
      // Check if customer already exists
      let customer = await this.storage.getCustomerByEmail?.(record.customer_email);
      
      if (!customer) {
        // Create new customer
        const customerData: InsertCustomer = {
          name: record.customer_name || this.extractNameFromEmail(record.customer_email),
          email: record.customer_email,
          password: 'imported_user_' + Math.random().toString(36).substring(7), // Temporary password
          isVerified: false, // They'll need to reset password
        };

        customer = await this.storage.createCustomer(customerData);
        result.stats.customersCreated++;
      }

      return customer.id;
    } catch (error) {
      console.error('Failed to handle customer:', error);
      return undefined;
    }
  }

  private async extractAttachments(zipPath: string): Promise<Map<string, string[]>> {
    const attachmentsMap = new Map<string, string[]>();
    const extractDir = path.join(this.uploadDir, 'freshdesk-import', Date.now().toString());

    // Ensure extraction directory exists
    fs.mkdirSync(extractDir, { recursive: true });

    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', () => {
          try {
            // Read extracted files and organize by ticket ID
            const ticketDirs = fs.readdirSync(extractDir, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);

            for (const ticketId of ticketDirs) {
              const ticketDir = path.join(extractDir, ticketId);
              const files = fs.readdirSync(ticketDir, { withFileTypes: true })
                .filter(dirent => dirent.isFile())
                .map(dirent => path.join(ticketDir, dirent.name));

              if (files.length > 0) {
                attachmentsMap.set(ticketId, files);
              }
            }

            resolve(attachmentsMap);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async handleAttachment(
    ticketId: string,
    attachmentPath: string,
    result: ImportResult
  ): Promise<void> {
    try {
      const fileName = path.basename(attachmentPath);
      const fileSize = fs.statSync(attachmentPath).size;
      const fileExtension = path.extname(fileName).toLowerCase();

      // Validate file size (10MB limit)
      if (fileSize > 10 * 1024 * 1024) {
        throw new Error(`File too large: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB)`);
      }

      // Validate file type
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar'];
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Move file to uploads directory
      const targetDir = path.join(this.uploadDir, 'attachments', ticketId);
      fs.mkdirSync(targetDir, { recursive: true });
      
      const targetPath = path.join(targetDir, fileName);
      fs.copyFileSync(attachmentPath, targetPath);

      // Create attachment record
      const attachmentData = {
        ticketId: ticketId,
        filename: fileName,
        originalName: fileName,
        size: fileSize,
        mimetype: this.getMimeType(fileExtension),
        path: targetPath,
      };

      await this.storage.createAttachment(attachmentData);
      result.stats.attachmentsImported++;

    } catch (error) {
      throw new Error(`Failed to process attachment ${attachmentPath}: ${error}`);
    }
  }

  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }
}