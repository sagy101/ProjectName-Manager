#!/bin/bash

# Comprehensive Test Runner for ProjectName Manager
# This script runs both Jest unit tests and Playwright E2E tests

set -e  # Exit on any error

echo "🧪 Running comprehensive test suite..."
echo "============================================"
echo ""

# Step 1: Run Jest unit tests
echo "📋 Step 1/2: Running Jest unit tests..."
echo "----------------------------------------"
npm test
echo ""
echo "✅ Jest unit tests completed successfully!"
echo ""

# Step 2: Run Playwright E2E tests  
echo "📋 Step 2/2: Running Playwright E2E tests..."
echo "----------------------------------------------"
npm run test:e2e
echo ""
echo "✅ Playwright E2E tests completed successfully!"
echo ""

# Success message
echo "🎉 All tests passed successfully!"
echo "============================================"
echo "📊 Test Summary:"
echo "   • Jest unit tests: ✅ PASSED"
echo "   • Playwright E2E tests: ✅ PASSED"
echo "============================================" 