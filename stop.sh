#!/bin/bash

# ZK-Solvency Professional Stop Script
# Graceful shutdown manager with cleanup and resource management
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
readonly LOG_FILE="/tmp/zk-solvency-shutdown.log"
readonly PID_FILE="/tmp/zk-solvency.pid"
readonly FRONTEND_PORT=3000
readonly BACKEND_PORT=3001
readonly DEVNET_PORT=5050
readonly POSTGRES_PORT=5432
readonly REDIS_PORT=6379
readonly GRACEFUL_TIMEOUT=10
readonly FORCE_TIMEOUT=30

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

# Banner
print_banner() {
    echo -e "${PURPLE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    ZK-SOLVENCY                             ║"
    echo "║              Professional Stop Script                      ║"
    echo "║                                                            ║"
    echo "║         Graceful Shutdown & Resource Cleanup              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Kill process by PID with timeout
kill_process_graceful() {
    local pid=$1
    local name=$2
    local timeout=${3:-$GRACEFUL_TIMEOUT}
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log_info "$name (PID: $pid) is not running"
        return 0
    fi
    
    log_info "Stopping $name (PID: $pid)..."
    
    # Send TERM signal for graceful shutdown
    if kill -TERM "$pid" 2>/dev/null; then
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [[ $count -lt $timeout ]]; do
            sleep 1
            ((count++))
        done
        
        # Check if process stopped gracefully
        if ! kill -0 "$pid" 2>/dev/null; then
            log_info "$name stopped gracefully ✓"
            return 0
        else
            log_warn "$name did not stop gracefully, forcing..."
            if kill -KILL "$pid" 2>/dev/null; then
                sleep 2
                if ! kill -0 "$pid" 2>/dev/null; then
                    log_info "$name force stopped ✓"
                    return 0
                else
                    log_error "Failed to stop $name"
                    return 1
                fi
            fi
        fi
    else
        log_warn "Could not send signal to $name"
        return 1
    fi
}

# Kill processes by port
kill_by_port() {
    local port=$1
    local service_name=$2
    
    log_info "Checking port $port for $service_name..."
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        for pid in $pids; do
            local process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            kill_process_graceful "$pid" "$service_name ($process_name)" $GRACEFUL_TIMEOUT
        done
    else
        log_info "No processes found on port $port"
    fi
}

# Stop processes from PID file
stop_tracked_processes() {
    if [[ ! -f "$PID_FILE" ]]; then
        log_warn "PID file not found: $PID_FILE"
        return 0
    fi
    
    log "📋 Stopping tracked processes..."
    
    while IFS='=' read -r component pid || [[ -n "$component" ]]; do
        # Skip comments and empty lines
        [[ "$component" =~ ^#.*$ ]] && continue
        [[ -z "$component" ]] && continue
        
        if [[ -n "$pid" && "$pid" =~ ^[0-9]+$ ]]; then
            kill_process_graceful "$pid" "$component" $GRACEFUL_TIMEOUT
        fi
    done < "$PID_FILE"
}

# Stop processes by name pattern
stop_by_pattern() {
    local pattern=$1
    local description=$2
    
    log_info "Stopping $description..."
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        for pid in $pids; do
            local cmd=$(ps -p "$pid" -o args= 2>/dev/null || echo "unknown command")
            kill_process_graceful "$pid" "$description ($cmd)" $GRACEFUL_TIMEOUT
        done
    else
        log_info "No $description processes found"
    fi
}

# Clean up temporary files and directories
cleanup_files() {
    log "🧹 Cleaning up temporary files..."
    
    # Remove PID file
    if [[ -f "$PID_FILE" ]]; then
        rm -f "$PID_FILE"
        log_info "Removed PID file ✓"
    fi
    
    # Clean up log files (keep recent ones)
    local log_dirs=(
        "backend/logs"
        "frontend/logs"
        "layer3-4/logs"
        "frontend/.next"
        "backend/dist"
    )
    
    for log_dir in "${log_dirs[@]}"; do
        if [[ -d "$log_dir" ]]; then
            # Keep recent log files, remove old ones
            find "$log_dir" -name "*.log" -mtime +7 -delete 2>/dev/null || true
            log_info "Cleaned old logs in $log_dir ✓"
        fi
    done
    
    # Clean up temporary build artifacts
    local temp_patterns=(
        "*.tmp"
        "*.lock.tmp"
        ".DS_Store"
        "Thumbs.db"
    )
    
    for pattern in "${temp_patterns[@]}"; do
        find . -name "$pattern" -delete 2>/dev/null || true
    done
    
    log_info "Temporary files cleaned ✓"
}

# Clean up network resources
cleanup_network() {
    log "🌐 Cleaning up network resources..."
    
    # Clear any stuck ports
    local ports=($FRONTEND_PORT $BACKEND_PORT $DEVNET_PORT)
    
    for port in "${ports[@]}"; do
        # Force close any remaining connections on the port
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            log_warn "Force closing remaining connections on port $port"
            echo "$pids" | xargs kill -KILL 2>/dev/null || true
        fi
    done
    
    # Clear any socket files
    find /tmp -name "*zk-solvency*" -type s -delete 2>/dev/null || true
    
    log_info "Network resources cleaned ✓"
}

# Stop Node.js processes
stop_nodejs_processes() {
    log "📦 Stopping Node.js processes..."
    
    # Stop specific Node.js processes related to the project
    local node_patterns=(
        "next.*dev"
        "next.*start"
        "node.*backend"
        "npm.*run.*dev"
        "npm.*run.*start"
        "tsx.*watch"
        "nodemon"
    )
    
    for pattern in "${node_patterns[@]}"; do
        stop_by_pattern "$pattern" "Node.js ($pattern)"
    done
}

# Stop StarkNet devnet
stop_devnet() {
    log "⛓️  Stopping StarkNet Devnet..."
    
    local devnet_patterns=(
        "starknet-devnet"
        "starkware.*devnet"
        "python.*devnet"
    )
    
    for pattern in "${devnet_patterns[@]}"; do
        stop_by_pattern "$pattern" "StarkNet Devnet ($pattern)"
    done
    
    # Also check the specific port
    kill_by_port $DEVNET_PORT "StarkNet Devnet"
}

# Comprehensive service shutdown
stop_all_services() {
    log "🛑 Initiating comprehensive service shutdown..."
    
    # Stop tracked processes first (most reliable)
    stop_tracked_processes
    
    # Stop by specific ports
    kill_by_port $FRONTEND_PORT "Frontend Service"
    kill_by_port $BACKEND_PORT "Backend Service"
    
    # Stop devnet
    stop_devnet
    
    # Stop Node.js processes
    stop_nodejs_processes
    
    # Generic cleanup patterns
    stop_by_pattern "zk-solvency" "ZK-Solvency processes"
    stop_by_pattern "layer3-4" "Layer3-4 processes"
}

# Verify all processes are stopped
verify_shutdown() {
    log "✅ Verifying shutdown completion..."
    
    local ports_to_check=($FRONTEND_PORT $BACKEND_PORT $DEVNET_PORT)
    local active_ports=()
    
    for port in "${ports_to_check[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            active_ports+=($port)
            log_warn "Port $port is still in use"
        fi
    done
    
    # Check for any remaining zk-solvency processes
    local remaining_procs=$(pgrep -f "zk-solvency\|next.*dev\|starknet-devnet" 2>/dev/null | wc -l || echo "0")
    
    if [[ ${#active_ports[@]} -eq 0 && $remaining_procs -eq 0 ]]; then
        log "All services stopped successfully ✓"
        return 0
    else
        log_warn "Some processes may still be running:"
        if [[ ${#active_ports[@]} -gt 0 ]]; then
            log_warn "Active ports: ${active_ports[*]}"
        fi
        if [[ $remaining_procs -gt 0 ]]; then
            log_warn "Remaining processes: $remaining_procs"
        fi
        return 1
    fi
}

# Force shutdown (nuclear option)
force_shutdown() {
    log_warn "Initiating force shutdown..."
    
    # Kill all Node.js processes owned by current user
    pkill -f "node" 2>/dev/null || true
    
    # Kill all npm processes
    pkill -f "npm" 2>/dev/null || true
    
    # Kill all processes on our ports
    for port in $FRONTEND_PORT $BACKEND_PORT $DEVNET_PORT; do
        fuser -k $port/tcp 2>/dev/null || true
    done
    
    # Wait a moment
    sleep 3
    
    log_warn "Force shutdown complete"
}

# Display current status
show_status() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                     📊 CURRENT STATUS                      ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local ports=($FRONTEND_PORT $BACKEND_PORT $DEVNET_PORT)
    local port_names=("Frontend" "Backend" "StarkNet Devnet")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
            echo -e "   ${RED}●${NC} $name (Port $port) - ${RED}Running${NC} (PID: $pid)"
        else
            echo -e "   ${GREEN}○${NC} $name (Port $port) - ${GREEN}Stopped${NC}"
        fi
    done
    
    echo ""
    
    # Show any zk-solvency related processes
    local procs=$(pgrep -f "zk-solvency\|next.*dev\|starknet-devnet" 2>/dev/null || true)
    if [[ -n "$procs" ]]; then
        echo -e "${YELLOW}Active ZK-Solvency processes:${NC}"
        ps -p $procs -o pid,ppid,cmd 2>/dev/null || true
    else
        echo -e "${GREEN}No ZK-Solvency processes running${NC}"
    fi
    
    echo ""
}

# Print final summary
print_summary() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    🛑 SHUTDOWN COMPLETE                    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📝 Summary:${NC}"
    echo -e "   All ZK-Solvency services have been stopped"
    echo -e "   Temporary files cleaned up"
    echo -e "   Network resources released"
    echo ""
    echo -e "${BLUE}📋 Quick Commands:${NC}"
    echo -e "   Start services: ${GREEN}./start.sh${NC}"
    echo -e "   Check status: ${BLUE}./stop.sh --status${NC}"
    echo -e "   View logs: ${BLUE}tail -f /tmp/zk-solvency-shutdown.log${NC}"
    echo ""
    echo -e "${GREEN}✨ ZK-Solvency shutdown complete. Ready for restart!${NC}"
    echo ""
}

# Handle command line arguments
handle_arguments() {
    case "${1:-}" in
        --status|status|-s)
            print_banner
            show_status
            exit 0
            ;;
        --force|force|-f)
            echo "Force shutdown mode enabled"
            return 0
            ;;
        --help|help|-h)
            echo "ZK-Solvency Stop Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --status, -s     Show current service status"
            echo "  --force, -f      Force shutdown (nuclear option)"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0               Normal graceful shutdown"
            echo "  $0 --force       Force stop all processes"
            echo "  $0 --status      Check current status"
            exit 0
            ;;
        "")
            return 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Main execution flow
main() {
    local force_mode=false
    
    # Handle arguments
    handle_arguments "$@"
    
    # Check for force mode
    if [[ "${1:-}" == "--force" || "${1:-}" == "force" || "${1:-}" == "-f" ]]; then
        force_mode=true
    fi
    
    # Initialize log file
    echo "ZK-Solvency Shutdown Log - $(date)" > "$LOG_FILE"
    
    print_banner
    
    log "🛑 Starting $PROJECT_NAME Professional Shutdown..."
    
    if [[ "$force_mode" == "true" ]]; then
        force_shutdown
    else
        stop_all_services
        cleanup_files
        cleanup_network
        
        if ! verify_shutdown; then
            log_warn "Normal shutdown incomplete. Consider using --force"
            exit 1
        fi
    fi
    
    print_summary
    
    log "Shutdown sequence completed successfully"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi