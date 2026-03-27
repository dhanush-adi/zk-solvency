# ZK-Solvency Implementation Guide

This guide provides comprehensive documentation for integrating the ZK-Solvency frontend with your backend services.

## Backend Integration Requirements

### 1. API Endpoints

Your backend must implement the following RESTful endpoints:

#### Proof of Reserves Endpoints

**GET /api/proof/latest**
```
Response: {
  id: string,
  timestamp: number,
  totalBalance: string (wei),
  merkleRoot: string (0x-prefixed hex),
  blockHeight: number,
  chainId: number,
  status: 'pending' | 'verified' | 'failed',
  generatedAt: ISO 8601 string,
  expiresAt: ISO 8601 string
}
```

**GET /api/proof/stream** (Server-Sent Events)
```
Event format: text/event-stream
data: {...proof object...}

Sends new proofs when generated.
Client automatically reconnects on disconnect.
```

#### Inclusion Proof Endpoints

**POST /api/inclusion-proof/verify**
```
Request: {
  walletAddress: string (0x-prefixed),
  proofOfReservesId: string
}

Response: {
  id: string,
  wallet: string,
  balance: string (wei),
  merkleProof: string[] (array of 0x-prefixed hashes),
  merkleRoot: string,
  leafIndex: number,
  verified: boolean,
  proofOfReservesId: string
}
```

**GET /api/inclusion-proof/history**
```
Query params:
  - walletAddress (optional)
  - limit (default: 50)
  - offset (default: 0)

Response: {
  proofs: InclusionProof[],
  total: number
}
```

#### Solvency History Endpoints

**GET /api/solvency/history**
```
Query params:
  - days (default: 30)
  - limit (default: 100)
  - offset (default: 0)

Response: {
  history: SolvencyHistoryEntry[],
  total: number
}

SolvencyHistoryEntry: {
  timestamp: number,
  solvencyRatio: number (0-2),
  totalAssets: string (wei),
  totalLiabilities: string (wei),
  proofHash: string
}
```

### 2. Real-time Updates via SSE

Server-Sent Events is the primary mechanism for real-time proof updates.

**Implementation Example (Node.js/Express):**

```javascript
app.get('/api/proof/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial proof
  const latestProof = getLatestProof();
  res.write(`data: ${JSON.stringify(latestProof)}\n\n`);

  // Subscribe to proof updates
  const unsubscribe = onProofGenerated((proof) => {
    res.write(`data: ${JSON.stringify(proof)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});
```

**Alternative: WebSocket Implementation**

If you prefer WebSocket over SSE, modify `components/providers/SSEProvider.tsx`:

```typescript
const ws = new WebSocket(`${apiUrl}/proof/stream`);

ws.onmessage = (event) => {
  const proof = JSON.parse(event.data);
  setCurrentProof(proof);
  addProofToHistory(proof);
};
```

## Frontend Customization

### 1. Configure API URL

Update `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### 2. Add Custom Branding

Edit `app/globals.css` to change colors:
```css
:root {
  --background: #your-bg-color;
  --foreground: #your-text-color;
  --primary: #your-primary-color;
  /* ... other variables ... */
}
```

### 3. Customize Components

All components are located in `/components` and can be modified:
- Update `Navbar.tsx` for custom navigation
- Edit `Footer.tsx` for company information
- Modify dashboard components in `/components/dashboard`

### 4. Add Additional Pages

Create new pages in `/app`:
```typescript
// app/custom-page/page.tsx
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function CustomPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {/* Your content */}
      </main>
      <Footer />
    </div>
  );
}
```

## Data Types Reference

All TypeScript types are defined in `lib/types.ts`:

### ProofOfReserves
```typescript
interface ProofOfReserves {
  id: string;
  timestamp: number;
  totalBalance: string;
  merkleRoot: string;
  blockHeight: number;
  chainId: number;
  status: 'pending' | 'verified' | 'failed';
  generatedAt: Date;
  expiresAt: Date;
}
```

