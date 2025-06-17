#!/bin/bash
set -e

echo "\n===== Running Jest Mock Coverage ====="
npm run test:jest:mock:coverage

echo "\n===== Running Jest Prod Coverage ====="
npm run test:jest:prod:coverage

echo "\n===== Jest Coverage Complete =====" 