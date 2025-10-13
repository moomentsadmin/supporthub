-- SupportHub Database Initialization Script
-- This file is executed when the database is first created

-- Database will be created by Docker Compose environment variables
-- Tables will be created automatically by Drizzle ORM on first run

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE supporthub TO supporthub;

-- The schema will be managed by the application using Drizzle ORM
-- No manual table creation needed here
