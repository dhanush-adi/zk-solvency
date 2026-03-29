    #!/bin/bash

# ZK-Solvency Professional Start Script
# Intelligent system launcher with dependency verification, auto-install, and health monitoring
# Version: 1.0.0

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Configuration
readonly PROJECT_NAME="ZK-Solvency"
readonly LOG_FILE="/tmp/zk-solvency-startup.log"
readonly PID_FILE="/tmp/zk-solvency.pid"
readonly REQUIRED_NODE_VERSION="20"
readonly BACKEND_PORT=3001
readonly FRONTEND_PORT=3000
readonly DEVNET_PORT=5050
readonly POSTGRES_PORT=5432
readonly REDIS_PORT=6379
readonly HEALTH_CHECK_TIMEOUT=30
readonly MAX_STARTUP_TIME=120

# Process tracking
declare -A PROCESS_PIDS=()
declare -A COMPONENT_STATUS=()

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Cleanup function
cleanup() {
    log_info "Cleanup initiated..."
    for pid in "${PROCESS_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping process $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    rm -f "$PID_FILE" 2>/dev/null || true
    exit 0
}

trap cleanup EXIT INT TERM

# Banner
print_banner() {
    echo -e "${PURPLE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    ZK-SOLVENCY                             ║"
    echo "║              Professional Start Script                     ║"
    echo "║                                                            ║"
    echo "║  Privacy-Preserving Solvency Intelligence Platform        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# System requirements check
check_system_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check operating system
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "MacOS detected"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Linux detected"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        log_info "Windows with WSL/Cygwin detected"
    else
        log_warn "Unknown operating system: $OSTYPE"
    fi
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_mem=$(free -m | awk '/^Mem:/{print $7}')
        if [[ $available_mem -lt 2048 ]]; then
            log_warn "Low available memory: ${available_mem}MB (recommended: 4GB+)"
        else
            log_info "Available memory: ${available_mem}MB ✓"
        fi
    fi
    
    # Check disk space
    local available_space=$(df . | tail -1 | awk '{print $4}')
    local available_gb=$((available_space / 1024 / 1024))
    if [[ $available_gb -lt 5 ]]; then
        log_warn "Low disk space: ${available_gb}GB (recommended: 10GB+)"
    else
        log_info "Available disk space: ${available_gb}GB ✓"
    fi
}

# Check if port is available
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_error "Port $port is already in use (required for $service)"
        return 1
    fi
    return 0
}

# Check all required ports
check_ports() {
    log "🔌 Checking port availability..."
    
    local ports_ok=true
    
    check_port $FRONTEND_PORT "Frontend" || ports_ok=false
    check_port $BACKEND_PORT "Backend" || ports_ok=false
    check_port $DEVNET_PORT "StarkNet Devnet" || ports_ok=false
    check_port $POSTGRES_PORT "PostgreSQL" || ports_ok=false
    check_port $REDIS_PORT "Redis" || ports_ok=false
    
    if [[ "$ports_ok" == "false" ]]; then
        log_error "Some required ports are in use. Run './stop.sh' to clean up or manually stop conflicting services."
        exit 1
    fi
    
    log "All required ports available ✓"
}

# Check Node.js version
check_node_version() {
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed. Please install Node.js $REQUIRED_NODE_VERSION+ from https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d 'v' -f2 | cut -d '.' -f1)
    if [[ $node_version -lt $REQUIRED_NODE_VERSION ]]; then
        log_error "Node.js version $node_version detected. Required: $REQUIRED_NODE_VERSION+"
        exit 1
    fi
    
    log_info "Node.js version $(node --version) ✓"
}

# Check package manager
check_package_manager() {
    if command -v npm >/dev/null 2>&1; then
        log_info "NPM version $(npm --version) ✓"
        return 0
    fi
    
    log_error "NPM not found. Please install Node.js with NPM."
    exit 1
}

# Install dependencies for a component
install_dependencies() {
    local component=$1
    local path=$2
    
    if [[ ! -f "$path/package.json" ]]; then
        log_error "No package.json found in $path"
        return 1
    fi
    
    log "📦 Installing dependencies for $component..."
    
    pushd "$path" >/dev/null
    
    if [[ -f "package-lock.json" ]]; then
        npm ci --silent || npm install --silent
    else
        npm install --silent
    fi
    
    popd >/dev/null
    
    log_info "$component dependencies installed ✓"
}

