#!/bin/bash
set -e

# ASCIIFlow Development Server Startup Script
# This project uses Bazel (version 7.0.2) as its build system
#
# Usage: ./run.sh [OPTIONS]
#   -p, --port PORT    Set the dev server port (default: 8080)
#   -h, --help         Show this help message

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default port
PORT="${PORT:-8080}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./run.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --port PORT    Set the dev server port (default: 8080)"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "You can also set the PORT environment variable:"
            echo "  PORT=3000 ./run.sh"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🎨 ASCIIFlow Development Server${NC}"
echo "================================="

# Check for Bazelisk or Bazel
if command -v bazelisk &> /dev/null; then
    BAZEL_CMD="bazelisk"
    echo -e "${GREEN}✓${NC} Found bazelisk"
elif command -v bazel &> /dev/null; then
    BAZEL_CMD="bazel"
    echo -e "${GREEN}✓${NC} Found bazel"
else
    echo -e "${RED}✗${NC} Bazel not found!"
    echo ""
    echo "Please install Bazelisk (recommended):"
    echo "  npm install -g @bazel/bazelisk"
    echo "  # or"
    echo "  pnpm add -g @bazel/bazelisk"
    echo ""
    exit 1
fi

# Check for ibazel (optional, for live reloading)
USE_IBAZEL=false
if command -v ibazel &> /dev/null; then
    USE_IBAZEL=true
    echo -e "${GREEN}✓${NC} Found ibazel (live reloading enabled)"
else
    echo -e "${YELLOW}!${NC} ibazel not found (live reloading disabled)"
    echo "  Install with: npm install -g @bazel/ibazel"
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}✗${NC} pnpm not found!"
    echo "  Install with: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✓${NC} Found pnpm"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
fi

echo ""
echo -e "${GREEN}Starting development server...${NC}"
echo "The server will be available at: http://localhost:${PORT}"
echo ""

# Use ibazel for live reloading if available, otherwise use bazel
if [ "$USE_IBAZEL" = true ]; then
    echo "Running with ibazel (live reloading enabled)"
    echo "Press Ctrl+C to stop"
    echo ""
    ibazel run client:devserver -- --port "$PORT"
else
    echo "Running with bazel (no live reloading)"
    echo "Press Ctrl+C to stop"
    echo ""
    $BAZEL_CMD run client:devserver -- --port "$PORT"
fi

