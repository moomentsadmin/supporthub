#!/bin/bash

# SupportHub Restore Script
# Restores application from a backup file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a backup file${NC}"
    echo -e "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo -e "${YELLOW}Available backups:${NC}"
    ls -1 backups/*.tar.gz 2>/dev/null || echo "No backups found in backups/ directory"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Restoring SupportHub from backup...${NC}"
echo -e "📁 Backup file: $BACKUP_FILE"

# Create restore directory
RESTORE_DIR="supporthub_restored_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESTORE_DIR"

# Extract backup
echo -e "${YELLOW}Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

echo -e "${GREEN}✅ Backup extracted successfully!${NC}"
echo -e "📁 Location: $RESTORE_DIR"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. cd $RESTORE_DIR"
echo -e "2. cp .env.example .env"
echo -e "3. Edit .env with your database and other settings"
echo -e "4. npm install"
echo -e "5. npm run db:push"
echo -e "6. npm run build"
echo -e "7. npm start"
echo ""

# Show directory contents
echo -e "${YELLOW}Restored files:${NC}"
ls -la "$RESTORE_DIR" | head -10

echo ""
echo -e "${GREEN}Restore completed successfully!${NC}"