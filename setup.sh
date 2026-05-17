#!/usr/bin/env bash
#
# One-command setup for the data table project.
# Run with: ./setup.sh   (or: bash setup.sh)
#
# What it does:
#   1. Check that Node.js is installed and is at least version 18.
#   2. Run npm install to fetch every dependency listed in package.json.
#   3. Tell the user how to start the dev server.

set -e

echo ""
echo "Setting up the React data table project..."
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo ""
  echo "Install it before running this script:"
  echo "  - macOS:           brew install node"
  echo "  - Windows / Linux: https://nodejs.org/en/download"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node.js version $(node -v) is too old. This project needs Node 18 or newer."
  exit 1
fi

echo "Node.js $(node -v) found."

# 2. Install dependencies
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed (it normally ships with Node.js)."
  exit 1
fi

echo "Installing dependencies (this can take a minute on first run)..."
npm install

# 3. Print next steps
echo ""
echo "Done. To start the app:"
echo "  npm run dev"
echo ""
echo "To run the tests:"
echo "  npm test"
echo ""
