#!/bin/bash

# SupportHub Backup Pruning Script
# Keeps only the N most recent backups

set -e

# Configuration
BACKUP_DIR="backups"
KEEP_COUNT=${1:-5}  # Default: keep 5 most recent backups

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Pruning old backups...${NC}"
echo -e "📁 Backup directory: $BACKUP_DIR"
echo -e "🔢 Keeping: $KEEP_COUNT most recent backups"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Error: Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# Count current backups
CURRENT_COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)

if [ "$CURRENT_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No backup files found${NC}"
    exit 0
fi

echo -e "📊 Current backups: $CURRENT_COUNT"

if [ "$CURRENT_COUNT" -le "$KEEP_COUNT" ]; then
    echo -e "${GREEN}✅ No pruning needed (have $CURRENT_COUNT, keeping $KEEP_COUNT)${NC}"
    exit 0
fi

# List all backups by modification time (oldest first)
echo -e "${YELLOW}Current backups:${NC}"
ls -lt "$BACKUP_DIR"/*.tar.gz

# Calculate how many to delete
DELETE_COUNT=$((CURRENT_COUNT - KEEP_COUNT))
echo ""
echo -e "${YELLOW}Will delete $DELETE_COUNT old backup(s)${NC}"

# Get files to delete (oldest first)
FILES_TO_DELETE=$(ls -t "$BACKUP_DIR"/*.tar.gz | tail -n $DELETE_COUNT)

echo -e "${YELLOW}Files to be deleted:${NC}"
for file in $FILES_TO_DELETE; do
    echo -e "  🗑️  $(basename "$file")"
done

echo ""
read -p "Proceed with deletion? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Delete old backups
    for file in $FILES_TO_DELETE; do
        rm "$file"
        echo -e "${GREEN}✅ Deleted: $(basename "$file")${NC}"
    done
    
    echo ""
    echo -e "${GREEN}Pruning completed successfully!${NC}"
    echo -e "📊 Remaining backups: $KEEP_COUNT"
    
    echo ""
    echo -e "${YELLOW}Remaining backup files:${NC}"
    ls -lt "$BACKUP_DIR"/*.tar.gz
else
    echo -e "${YELLOW}Pruning cancelled${NC}"
fi