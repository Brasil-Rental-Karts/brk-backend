#!/bin/sh
set -e

echo "Starting build process..."

# Clean up previous build
rm -rf dist

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Check if dist/index.js exists
if [ -f "dist/index.js" ]; then
  echo "Build successful! dist/index.js was created."
else
  echo "Build failed! dist/index.js was not created."
  exit 1
fi

echo "Build completed successfully." 