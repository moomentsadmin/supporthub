import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database connection validation
export function validateDatabaseConnection(): boolean {
  return !!process.env.DATABASE_URL;
}

// Initialize database connection only if DATABASE_URL is available
let pool: Pool | null = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.warn('DATABASE_URL not found. Database operations will not be available.');
}

export { pool, db };
