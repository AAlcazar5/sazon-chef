#!/bin/bash

# Phase 5 Setup Script - External Recipe Data Integration
# This script sets up the Spoonacular API integration

set -e  # Exit on error

echo "🚀 Setting up Phase 5: External Recipe Data Integration"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Check for .env file
echo "🔑 Step 2: Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env and add your Spoonacular API key"
    echo "   Get your free API key at: https://spoonacular.com/food-api"
    echo ""
else
    echo "✅ .env file exists"
    
    # Check if Spoonacular API key is set
    if grep -q "SPOONACULAR_API_KEY=your_api_key_here" .env || ! grep -q "SPOONACULAR_API_KEY=" .env; then
        echo "⚠️  WARNING: Spoonacular API key not configured in .env"
        echo "   Please edit backend/.env and add your API key"
        echo "   Get your free API key at: https://spoonacular.com/food-api"
        echo ""
    else
        echo "✅ Spoonacular API key is configured"
    fi
fi
echo ""

# Step 3: Generate Prisma client
echo "🔧 Step 3: Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Create and apply migration
echo "🗄️  Step 4: Creating database migration..."
echo "This will add external data fields to the Recipe model"
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma migrate dev --name add_external_recipe_data
    echo "✅ Migration applied"
else
    echo "⚠️  Migration skipped. Run manually with: npx prisma migrate dev --name add_external_recipe_data"
fi
echo ""

# Step 5: Summary
echo "✅ Phase 5 setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Add your Spoonacular API key to backend/.env"
echo "2. Start the server: npm run dev"
echo "3. Enrich recipes: curl -X POST http://localhost:3001/api/recipes/enrich/batch?limit=5"
echo "4. Check status: curl http://localhost:3001/api/recipes/enrich/status"
echo ""
echo "📖 For more details, see: SPOONACULAR_INTEGRATION.md"
echo ""
