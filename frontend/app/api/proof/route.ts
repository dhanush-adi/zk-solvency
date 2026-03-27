import { NextRequest, NextResponse } from 'next/server';

/**
 * Temporary API routes for demo purposes
 * In production, these would connect to your actual ZK-Solvency backend
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  switch (endpoint) {
    case 'latest':
      return NextResponse.json({
        id: 'proof_' + Date.now(),
        timestamp: Date.now(),
        totalBalance: '1234567890000000000',
        merkleRoot: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
        blockHeight: 18500000 + Math.floor(Math.random() * 100),
        chainId: 1,
        status: 'verified',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    default:
      return NextResponse.json(
        { error: 'Invalid endpoint' },
        { status: 400 }
      );
  }
}
