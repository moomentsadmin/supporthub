import type { Express, Request, Response } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  customerLoginSchema,
  customerRegisterSchema,
  customerReplySchema,
  changePasswordSchema,
  type Customer 
} from "@shared/schema";

interface CustomerAuthenticatedRequest extends Request {
  session: session.Session & Partial<session.SessionData> & {
    customerId?: string;
  };
}

// Customer authentication middleware
const requireCustomerAuth = (req: CustomerAuthenticatedRequest, res: Response, next: () => void) => {
  if (!req.session?.customerId) {
    return res.status(401).json({ message: "Customer authentication required" });
  }
  next();
};

export function registerCustomerRoutes(app: Express) {
  // Customer registration
  app.post("/api/customer/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password, phone } = customerRegisterSchema.parse(req.body);
      
      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(409).json({ message: "Customer already exists with this email" });
      }
      
      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      const customer = await storage.createCustomer({
        name,
        email,
        password: hashedPassword,
        phone,
        isVerified: true // Auto-verify for now
      });
      
      // Log customer in immediately
      (req.session as any).customerId = customer.id;
      
      // Return customer without password
      const { password: _, ...customerData } = customer;
      res.status(201).json(customerData);
    } catch (error) {
      console.error("Customer registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  // Customer login
  app.post("/api/customer/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = customerLoginSchema.parse(req.body);
      const customer = await storage.validateCustomer(email, password);
      
      if (!customer) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent fixation
      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
            reject(err);
          } else {
            resolve(true);
          }
        });
      });

      (req.session as any).customerId = customer.id;
      
      // Update last login
      await storage.updateCustomer(customer.id, { lastLogin: new Date() });
      
      // Return customer without password
      const { password: _, ...customerData } = customer;
      res.json(customerData);
    } catch (error) {
      console.error("Customer login error:", error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Customer logout
  app.post("/api/customer/logout", requireCustomerAuth, (req: CustomerAuthenticatedRequest, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current customer
  app.get("/api/customer/me", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const customer = await storage.getCustomer(req.session.customerId!);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const { password: _, ...customerData } = customer;
      res.json(customerData);
    } catch (error) {
      console.error("Error fetching customer data:", error);
      res.status(500).json({ message: "Failed to fetch customer data" });
    }
  });

  // Update customer profile
  app.patch("/api/customer/profile", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const { name, phone, avatar } = req.body;
      const updates: any = {};
      
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (avatar) updates.avatar = avatar;
      
      const customer = await storage.updateCustomer(req.session.customerId!, updates);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const { password: _, ...customerData } = customer;
      res.json(customerData);
    } catch (error) {
      console.error("Error updating customer profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change customer password
  app.post("/api/customer/change-password", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      const customer = await storage.getCustomer(req.session.customerId!);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Verify current password
      const isValidPassword = bcrypt.compareSync(currentPassword, customer.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      
      await storage.updateCustomer(customer.id, { password: hashedNewPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get customer's tickets
  app.get("/api/customer/tickets", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const customer = await storage.getCustomer(req.session.customerId!);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const allTickets = await storage.getAllTickets();
      const customerTickets = allTickets.filter(ticket => 
        ticket.customerContact?.toLowerCase() === customer.email.toLowerCase() ||
        ticket.customerId === customer.id
      );
      
      res.json(customerTickets);
    } catch (error) {
      console.error("Error fetching customer tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Reply to a ticket
  app.post("/api/customer/tickets/:ticketId/reply", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { message, attachments } = customerReplySchema.parse({
        ...req.body,
        ticketId
      });
      
      const customer = await storage.getCustomer(req.session.customerId!);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Verify customer owns this ticket
      if (ticket.customerContact?.toLowerCase() !== customer.email.toLowerCase() && 
          ticket.customerId !== customer.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Create the reply message
      const replyMessage = await storage.createMessage({
        ticketId,
        senderId: customer.id,
        senderName: customer.name,
        message,
        isFromAgent: false,
        attachments: attachments || []
      });
      
      // Update ticket status to 'open' if it was resolved/closed
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await storage.updateTicket(ticketId, { 
          status: 'open',
          updatedAt: new Date()
        });
      }
      
      res.status(201).json(replyMessage);
    } catch (error) {
      console.error("Error replying to ticket:", error);
      res.status(500).json({ message: "Failed to reply to ticket" });
    }
  });

  // Get ticket messages for customer
  app.get("/api/customer/tickets/:ticketId/messages", requireCustomerAuth, async (req: CustomerAuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      
      const customer = await storage.getCustomer(req.session.customerId!);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Verify customer owns this ticket
      if (ticket.customerContact?.toLowerCase() !== customer.email.toLowerCase() && 
          ticket.customerId !== customer.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getTicketMessages(ticketId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Password Reset Routes (Public)
  app.post('/api/public/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if customer exists
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        // Don't reveal whether email exists for security
        return res.json({ message: 'If an account with that email exists, we have sent you a reset link.' });
      }

      // Generate reset token
      const resetToken = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await storage.createPasswordResetToken(email, resetToken, expiresAt);

      // Send reset email
      const { sendPasswordResetEmail } = await import('./services/email');
      const emailSent = await sendPasswordResetEmail(email, resetToken);

      if (!emailSent) {
        return res.status(500).json({ message: 'Failed to send reset email' });
      }

      res.json({ message: 'If an account with that email exists, we have sent you a reset link.' });
    } catch (error) {
      console.error('Error in forgot password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/public/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Get and validate token
      const tokenData = await storage.getPasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      if (new Date() > tokenData.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      // Find customer
      const customer = await storage.getCustomerByEmail(tokenData.email);
      if (!customer) {
        return res.status(400).json({ message: 'Customer not found' });
      }

      // Update password
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      await storage.updateCustomer(customer.id, { password: hashedPassword });

      // Delete the used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error in reset password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  console.log('Customer routes initialized');
}