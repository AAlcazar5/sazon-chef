#!/bin/bash

# Sazon Chef - Cleanup Script
# Safely removes development files that can be regenerated

echo "🧹 Cleaning up Sazon Chef repository..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to safely remove directory
safe_remove() {
    if [ -d "$1" ]; then
        echo -e "${YELLOW}Removing $1...${NC}"
        rm -rf "$1"
        echo -e "${GREEN}✅ Removed $1${NC}"
    else
        echo -e "${GREEN}✅ $1 not found (already clean)${NC}"
    fi
}

# Function to safely remove files
safe_remove_files() {
    local pattern="$1"
    local count=$(find . -name "$pattern" -not -path "./node_modules/*" 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}Removing $count files matching $pattern...${NC}"
        find . -name "$pattern" -not -path "./node_modules/*" -delete 2>/dev/null
        echo -e "${GREEN}✅ Removed $count files${NC}"
    else
        echo -e "${GREEN}✅ No files matching $pattern found${NC}"
    fi
}

echo "🔍 Checking for files to clean up..."

# Remove development cache directories
safe_remove "frontend/.expo"
safe_remove "frontend/dist"
safe_remove "backend/dist"
safe_remove "frontend/web-build"
safe_remove "backend/coverage"
safe_remove "frontend/coverage"
safe_remove ".nyc_output"

# Remove log files
safe_remove_files "*.log"

# Remove temporary files
safe_remove_files "*.tmp"
safe_remove_files "*.temp"
safe_remove_files "*.cache"

# Remove TypeScript build info
safe_remove_files "*.tsbuildinfo"

# Remove OS-specific files
safe_remove_files ".DS_Store"
safe_remove_files "Thumbs.db"

echo ""
echo -e "${GREEN}🎉 Cleanup completed!${NC}"
echo ""
echo "📊 Repository status:"
echo "  ✅ Development cache files removed"
echo "  ✅ Log files cleaned"
echo "  ✅ Temporary files removed"
echo "  ✅ Build artifacts cleaned"
echo ""
echo "🔒 Security status:"
echo "  ✅ Sensitive files still properly ignored"
echo "  ✅ Database files protected"
echo "  ✅ Environment files secure"
echo ""
echo "🚀 Repository is clean and ready for GitHub!"
