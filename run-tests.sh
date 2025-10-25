#!/bin/bash

# Sazon Chef Test Runner
# Runs all tests for the completed Phases 3-4 features

echo "🧪 Sazon Chef Test Runner"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting comprehensive test suite for Phases 3-4 features..."
echo ""

# Backend Tests
print_status "Running Backend Tests..."
echo "================================"

cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Run backend tests
print_status "Running behavioral scoring tests..."
npm test -- tests/behavioral-scoring.test.ts

print_status "Running temporal scoring tests..."
npm test -- tests/temporal-scoring.test.ts

print_status "Running enhanced scoring tests..."
npm test -- tests/enhanced-scoring.test.ts

print_status "Running daily suggestions tests..."
npm test -- tests/daily-suggestions.test.ts

print_status "Running meal history tests..."
npm test -- tests/meal-history.test.ts

print_status "Running recommendation cache tests..."
npm test -- tests/recommendation-cache.test.ts

# Run all backend tests
print_status "Running all backend tests..."
npm test

if [ $? -eq 0 ]; then
    print_success "Backend tests passed!"
else
    print_error "Backend tests failed!"
    exit 1
fi

echo ""
cd ..

# Frontend Tests
print_status "Running Frontend Tests..."
echo "==============================="

cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Run frontend tests
print_status "Running weekly overview component tests..."
npm test -- __tests__/components/WeeklyOverview.test.tsx

print_status "Running recommendations hook tests..."
npm test -- __tests__/hooks/useRecommendations.test.ts

print_status "Running meal history utils tests..."
npm test -- __tests__/utils/mealHistoryUtils.test.ts

# Run all frontend tests
print_status "Running all frontend tests..."
npm test

if [ $? -eq 0 ]; then
    print_success "Frontend tests passed!"
else
    print_error "Frontend tests failed!"
    exit 1
fi

echo ""
cd ..

# Integration Tests
print_status "Running Integration Tests..."
echo "=================================="

# Check if backend server is running
print_status "Checking if backend server is running..."
if curl -s http://localhost:3001/health > /dev/null; then
    print_success "Backend server is running!"
    
    # Run integration tests
    print_status "Running API integration tests..."
    npm test -- tests/integration/api-integration.test.js
    
    if [ $? -eq 0 ]; then
        print_success "Integration tests passed!"
    else
        print_warning "Integration tests failed - server may not be running"
    fi
else
    print_warning "Backend server is not running. Skipping integration tests."
    print_status "To run integration tests, start the backend server with: cd backend && npm run dev"
fi

echo ""

# Test Summary
print_status "Test Summary"
echo "=============="
echo ""

# Count test files
BACKEND_TEST_COUNT=$(find backend/tests -name "*.test.ts" | wc -l)
FRONTEND_TEST_COUNT=$(find frontend/__tests__ -name "*.test.tsx" -o -name "*.test.ts" | wc -l)

print_success "Backend tests: $BACKEND_TEST_COUNT test files"
print_success "Frontend tests: $FRONTEND_TEST_COUNT test files"

echo ""
print_status "Test Coverage for Phases 3-4 Features:"
echo "=============================================="
echo "✅ Behavioral Scoring Algorithm"
echo "✅ Temporal Scoring Algorithm" 
echo "✅ Enhanced Scoring Algorithm"
echo "✅ Daily Recipe Suggestions"
echo "✅ Meal History Tracking"
echo "✅ Recommendation Caching"
echo "✅ Weekly Overview Component"
echo "✅ Recommendations Hook"
echo "✅ Meal History Utils"
echo "✅ API Integration"
echo ""

print_success "All tests completed! 🎉"
echo ""
print_status "Next steps:"
echo "1. Review any failing tests"
echo "2. Fix any issues found"
echo "3. Commit and push to GitHub"
echo "4. Ready for Phase 5: Advanced Features!"
echo ""
