#!/bin/bash

# Comprehensive Test Runner for ProjectName Manager
# This script runs both Jest unit tests and Playwright E2E tests
# Usage: ./run-all-tests.sh [--no-report]

set -e  # Exit on any error

# Parse command line arguments
NO_REPORT=false
if [[ "$1" == "--no-report" ]]; then
    NO_REPORT=true
fi

echo "🧪 Running comprehensive test suite..."
echo "============================================"
echo ""

# Step 1: Run Jest unit tests
echo "📋 Step 1/2: Running Jest unit tests..."
echo "----------------------------------------"
if ! npm test; then
    echo ""
    echo "❌ Jest unit tests FAILED!"
    echo "============================================"
    echo "🚫 Stopping execution - E2E tests will not run"
    echo "============================================"
    exit 1
fi
echo ""
echo "✅ Jest unit tests completed successfully!"
echo ""

# Step 2: Run Playwright E2E tests  
echo "📋 Step 2/2: Running Playwright E2E tests..."
echo "----------------------------------------------"
if [[ "$NO_REPORT" == "true" ]]; then
    # Run E2E tests without opening HTML report server
    if ! npm run test:e2e -- --reporter=list; then
        echo ""
        echo "❌ Playwright E2E tests FAILED!"
        echo "============================================"
        exit 1
    fi
else
    # Run E2E tests with HTML report (default behavior)
    if ! npm run test:e2e; then
        echo ""
        echo "❌ Playwright E2E tests FAILED!"
        echo "============================================"
        exit 1
    fi
fi
echo ""
echo "✅ Playwright E2E tests completed successfully!"
echo ""

# Success message
echo "🎉 All tests passed successfully!"
echo "============================================"
echo "📊 Test Summary:"
echo "   • Jest unit tests: ✅ PASSED"
echo "   • Playwright E2E tests: ✅ PASSED"
if [[ "$NO_REPORT" == "true" ]]; then
    echo "   • HTML report: 🚫 SKIPPED"
else
    echo "   • HTML report: 📊 AVAILABLE"
fi
echo "============================================" 