### InclusionProof
```typescript
interface InclusionProof {
  id: string;
  wallet: string;
  balance: string;
  merkleProof: string[];
  merkleRoot: string;
  leafIndex: number;
  verified: boolean;
  proofOfReservesId: string;
}
```

## Hooks Reference

### useLiveProof()
Fetches and subscribes to real-time proof updates.

```typescript
const { proof, isLoading, error, refetch } = useLiveProof();

// proof: Current proof of reserves
// isLoading: Loading state
// error: Error message if failed
// refetch: Manually trigger refresh
```

### useInclusionProof()
Verifies wallet inclusion in current proof.

```typescript
const { verifyInclusion, isVerifying, proof, error, history } = useInclusionProof();

// Call verifyInclusion(walletAddress, proofId)
// Returns: InclusionProof if verified
```

### useSolvencyHistory()
Fetches historical solvency data.

```typescript
const { history, isLoading, error, stats } = useSolvencyHistory({ days: 30 });

// stats: { current, average, min, max }
```

## State Management

Global state is managed with Zustand (`store/solvencyStore.ts`):

```typescript
import { useSolvencyStore } from '@/store/solvencyStore';

const { currentProof, setCurrentProof, addProofToHistory } = useSolvencyStore();
```

## Error Handling

The frontend includes error boundaries and fallback UI:

```typescript
// In components
if (error) {
  return (
    <div className="rounded-lg bg-destructive/20 p-4">
      <p>Error: {error}</p>
    </div>
  );
}
```

## Deployment Checklist

- [ ] Update `NEXT_PUBLIC_API_URL` to production backend
- [ ] Configure `NEXT_PUBLIC_WALLET_CONNECT_ID` if using wallet features
- [ ] Update metadata in `app/layout.tsx`
- [ ] Customize branding in `app/globals.css`
- [ ] Test all API endpoints in staging environment
- [ ] Configure CDN and caching headers
- [ ] Set up monitoring and error tracking
- [ ] Test SSE connection across different browsers
- [ ] Verify responsive design on mobile devices

## Performance Optimization

### Caching Strategy

TanStack React Query handles caching with:
- 30-second stale time (data is fresh for 30s)
- 5-minute garbage collection (data kept for 5 minutes)
- Automatic refetching on window focus

Adjust in `components/providers/QueryProvider.tsx`:
```typescript
staleTime: 30 * 1000,      // Change this value
gcTime: 5 * 60 * 1000,    // And this
```

### Image Optimization

All images should use Next.js Image component:
```typescript
import Image from 'next/image';

<Image
  src="/image.png"
  alt="Description"
  width={300}
  height={200}
/>
```

## Monitoring & Logging

Add your monitoring solution:

```typescript
// components/providers/SSEProvider.tsx
console.log('[SSE] Connected to proof stream');
console.log('[SSE] Received new proof:', proof.id);
console.error('[SSE] Connection error:', error);
```

Integrate with:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage metrics

## Testing

Add tests using Jest and React Testing Library:

```typescript
// __tests__/components/HashDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import { HashDisplay } from '@/components/HashDisplay';

describe('HashDisplay', () => {
  it('displays hash correctly', () => {
    render(<HashDisplay hash="0x123abc" />);
    expect(screen.getByText(/0x123abc/)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### SSE Connection Issues
- Check CORS settings on backend
- Verify API URL in `.env.local`
- Check browser console for errors

### API Timeout Issues
- Increase timeout in React Query configuration
- Check backend server response times
- Verify network connectivity

### Wallet Connection Fails
- Ensure MetaMask or compatible wallet is installed
- Check `NEXT_PUBLIC_WALLET_CONNECT_ID` if using WalletConnect
- Verify wallet is connected to correct chain

## Support & Resources

- GitHub Issues: Report bugs and request features
- Documentation: See README.md
- API Reference: See above
- Examples: Check `/components` for working examples

## Version Compatibility

- Node.js: 18+
- React: 19.2.4
- Next.js: 16.2.0
- TypeScript: 5.7.3
