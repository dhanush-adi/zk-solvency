#!/bin/bash

# ZK-Solvency Demo Data Reset Script
# Initializes the system with demonstration data for testing and development
# Version: 1.0.0

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Configuration
readonly BACKEND_PORT=3001

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# Wait for backend to be ready
wait_for_backend() {
    log_info "Waiting for backend to be ready..."
    local attempts=0
    local max_attempts=30
    
    while ! curl -s "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; do
        sleep 2
        ((attempts++))
        if [[ $attempts -gt $max_attempts ]]; then
            log_error "Backend not available after ${max_attempts} attempts"
            exit 1
        fi
    done
    
    log "Backend is ready ✓"
}

# Reset demo data via API
reset_demo_data() {
    log_info "Resetting demo data..."
    
    # Call the backend API to simulate demo data
    if curl -s -X POST "http://localhost:$BACKEND_PORT/api/solvency/simulate" \
        -H "Content-Type: application/json" \
        -d '{"accountCount": 1000}' >/dev/null 2>&1; then
        log "Demo data reset complete ✓"
    else
        log_error "Failed to reset demo data"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                   ZK-SOLVENCY DEMO RESET                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    wait_for_backend
    reset_demo_data
    
    echo ""
    log "🎉 Demo data has been reset successfully!"
    log_info "You can now use the dashboard at http://localhost:3000"
    echo ""
}

main "$@"