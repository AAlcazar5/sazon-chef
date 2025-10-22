#!/bin/bash

# Sazon Chef - Git Setup Script
# This script safely initializes the git repository and ensures all sensitive files are ignored

echo "🍳 Setting up Sazon Chef Git repository..."

# Initialize git repository
git init

# Add all files (respecting .gitignore)
git add .

# Check what files are being tracked
echo "📋 Files to be committed:"
git status --porcelain

# Check for any sensitive files that might be tracked
echo "🔍 Checking for sensitive files..."

# Check for .env files
if git ls-files | grep -q "\.env"; then
    echo "⚠️  WARNING: .env files found in staging area!"
    echo "Please remove them from .gitignore or unstage them"
    exit 1
fi

# Check for database files
if git ls-files | grep -q "\.db"; then
    echo "⚠️  WARNING: Database files found in staging area!"
    echo "Please remove them from .gitignore or unstage them"
    exit 1
fi

# Check for API keys
if git ls-files | xargs grep -l "api_key\|secret\|password" 2>/dev/null | grep -v ".gitignore"; then
    echo "⚠️  WARNING: Potential API keys found in tracked files!"
    echo "Please review and remove sensitive information"
    exit 1
fi

echo "✅ Security check passed!"

# Create initial commit
echo "📝 Creating initial commit..."
git commit -m "Initial commit: Sazon Chef - AI-Powered Recipe Recommendation App

- Full-stack React Native/Expo frontend
- Node.js/Express backend with TypeScript
- SQLite database with Prisma ORM
- Comprehensive test suite (165+ tests)
- Recipe recommendation algorithm
- Nutritional calculations and macro tracking
- User preference management
- Complete API documentation"

echo "🎉 Git repository initialized successfully!"
echo ""
echo "Next steps:"
echo "1. Add remote repository: git remote add origin <your-repo-url>"
echo "2. Push to GitHub: git push -u origin main"
echo "3. Review SECURITY.md for deployment checklist"
echo ""
echo "🔒 Security reminder: Never commit .env files or database files!"
