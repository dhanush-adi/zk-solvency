# ZK-Solvency Frontend

A modern proof-of-reserves dashboard built with Next.js 15, featuring real-time cryptographic verification with zero-knowledge proofs. This application enables institutional traders to transparently verify solvency through merkle tree inclusion proofs.

## Features

### Core Features
- **Real-time Proof of Reserves**: Live SSE-powered updates of institutional solvency proofs
- **Merkle Tree Visualization**: Interactive visualization of merkle proof paths
- **Wallet Inclusion Verification**: Check if your wallet is included in the proof
- **Solvency Dashboard**: Real-time solvency ratio gauge with historical tracking
- **Auditor Tools**: Premium audit dashboard with payment-gated access
- **Dark Theme**: Modern dark navy (#0a0e27) design with electric green (#00ff87) accents

### Technical Features
- Server-side rendering with React Server Components
- Real-time data streaming via Server-Sent Events (SSE)
- State management with Zustand
- Data fetching with TanStack React Query
- Animations with Framer Motion
- Form validation with React Hook Form + Zod
- Wallet integration ready for Web3 connections
- Responsive design (mobile-first)

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Dashboard page
│   ├── inclusion-checker/      # Wallet inclusion verification
│   ├── proof-details/          # Detailed proof analytics
│   ├── auditor/                # Premium audit dashboard
│   └── api/                    # API route handlers
├── components/
│   ├── dashboard/              # Dashboard components
│   ├── inclusion/              # Inclusion checker components
│   ├── proof/                  # Proof detail components
│   ├── auditor/                # Auditor dashboard components
│   ├── providers/              # React context providers
│   ├── Navbar.tsx              # Navigation component
│   ├── Footer.tsx              # Footer component
│   ├── HashDisplay.tsx         # Hash display with copy
│   ├── StatusBadge.tsx         # Status indicator
│   ├── ProofCountdown.tsx      # Proof expiration timer
│   ├── SolvencyRatioGauge.tsx  # Solvency visualization
│   ├── MerklePathVisualizer.tsx # Merkle tree visualization
│   ├── WalletConnect.tsx       # Wallet connection button
│   └── CountUpNumber.tsx       # Animated number counter
├── hooks/
│   ├── useLiveProof.ts         # Real-time proof fetching
│   ├── useInclusionProof.ts    # Wallet inclusion verification
│   └── useSolvencyHistory.ts   # Historical solvency data
├── store/
│   └── solvencyStore.ts        # Zustand state management
├── lib/
│   ├── types.ts                # TypeScript type definitions
│   ├── env.ts                  # Environment configuration
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd zk-solvency-frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLET_CONNECT_ID=your-wallet-connect-id
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x...
```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API URL (default: http://localhost:3001) |
| `NEXT_PUBLIC_WALLET_CONNECT_ID` | No | WalletConnect Project ID for wallet integration |
| `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS` | No | USDC contract address for payment verification |
| `NEXT_PUBLIC_ENABLE_SSE` | No | Enable Server-Sent Events for real-time updates |
| `NEXT_PUBLIC_ENABLE_WALLET` | No | Enable wallet connection features |

## API Integration

The frontend expects the following backend endpoints:

### Proof Endpoints
- `GET /api/proof/latest` - Get current proof of reserves
- `GET /api/proof/stream` - Server-Sent Events stream for real-time updates

### Inclusion Proof Endpoints
- `POST /api/inclusion-proof/verify` - Verify wallet inclusion
- `GET /api/inclusion-proof/history` - Get historical inclusion proofs

### Solvency Endpoints
- `GET /api/solvency/history` - Get solvency history (supports query params: days, limit)

### Example SSE Message Format
```json
{
  "id": "proof_1234567890",
  "timestamp": 1234567890,
  "totalBalance": "1234567890000000000",
  "merkleRoot": "0x...",
  "blockHeight": 18500000,
  "chainId": 1,
  "status": "verified",
  "generatedAt": "2026-03-27T10:00:00.000Z",
  "expiresAt": "2026-03-27T10:10:00.000Z"
}
```

## Design System

### Color Palette
- **Background**: Dark Navy (#0a0e27)
- **Primary**: Electric Green (#00ff87) - Accents and highlights
- **Secondary**: Cyan (#00d4ff) - Secondary actions
- **Neutral**: Grays (#4a5078 to #e5f0ff)
- **Destructive**: Red (#ff4444)

### Typography
- **Sans**: Geist font family
- **Mono**: Geist Mono for code/hashes

### Components
- All components use Tailwind CSS with design tokens
- Responsive design with mobile-first approach
- Dark theme always enabled

## Building for Production

```bash
pnpm build
pnpm start
```

## Deployment

The application can be deployed to Vercel with a single click:

```bash
vercel deploy
```

Or use your preferred hosting platform:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted (Node.js)

## State Management

### Zustand Store (`useSolvencyStore`)
Manages global application state:
- Current and historical proofs
- Wallet inclusion proofs
- Audit logs
- Solvency history
- UI loading states

```typescript
const { currentProof, setCurrentProof } = useSolvencyStore();
```

## Data Fetching

### TanStack React Query
Configured with:
- 30-second stale time
- 5-minute garbage collection
- Automatic refetching
- Built-in caching

### Custom Hooks
- `useLiveProof()` - Real-time proof updates via SSE
- `useInclusionProof()` - Verify wallet inclusion
- `useSolvencyHistory()` - Historical solvency data

## Real-time Features

### Server-Sent Events (SSE)
- Automatic reconnection on disconnect
- Flash animation on new proofs
- Error handling and logging
- Connection status indicator

### WebSocket Alternative
To use WebSocket instead of SSE, modify the `SSEProvider`:
```typescript
const ws = new WebSocket(apiUrl + '/proof/stream');
ws.onmessage = (event) => {
  const proof = JSON.parse(event.data);
  // Handle proof update
};
```

## Wallet Integration

### Current Implementation
- MetaMask detection and connection
- Address copying with visual feedback
- Disconnect functionality

### Future: WalletConnect Integration
```typescript
// Ready for wagmi integration
import { useAccount } from 'wagmi';
const { address } = useAccount();
```

## Testing

No tests are currently included, but the project is structured for easy testing with:
- Jest + React Testing Library
- Cypress for E2E testing
- API mocking with MSW

## Performance Optimizations

- Server-side rendering for fast initial load
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- CSS-in-JS with Tailwind (zero runtime cost)
- Zustand for minimal re-renders
- React Query caching and deduplication

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

- No sensitive data stored in localStorage
- CSRF protection via Next.js
- Content Security Policy ready
- Environment variables validated on build
- XSS prevention with React escaping

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For issues and feature requests, please open an issue on GitHub or contact support.

## Roadmap

- [ ] Full wagmi integration for advanced wallet features
- [ ] Polygon/Multi-chain support
- [ ] Export audit reports as PDF
- [ ] Dark/Light theme toggle
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard
- [ ] Advanced filtering in inclusion checker
- [ ] Batch wallet verification
