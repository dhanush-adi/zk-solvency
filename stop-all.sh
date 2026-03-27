#!/bin/bash
echo "=== ZK-Solvency Service Stopper ==="
pkill -f "tsx" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
echo "All services stopped!"
echo "Note: PostgreSQL and Redis still running"
