#!/bin/bash

# SupportHub Backup Script
# Creates a timestamped backup of the application

set -e

# Configuration
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="supporthub_backup_${TIMESTAMP}.tar.gz"
PROJECT_NAME="supporthub"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}Creating SupportHub backup...${NC}"

# Create the backup
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="dist" \
    --exclude="*.log" \
    --exclude="*.tar.gz" \
    --exclude="*.zip" \
    --exclude="backups" \
    --exclude="uploads/*" \
    --exclude=".env" \
    --exclude="coverage" \
    --exclude=".next" \
    --exclude="build" \
    .

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo -e "📁 Location: ${BACKUP_DIR}/${BACKUP_NAME}"
echo -e "📊 Size: ${BACKUP_SIZE}"
echo ""

# List recent backups
echo -e "${YELLOW}Recent backups:${NC}"
ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | tail -5 || echo "No previous backups found"

echo ""
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "To restore this backup later, use: ${YELLOW}./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}${NC}"