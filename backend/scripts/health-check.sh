#!/bin/bash

# ZK-Solvency Health Check Script
# Comprehensive system health monitoring and validation
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
readonly FRONTEND_PORT=3000
readonly DEVNET_PORT=5050
readonly POSTGRES_PORT=5432
readonly REDIS_PORT=6379

# Health check functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# Check if a port is accessible
check_port() {
    local port=$1
    local service=$2
    local endpoint=${3:-""}
    
    if curl -s -f "http://localhost:$port$endpoint" >/dev/null 2>&1; then
        log "$service (port $port) ✓"
        return 0
    else
        log_error "$service (port $port) ✗"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    if command -v psql >/dev/null 2>&1; then
        if psql -h localhost -p $POSTGRES_PORT -U postgres -d zk_solvency_db -c "SELECT 1;" >/dev/null 2>&1; then
            log "PostgreSQL database ✓"
        else
            log_error "PostgreSQL database ✗"
            return 1
        fi
    else
        log_warn "PostgreSQL client not available for testing"
    fi
    
    return 0
}

# Check Redis connectivity
check_redis() {
    log_info "Checking Redis connectivity..."
    
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -p $REDIS_PORT ping >/dev/null 2>&1; then
            log "Redis ✓"
        else
            log_error "Redis ✗"
            return 1
        fi
    else
        log_warn "Redis CLI not available for testing"
    fi
    
    return 0
}

# Main health check
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    ZK-SOLVENCY HEALTH CHECK               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local all_healthy=true
    
    # Check core services
    log_info "Checking core services..."
    
    check_port $FRONTEND_PORT "Frontend Service" "/" || all_healthy=false
    check_port $BACKEND_PORT "Backend API" "/api/health" || all_healthy=false
    check_port $DEVNET_PORT "StarkNet Devnet" "/is_alive" || all_healthy=false
    
    echo ""
    log_info "Checking dependencies..."
    
    check_database || all_healthy=false
    check_redis || all_healthy=false
    
    echo ""
    
    if [[ "$all_healthy" == "true" ]]; then
        log "🎉 All systems healthy!"
        exit 0
    else
        log_error "❌ Some systems are not healthy"
        exit 1
    fi
}

main "$@"