# Check and install all dependencies
setup_dependencies() {
    log "🚀 Setting up project dependencies..."
    
    # Install root dependencies if package.json exists
    if [[ -f "package.json" ]]; then
        install_dependencies "Root" "."
    fi
    
    # Install component dependencies
    install_dependencies "Frontend" "frontend"
    install_dependencies "Backend" "backend"
    install_dependencies "Layer3-4" "layer3-4"
}

# Database setup and verification
setup_databases() {
    log "🗄️  Setting up databases..."
    
    # Check PostgreSQL
    if ! command -v psql >/dev/null 2>&1; then
        log_warn "PostgreSQL client not found. Database setup may be manual."
    else
        log_info "PostgreSQL client available ✓"
    fi
    
    # Check Redis
    if ! command -v redis-cli >/dev/null 2>&1; then
        log_warn "Redis CLI not found. Redis setup may be manual."
    else
        log_info "Redis CLI available ✓"
    fi
    
    # Run database migrations if possible
    if [[ -f "backend/drizzle.config.ts" ]]; then
        log_info "Running database migrations..."
        pushd backend >/dev/null
        npm run db:migrate --silent 2>/dev/null || log_warn "Database migration failed (database may not be running)"
        popd >/dev/null
    fi
}

# Start StarkNet devnet
start_devnet() {
    log "⛓️  Starting StarkNet Devnet..."
    
    # Kill any existing devnet processes
    pkill -f starknet-devnet 2>/dev/null || true
    sleep 2
    
    # Start devnet in background
    if command -v starknet-devnet >/dev/null 2>&1; then
        starknet-devnet --host 127.0.0.1 --port $DEVNET_PORT --seed 0 --accounts 10 --initial-balance 1000 >/dev/null 2>&1 &
        local devnet_pid=$!
        PROCESS_PIDS["devnet"]=$devnet_pid
        
        # Wait for devnet to be ready
        local attempts=0
        while ! curl -s "http://localhost:$DEVNET_PORT/is_alive" >/dev/null 2>&1; do
            sleep 1
            ((attempts++))
            if [[ $attempts -gt 30 ]]; then
                log_error "StarkNet Devnet failed to start"
                return 1
            fi
        done
        
        log_info "StarkNet Devnet started on port $DEVNET_PORT ✓"
        COMPONENT_STATUS["devnet"]="running"
        return 0
    else
        log_warn "starknet-devnet not found. Install with: pip install starknet-devnet"
        COMPONENT_STATUS["devnet"]="manual"
        return 0
    fi
}

# Start backend service
start_backend() {
    log "🔧 Starting Backend Service..."
    
    pushd backend >/dev/null
    
    # Create logs directory
    mkdir -p logs
    
    # Start backend
    npm run dev >logs/backend.log 2>&1 &
    local backend_pid=$!
    PROCESS_PIDS["backend"]=$backend_pid
    
    popd >/dev/null
    
    # Wait for backend to be ready
    local attempts=0
    while ! curl -s "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; do
        sleep 2
        ((attempts++))
        if [[ $attempts -gt $HEALTH_CHECK_TIMEOUT ]]; then
            log_error "Backend service failed to start"
            return 1
        fi
    done
    
    log_info "Backend service started on port $BACKEND_PORT ✓"
    COMPONENT_STATUS["backend"]="running"
    return 0
}

# Start frontend service
start_frontend() {
    log "🎨 Starting Frontend Service..."
    
    pushd frontend >/dev/null
    
    # Create logs directory
    mkdir -p logs
    
    # Start frontend
    npm run dev >logs/frontend.log 2>&1 &
    local frontend_pid=$!
    PROCESS_PIDS["frontend"]=$frontend_pid
    
    popd >/dev/null
    
    # Wait for frontend to be ready
    local attempts=0
    while ! curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; do
        sleep 2
        ((attempts++))
        if [[ $attempts -gt $HEALTH_CHECK_TIMEOUT ]]; then
            log_error "Frontend service failed to start"
            return 1
        fi
    done
    
    log_info "Frontend service started on port $FRONTEND_PORT ✓"
    COMPONENT_STATUS["frontend"]="running"
    return 0
}

# Deploy smart contracts
deploy_contracts() {
    log "📜 Deploying Smart Contracts..."
    
    if [[ "${COMPONENT_STATUS["devnet"]}" == "running" ]]; then
        pushd layer3-4 >/dev/null
        
        # Deploy contracts
        if npm run deploy --silent 2>/dev/null; then
            log_info "Smart contracts deployed ✓"
        else
            log_warn "Contract deployment failed (may need manual deployment)"
        fi
        
        popd >/dev/null
    else
        log_warn "Skipping contract deployment (devnet not running)"
    fi
}

