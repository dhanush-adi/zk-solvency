#!/bin/bash
# Start all ZK-Solvency services in separate terminals
# Attempts to open backend and frontend in new terminal windows/tabs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== ZK-Solvency Demo Starter ==="
echo ""
echo "This script will attempt to open:"
echo "1. Backend (port 3001) in a new terminal"
echo "2. Frontend (port 3000) in a new terminal"
echo ""
echo "Make sure PostgreSQL and Redis are running!"
echo ""

# Check if services are already running
check_service() {
    local port=$1
    local name=$2
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  $name appears to be already running on port $port"
        return 0
    fi
    return 1
}

check_service 3001 "Backend"
check_service 3000 "Frontend"

echo ""
echo "Starting services..."
echo ""

# Start backend
"$SCRIPT_DIR/start-backend.sh"
sleep 2

# Start frontend  
"$SCRIPT_DIR/start-frontend.sh"

echo ""
echo "=== Services Starting ==="
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/zk-backend.log"
echo "  Frontend: tail -f /tmp/zk-frontend.log"
echo ""
echo "To stop all services: ./stop-all.sh"
echo ""
echo "To populate demo data, run:"
echo "  curl -X POST http://localhost:3001/api/proof/simulate -H 'Content-Type: application/json' -d '{\"accountCount\": 50}'"
echo ""
echo "Or use the demo reset script: ./reset-demo-data.sh"