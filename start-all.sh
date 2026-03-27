#!/bin/bash
echo "=== ZK-Solvency Service Starter ==="
pkill -f "tsx" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 1
cd /home/cobra/projects/zk-solvency/backend && nohup npm run dev > /tmp/zk-backend.log 2>&1 &
echo "Backend started"
cd /home/cobra/projects/zk-solvency/frontend && nohup pnpm dev > /tmp/zk-frontend.log 2>&1 &
echo "Frontend started"
echo ""
echo "Services running:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Logs: tail -f /tmp/zk-backend.log or /tmp/zk-frontend.log"
echo "To stop: ./stop-all.sh"
