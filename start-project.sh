#!/bin/bash

# Colors for better visibility
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

echo "${YELLOW}Starting the entire project locally...${NC}"

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"

# Check for required tools
if ! command -v npm &> /dev/null
then
    echo "${RED}Error: npm is not installed. Install it first (e.g., via nvm or Homebrew)!${NC}"
    exit 1
fi

if ! command -v node &> /dev/null
then
    echo "${RED}Error: node is not installed. Install it first (e.g., via nvm or Homebrew)!${NC}"
    exit 1
fi

# Function to run a command in a new Terminal window, handling AppleScript quoting
run_in_new_terminal() {
    local service_name="$1"
    local target_dir="$2"
    local command_to_run="$3"

    echo "${GREEN}Starting $service_name...${NC}"

    local escaped_target_dir=$(printf %q "$target_dir")

    # Construct the full shell command string for the new terminal

    local applescript_safe_shell_command=$(osascript -e "return quoted form of \"$full_shell_command\"")

    osascript <<EOF
tell application "Terminal"
    do script $applescript_safe_shell_command
end tell
EOF
}

# Start Backend services
run_in_new_terminal "Gateway Microservice" "$SCRIPT_DIR/Backend/GatewayMicroservice" "npm install && npm run dev"
run_in_new_terminal "Auth Microservice" "$SCRIPT_DIR/Backend/AuthMicroservice" "npm install && npm run dev"
run_in_new_terminal "User Microservice" "$SCRIPT_DIR/Backend/UserMicroservice" "npm install && npm run dev"
run_in_new_terminal "Bridge Microservice" "$SCRIPT_DIR/Backend/BridgeMicroservice" "poetry run uvicorn main:app --reload --port 3003"

# Wait a bit to ensure services start in the correct order
echo "${YELLOW}Waiting 5 seconds for services to start...${NC}"
sleep 5

# Start Frontend
run_in_new_terminal "Frontend" "$SCRIPT_DIR/Frontend" "npm install && npm run dev"

echo "${YELLOW}All services have been started. Close all command windows to stop the project.${NC}"
