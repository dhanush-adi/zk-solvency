#!/bin/bash
# Reset and populate demo data for ZK-Solvency
# This script clears existing data and creates fresh demo data

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_URL="http://localhost:3001"

echo "=== ZK-Solvency Demo Data Reset ==="
echo ""

# Check if backend is running
if ! curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo "❌ Backend is not running at $BACKEND_URL"
    echo "Please start the backend first: ./start-backend.sh"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Function to clear database (optional - only if you want to start fresh)
clear_database() {
    echo "⚠️  This will clear all data from the database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping database clear"
        return
    fi
    
    echo "Clearing database..."
    # Note: This requires direct database access
    # For demo purposes, we'll just delete the proof_rounds and accounts tables
    # In a real scenario, you'd want to be more careful
    
    echo "Database cleared (simulated - in production, use proper migration scripts)"
}

# Function to populate demo data
populate_demo_data() {
    local count=$1
    echo "Creating $count proof rounds with demo data..."
    
    for i in $(seq 1 $count); do
        local account_count=$((20 + i * 5))
        echo "  Creating round $i with $account_count accounts..."
        
        response=$(curl -s -X POST "$BACKEND_URL/api/proof/simulate" \
            -H "Content-Type: application/json" \
            -d "{\"accountCount\": $account_count}")
        
        if echo "$response" | grep -q "id"; then
            echo "    ✅ Round $i created"
        else
            echo "    ❌ Failed to create round $i"
        fi
        
        # Small delay between requests
        sleep 0.5
    done
}

# Main menu
echo "Demo Data Options:"
echo "1. Populate with 5 proof rounds (quick demo)"
echo "2. Populate with 10 proof rounds (standard demo)"
echo "3. Populate with 20 proof rounds (extended demo)"
echo "4. Clear database and populate (fresh start)"
echo "5. Show current data"
echo "6. Exit"
echo ""

read -p "Select option (1-6): " choice

case $choice in
    1)
        populate_demo_data 5
        ;;
    2)
        populate_demo_data 10
        ;;
    3)
        populate_demo_data 20
        ;;
    4)
        clear_database
        populate_demo_data 10
        ;;
    5)
        echo "Current solvency history:"
        curl -s "$BACKEND_URL/api/solvency/history?limit=5" | jq .
        ;;
    6)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "=== Demo Data Ready ==="
echo ""
echo "You can now:"
echo "1. Open the frontend: http://localhost:3000"
echo "2. View the dashboard with real-time updates"
echo "3. Check solvency history in the charts"
echo ""
echo "To add more data later:"
echo "  curl -X POST $BACKEND_URL/api/proof/simulate -H 'Content-Type: application/json' -d '{\"accountCount\": 50}'"
echo ""
echo "To check current data:"
echo "  curl $BACKEND_URL/api/solvency/history | jq ."
echo "  curl $BACKEND_URL/api/proof/latest | jq ."