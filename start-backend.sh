#!/bin/bash
# Start backend in a new terminal window/tab
# Supports: GNOME Terminal, iTerm2, macOS Terminal, xterm, konsole

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "Starting ZK-Solvency Backend..."
echo "Directory: $BACKEND_DIR"

# Function to start in GNOME Terminal
start_gnome() {
    gnome-terminal --title="ZK-Solvency Backend" --working-directory="$BACKEND_DIR" -- bash -c "npm run dev; exec bash" 2>/dev/null
}

# Function to start in iTerm2 (macOS)
start_iterm() {
    osascript <<EOF 2>/dev/null
        tell application "iTerm"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow
                write text "cd '$BACKEND_DIR' && npm run dev"
            end tell
        end tell
EOF
}

# Function to start in macOS Terminal
start_macos_terminal() {
    osascript <<EOF 2>/dev/null
        tell application "Terminal"
            activate
            do script "cd '$BACKEND_DIR' && npm run dev"
        end tell
EOF
}

# Function to start in xterm
start_xterm() {
    xterm -title "ZK-Solvency Backend" -e "cd '$BACKEND_DIR' && npm run dev; bash" &
}

# Function to start in konsole (KDE)
start_konsole() {
    konsole --new-tab -e bash -c "cd '$BACKEND_DIR' && npm run dev; exec bash" 2>/dev/null &
}

# Try different terminal emulators
if command -v gnome-terminal &> /dev/null; then
    echo "Opening in GNOME Terminal..."
    start_gnome
elif [[ "$TERM_PROGRAM" == "iTerm.app" ]] || command -v osascript &> /dev/null; then
    echo "Opening in iTerm2/Terminal..."
    if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
        start_iterm
    else
        start_macos_terminal
    fi
elif command -v xterm &> /dev/null; then
    echo "Opening in xterm..."
    start_xterm
elif command -v konsole &> /dev/null; then
    echo "Opening in konsole..."
    start_konsole
else
    echo "Could not detect terminal emulator."
    echo "Please run manually in a separate terminal:"
    echo "  cd $BACKEND_DIR"
    echo "  npm run dev"
    echo ""
    echo "Or start with: cd backend && npm run dev"
fi

echo "Backend starting on http://localhost:3001"
echo "Logs: tail -f /tmp/zk-backend.log"