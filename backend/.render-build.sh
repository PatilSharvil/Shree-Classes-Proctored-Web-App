#!/bin/bash
# Render build script - ensures native modules compile correctly

set -e

echo "=== Installing build dependencies ==="
# Install Python and build tools needed for native modules (better-sqlite3)
apk add --no-cache python3 make g++ gcc

echo "=== Installing npm dependencies ==="
npm ci --omit=dev

echo "=== Verifying better-sqlite3 build ==="
node -e "require('better-sqlite3'); console.log('better-sqlite3 loaded successfully');"

echo "=== Build complete ==="
