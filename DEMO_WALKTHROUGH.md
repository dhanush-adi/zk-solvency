# ZK-Solvency Demo Walkthrough

## Quick Start (5 minutes)

### 1. Prerequisites
- PostgreSQL running on localhost:5432
- Redis running on localhost:6379
- Node.js 20+ and pnpm installed

### 2. Start Services

**Option A: Separate Terminals (Recommended)**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
pnpm dev
```

**Option B: Use Helper Scripts**
```bash
# Open both in separate terminals
./start-all-terminals.sh

# Or start individually
./start-backend.sh
./start-frontend.sh
```

**Option C: Single Command (Background)**
```bash
./start-all.sh
```

### 3. Populate Demo Data
```bash
# Create 5 proof rounds with demo data
curl -X POST http://localhost:3001/api/proof/simulate \
  -H "Content-Type: application/json" \
  -d '{"accountCount": 50}'

# Or use the reset script
./reset-demo-data.sh
```

### 4. Open Frontend
Visit: http://localhost:3000

## Demo Flow (10 minutes)

### Part 1: Dashboard Overview (2 minutes)
1. **Show the dashboard** with real-time metrics
   - Total assets vs liabilities
   - Solvency ratio gauge
   - Latest proof status
   
2. **Point out the SSE connection**
   - Green indicator in top-right (if SSE connected)
   - Real-time updates every 30 seconds

### Part 2: Proof Generation (3 minutes)
1. **Generate a new proof**
   ```bash
   curl -X POST http://localhost:3001/api/proof/simulate \
     -H "Content-Type: application/json" \
     -d '{"accountCount": 100}'
   ```

2. **Watch the dashboard update**
   - New proof appears in "Recent Proofs"
   - Solvency ratio updates
   - Merkle root changes

3. **Explain the process**
   - Accounts → Merkle tree → Proof → On-chain

### Part 3: Solvency History (2 minutes)
1. **Scroll to the history chart**
   - Shows solvency ratio over time
   - Each point is a proof round

2. **Explain the data**
   - 100% = Assets equal liabilities
   - >100% = Over-collateralized
   - <100% = Under-collateralized (bad!)

### Part 4: Inclusion Checker (2 minutes)
1. **Navigate to "Inclusion Checker"** (left sidebar)
2. **Enter any wallet address**
   - Example: `0x1234567890123456789012345678901234567890`
3. **Show the Merkle proof visualization**
   - Proves wallet is included in the tree
   - Without revealing balance

### Part 5: Auditor Dashboard (1 minute)
1. **Navigate to "Auditor"** (left sidebar)
2. **Show the audit metrics**
   - Total wallets verified
   - Payment required for full audit
3. **Explain x402 payment model**

## Advanced Demo Features

### Real-time Updates
- SSE endpoint streams new proofs every 30 seconds
- Dashboard updates automatically
- No page refresh needed

### API Endpoints
```bash
# Get latest proof
curl http://localhost:3001/api/proof/latest | jq .

# Get solvency history
curl http://localhost:3001/api/solvency/history | jq .

# Check health
curl http://localhost:3001/api/health | jq .
```

### Database Queries
```sql
-- Check proof rounds
SELECT round_number, status, total_assets, total_liabilities 
FROM proof_rounds 
ORDER BY round_number DESC 
LIMIT 5;

-- Check accounts
SELECT COUNT(*), SUM(balance::numeric) 
FROM accounts;
```

## Troubleshooting

### Frontend shows "SSE connection unavailable"
- Check backend is running: `curl http://localhost:3001/api/health`
- Check SSE endpoint: `curl -N http://localhost:3001/api/proof/stream`
- Frontend will use mock data as fallback

### No data in dashboard
- Populate demo data: `./reset-demo-data.sh`
- Check database connection
- Check backend logs: `tail -f /tmp/zk-backend.log`

### Port conflicts
- Backend uses port 3001
- Frontend uses port 3000
- Change ports in `.env` files if needed

## Demo Tips

1. **Start fresh**: Use `./reset-demo-data.sh` before each demo
2. **Have backup**: Keep terminal with API commands ready
3. **Explain architecture**: 
   - Layer 1: Data attestation (zkTLS)
   - Layer 2: Merkle tree
   - Layer 3: Nullifier registry
   - Layer 4: ZK proof
   - Layer 5: On-chain verification
4. **Highlight privacy**: Balances hidden, only proof of solvency shown
5. **Show real-time**: Generate new proof during demo to show updates

## Quick Commands Reference

```bash
# Start everything
./start-all-terminals.sh

# Populate data
curl -X POST http://localhost:3001/api/proof/simulate \
  -H "Content-Type: application/json" \
  -d '{"accountCount": 50}'

# Check status
curl http://localhost:3001/api/health | jq .

# View logs
tail -f /tmp/zk-backend.log
tail -f /tmp/zk-frontend.log

# Stop everything
./stop-all.sh
```

## Presentation Structure

1. **Introduction** (1 min): What is ZK-Solvency?
2. **Problem** (1 min): Why traditional proof-of-reserves fails
3. **Solution** (2 min): ZK proofs for privacy-preserving verification
4. **Demo** (5 min): Walk through the dashboard
5. **Architecture** (1 min): Technical stack overview
6. **Q&A** (2 min): Questions from audience

**Total: ~12 minutes**