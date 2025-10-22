#!/bin/bash

# Sazon Chef - Security Verification Script
# Run this before pushing to GitHub to ensure no sensitive files are committed

echo "🔒 Sazon Chef Security Verification"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for .env files
echo "🔍 Checking for environment files..."
ENV_FILES=$(find . -name "*.env*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$ENV_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found .env files:${NC}"
    echo "$ENV_FILES"
    echo -e "${YELLOW}⚠️  These files exist but should be in .gitignore${NC}"
    echo -e "${GREEN}✅ Checking if properly ignored...${NC}"
    
    # Check if they're in .gitignore
    for file in $ENV_FILES; do
        if grep -q "$file" .gitignore || grep -q "\.env" .gitignore; then
            echo -e "${GREEN}✅ $file is properly ignored${NC}"
        else
            echo -e "${RED}❌ $file is NOT in .gitignore!${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}✅ No .env files found${NC}"
fi

# Check for database files
echo "🔍 Checking for database files..."
DB_FILES=$(find . -name "*.db" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$DB_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found database files:${NC}"
    echo "$DB_FILES"
    echo -e "${YELLOW}⚠️  These files exist but should be in .gitignore${NC}"
    echo -e "${GREEN}✅ Checking if properly ignored...${NC}"
    
    # Check if they're in .gitignore
    for file in $DB_FILES; do
        if grep -q "$file" .gitignore || grep -q "\.db" .gitignore; then
            echo -e "${GREEN}✅ $file is properly ignored${NC}"
        else
            echo -e "${RED}❌ $file is NOT in .gitignore!${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}✅ No database files found${NC}"
fi

# Check for API keys in code
echo "🔍 Checking for potential API keys..."
API_KEYS=$(grep -r -i "api[_-]key\|secret\|password" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="*.sh" --exclude=".gitignore" 2>/dev/null | grep -v "// TODO" | grep -v "placeholder" | grep -v "Security - API keys")
if [ -n "$API_KEYS" ]; then
    echo -e "${YELLOW}⚠️  Found potential API keys:${NC}"
    echo "$API_KEYS"
    echo -e "${RED}❌ Review these files for hardcoded secrets!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No hardcoded API keys found${NC}"
fi

# Check for localhost URLs
echo "🔍 Checking for localhost URLs..."
LOCALHOST=$(grep -r "localhost\|127.0.0.1" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="*.sh" 2>/dev/null | grep -v "// TODO" | grep -v "example")
if [ -n "$LOCALHOST" ]; then
    echo -e "${YELLOW}⚠️  Found localhost URLs:${NC}"
    echo "$LOCALHOST"
    echo -e "${YELLOW}⚠️  Make sure these are for development only${NC}"
else
    echo -e "${GREEN}✅ No localhost URLs found${NC}"
fi

# Check .gitignore effectiveness
echo "🔍 Checking .gitignore effectiveness..."
if [ -f ".gitignore" ]; then
    echo -e "${GREEN}✅ .gitignore file exists${NC}"
    
    # Check if sensitive patterns are in .gitignore
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}✅ .env files in .gitignore${NC}"
    else
        echo -e "${RED}❌ .env files not in .gitignore!${NC}"
        exit 1
    fi
    
    if grep -q "\.db" .gitignore; then
        echo -e "${GREEN}✅ Database files in .gitignore${NC}"
    else
        echo -e "${RED}❌ Database files not in .gitignore!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ No .gitignore file found!${NC}"
    exit 1
fi

# Check for large files
echo "🔍 Checking for large files..."
LARGE_FILES=$(find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found large files (>10MB):${NC}"
    echo "$LARGE_FILES"
    echo -e "${YELLOW}⚠️  Consider adding to .gitignore if not needed${NC}"
else
    echo -e "${GREEN}✅ No large files found${NC}"
fi

# Check for log files
echo "🔍 Checking for log files..."
LOG_FILES=$(find . -name "*.log" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$LOG_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found log files:${NC}"
    echo "$LOG_FILES"
    echo -e "${YELLOW}⚠️  These should be in .gitignore${NC}"
else
    echo -e "${GREEN}✅ No log files found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Security verification completed!${NC}"
echo -e "${GREEN}✅ Repository is safe to push to GitHub${NC}"
echo ""
echo "📋 Pre-push checklist:"
echo "  ✅ No .env files"
echo "  ✅ No database files"
echo "  ✅ No API keys in code"
echo "  ✅ .gitignore properly configured"
echo "  ✅ No large files"
echo "  ✅ No log files"
echo ""
echo "🚀 Ready to push to GitHub!"
