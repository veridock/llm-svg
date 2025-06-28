#!/bin/bash
# LLM PWA SVG Launcher - One-liner setup
# Save as: launch-llm-pwa.sh
# Usage: chmod +x launch-llm-pwa.sh && ./launch-llm-pwa.sh

set -e  # Exit on error

echo "🤖 LLM PWA SVG Launcher"
echo "======================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if SVG exists
SVG_FILE="llm.pwa.svg"
PORT=${1:-8000}


# Function to check if port is available
check_port() {
    if command -v lsof > /dev/null 2>&1; then
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 1
        fi
    elif command -v netstat > /dev/null 2>&1; then
        if netstat -ln 2>/dev/null | grep ":$PORT " >/dev/null; then
            return 1
        fi
    fi
    return 0
}

# Find available port
while ! check_port; do
    PORT=$((PORT + 1))
    echo -e "${YELLOW}Port busy, trying $PORT...${NC}"
done

# Function to open browser
open_browser() {
    local url="http://localhost:$PORT/$SVG_FILE"
    echo -e "${BLUE}🌐 Opening: $url${NC}"

    if command -v xdg-open > /dev/null 2>&1; then
        xdg-open "$url" 2>/dev/null &
    elif command -v open > /dev/null 2>&1; then
        open "$url" 2>/dev/null &
    elif command -v start > /dev/null 2>&1; then
        start "$url" 2>/dev/null &
    else
        echo -e "${YELLOW}Please open: $url${NC}"
    fi
}

# Start server based on available tools
echo -e "${BLUE}🚀 Starting server on port $PORT...${NC}"

if command -v python3 > /dev/null 2>&1; then
    echo -e "${GREEN}Using Python3 server${NC}"
    open_browser
    echo -e "${GREEN}✅ Server running! Press Ctrl+C to stop${NC}"
    python3 -m http.server $PORT

elif command -v python > /dev/null 2>&1; then
    echo -e "${GREEN}Using Python server${NC}"
    open_browser
    echo -e "${GREEN}✅ Server running! Press Ctrl+C to stop${NC}"
    python -m http.server $PORT

elif command -v php > /dev/null 2>&1; then
    echo -e "${GREEN}Using PHP server${NC}"
    open_browser
    echo -e "${GREEN}✅ Server running! Press Ctrl+C to stop${NC}"
    php -S localhost:$PORT

elif command -v node > /dev/null 2>&1; then
    echo -e "${GREEN}Using Node.js server${NC}"
    open_browser
    echo -e "${GREEN}✅ Server running! Press Ctrl+C to stop${NC}"
    npx serve . -p $PORT

else
    echo -e "${RED}❌ No server available (need python3, php, or node)${NC}"
    echo -e "${YELLOW}💡 Install Python: apt install python3 (Linux) or brew install python3 (Mac)${NC}"
    exit 1
fi