# Reset demo data
reset_demo_data() {
    log "🔄 Resetting demo data..."
    
    if [[ -f "backend/scripts/reset-demo-data.sh" ]]; then
        bash backend/scripts/reset-demo-data.sh >/dev/null 2>&1 || log_warn "Demo data reset failed"
        log_info "Demo data reset complete ✓"
    else
        log_warn "Demo data reset script not found"
    fi
}

# Open browser windows
open_browser() {
    log "🌐 Opening browser windows..."
    
    sleep 3 # Allow services to fully initialize
    
    # Detect platform and open browser
    if command -v open >/dev/null 2>&1; then
        # macOS
        open "http://localhost:$FRONTEND_PORT" 2>/dev/null &
        log_info "Opened dashboard in browser (macOS) ✓"
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux
        xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null &
        log_info "Opened dashboard in browser (Linux) ✓"
    elif command -v cmd.exe >/dev/null 2>&1; then
        # Windows/WSL
        cmd.exe /c start "http://localhost:$FRONTEND_PORT" 2>/dev/null &
        log_info "Opened dashboard in browser (Windows) ✓"
    else
        log_info "Manual: Open http://localhost:$FRONTEND_PORT in your browser"
    fi
}

# Final health check
perform_health_check() {
    log "🏥 Performing final health check..."
    
    local all_healthy=true
    
    # Check frontend
    if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        log_info "Frontend health check ✓"
    else
        log_error "Frontend health check failed"
        all_healthy=false
    fi
    
    # Check backend
    if curl -s "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
        log_info "Backend health check ✓"
    else
        log_error "Backend health check failed"
        all_healthy=false
    fi
    
    # Check devnet
    if [[ "${COMPONENT_STATUS["devnet"]}" == "running" ]]; then
        if curl -s "http://localhost:$DEVNET_PORT/is_alive" >/dev/null 2>&1; then
            log_info "StarkNet Devnet health check ✓"
        else
            log_error "StarkNet Devnet health check failed"
            all_healthy=false
        fi
    fi
    
    return $([ "$all_healthy" == "true" ])
}

# Save process IDs
save_process_info() {
    log_info "Saving process information..."
    
    {
        echo "# ZK-Solvency Process IDs - $(date)"
        for component in "${!PROCESS_PIDS[@]}"; do
            echo "${component}=${PROCESS_PIDS[$component]}"
        done
    } > "$PID_FILE"
    
    chmod 600 "$PID_FILE"
}

# Print status summary
print_status_summary() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                        🚀 STARTUP COMPLETE                 ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📊 Service Status:${NC}"
    echo -e "   Frontend:    http://localhost:$FRONTEND_PORT"
    echo -e "   Backend API: http://localhost:$BACKEND_PORT"
    if [[ "${COMPONENT_STATUS["devnet"]}" == "running" ]]; then
        echo -e "   StarkNet:    http://localhost:$DEVNET_PORT"
    fi
    echo ""
    echo -e "${YELLOW}📋 Quick Commands:${NC}"
    echo -e "   Stop all services: ${BLUE}./stop.sh${NC}"
    echo -e "   View logs: ${BLUE}tail -f /tmp/zk-solvency-startup.log${NC}"
    echo -e "   Health check: ${BLUE}curl http://localhost:$BACKEND_PORT/api/health${NC}"
    echo ""
    echo -e "${GREEN}🎉 ZK-Solvency is now running! Happy proving!${NC}"
    echo ""
}

# Main execution flow
main() {
    # Initialize log file
    echo "ZK-Solvency Startup Log - $(date)" > "$LOG_FILE"
    
    print_banner
    check_root
    
    log "🚀 Starting $PROJECT_NAME Professional Setup..."
    
    # Pre-flight checks
    check_system_requirements
    check_node_version
    check_package_manager
    check_ports
    
    # Setup phase
    setup_dependencies
    setup_databases
    
    # Service startup phase
    start_devnet
    start_backend
    start_frontend
    
    # Post-startup phase
    deploy_contracts
    reset_demo_data
    
    # Health verification
    if perform_health_check; then
        save_process_info
        open_browser
        print_status_summary
    else
        log_error "Health check failed. Check logs for details."
        exit 1
    fi
    
    # Keep script running to maintain process tracking
    log_info "Monitoring services... (Press Ctrl+C to stop all services)"
    wait
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi