import { getStorage } from './storage';

/**
 * Run security checks on application startup
 * Warns about potential security issues that need attention
 */
export async function runSecurityChecks() {
  console.log('\n🔒 Running security checks...\n');
  
  let warnings = 0;
  const storage = getStorage();
  
  // Check 1: SESSION_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET) {
      console.error('❌ CRITICAL: SESSION_SECRET is required in production!');
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    if (process.env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  WARNING: SESSION_SECRET is too short. Use 64+ characters for production.');
      warnings++;
    }
  } else {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'dev-secret-change-in-production') {
      console.warn('⚠️  WARNING: Using default development SESSION_SECRET. This is NOT secure for production!');
      warnings++;
    }
  }
  
  // Check 2: Database SSL
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.includes('sslmode=require')) {
      console.warn('⚠️  WARNING: DATABASE_URL should include sslmode=require for production');
      console.warn('   Example: postgresql://user:pass@host:5432/db?sslmode=require');
      warnings++;
    }
  }
  
  // Check 3: Default Admin Password
  try {
    const defaultAdmins = [
      'admin@supporthub.com',
      'admin@example.com'
    ];
    
    for (const email of defaultAdmins) {
      const admin = await storage.getAdminUserByEmail(email);
      if (admin) {
        console.warn(`⚠️  WARNING: Default admin account detected: ${email}`);
        console.warn('   Change the password immediately after deployment!');
        warnings++;
      }
    }
  } catch (error) {
    // Ignore errors if admin lookup fails
  }
  
  // Check 4: Default Agent Passwords
  try {
    const defaultAgents = [
      'agent@example.com',
      'agent@supporthub.com'
    ];
    
    for (const email of defaultAgents) {
      const agent = await storage.getAgentByEmail(email);
      if (agent) {
        console.warn(`⚠️  WARNING: Default agent account detected: ${email}`);
        console.warn('   Change the password immediately after deployment!');
        warnings++;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  
  // Check 5: CORS Configuration
  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: CORS_ORIGIN not configured. Using defaults.');
    console.warn('   Set CORS_ORIGIN to your production domain(s)');
    warnings++;
  }
  
  // Check 6: HTTPS in Production
  if (process.env.NODE_ENV === 'production') {
    console.log('✓ Production mode: HTTPS cookies enabled');
  } else {
    console.log('ℹ Development mode: HTTP cookies allowed');
  }

  // Check 7: Email configuration
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️  WARNING: SENDGRID_API_KEY not set. Email sending may fail.');
    warnings++;
  }
  if (!process.env.VERIFIED_SENDER_EMAIL) {
    console.warn('⚠️  WARNING: VERIFIED_SENDER_EMAIL not set. Using defaults may reduce deliverability.');
    warnings++;
  }

  // Check 8: Cookie flags
  if (process.env.NODE_ENV === 'production') {
    const sameSite = process.env.COOKIE_SAMESITE || 'lax';
    if (!['lax', 'strict', 'none'].includes(sameSite)) {
      console.warn('⚠️  WARNING: Invalid COOKIE_SAMESITE value. Use lax|strict|none.');
      warnings++;
    }
  }
  
  // Summary
  console.log('');
  if (warnings === 0) {
    console.log('✅ All security checks passed!\n');
  } else {
    console.log(`⚠️  ${warnings} security warning(s) found. Please review and fix before production deployment.\n`);
  }
  
  // Additional recommendations
  if (process.env.NODE_ENV === 'production') {
    console.log('📋 Production Security Checklist:');
    console.log('   □ Strong SESSION_SECRET (64+ characters)');
    console.log('   □ Database SSL enabled (sslmode=require)');
    console.log('   □ Default passwords changed');
    console.log('   □ CORS whitelist configured');
    console.log('   □ HTTPS/SSL certificates installed');
    console.log('   □ Firewall rules configured');
    console.log('   □ Backups scheduled');
    console.log('   □ Monitoring enabled');
    console.log('');
  }
}

/**
 * Generate a strong session secret
 * Can be called from command line: node -e "require('./server/security-checks').generateSecret()"
 */
export function generateSecret() {
  const crypto = require('crypto');
  const secret = crypto.randomBytes(64).toString('base64');
  console.log('Generated SESSION_SECRET:');
  console.log(secret);
  console.log('\nAdd to your .env file:');
  console.log(`SESSION_SECRET=${secret}`);
}
