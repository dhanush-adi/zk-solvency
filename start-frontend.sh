#!/bin/bash
# Start frontend in a new terminal window/tab
# Supports: GNOME Terminal, iTerm2, macOS Terminal, xterm, konsole

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "Starting ZK-Solvency Frontend..."
echo "Directory: $FRONTEND_DIR"

# Function to start in GNOME Terminal
start_gnome() {
    gnome-terminal --title="ZK-Solvency Frontend" --working-directory="$FRONTEND_DIR" -- bash -c "pnpm dev; exec bash" 2>/dev/null
}

# Function to start in iTerm2 (macOS)
start_iterm() {
    osascript <<EOF 2>/dev/null
        tell application "iTerm"
            activate
            set newWindow to (create window with default profile)
            tell current session of newWindow
                write text "cd '$FRONTEND_DIR' && pnpm dev"
            end tell
        end tell
EOF
}

# Function to start in macOS Terminal
start_macos_terminal() {
    osascript <<EOF 2>/dev/null
        tell application "Terminal"
            activate
            do script "cd '$FRONTEND_DIR' && pnpm dev"
        end tell
EOF
}

# Function to start in xterm
start_xterm() {
    xterm -title "ZK-Solvency Frontend" -e "cd '$FRONTEND_DIR' && pnpm dev; bash" &
}

# Function to start in konsole (KDE)
start_konsole() {
    konsole --new-tab -e bash -c "cd '$FRONTEND_DIR' && pnpm dev; exec bash" 2>/dev/null &
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
    echo "  cd $FRONTEND_DIR"
    echo "  pnpm dev"
    echo ""
    echo "Or start with: cd frontend && pnpm dev"
fi

echo "Frontend starting on http://localhost:3000"
echo "Logs: tail -f /tmp/zk-frontend.log"