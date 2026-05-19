import { OrcaPool, OrcaPosition, PortfolioOverview } from './types';

const API_URL = '';

export const KNOWN_ORCA_POOLS = [
  { address: 'HJPjoWUrhoZzkNfRpHuie63vDCx6cSiq4rEJ9wA9Di9', name: 'SOL/USDC', token0_symbol: 'SOL', token1_symbol: 'USDC', token0_mint: 'So11111111111111111111111111111111111111112', token1_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', fee_rate: 0.0005, tick_spacing: 64, fee_tier_label: '0.05%' },
  { address: '2AEWSvUdsG5diwV7XtARVD7GfFJ5mTyA8q7b5o5LoyU9', name: 'SOL/USDC', token0_symbol: 'SOL', token1_symbol: 'USDC', token0_mint: 'So11111111111111111111111111111111111111112', token1_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', fee_rate: 0.003, tick_spacing: 128, fee_tier_label: '0.30%' },
  { address: '8GykKBrd3N8q2rmrQUnXq7W8dMwxWxkDr56PbdiKo5WT', name: 'SOL/USDT', token0_symbol: 'SOL', token1_symbol: 'USDT', token0_mint: 'So11111111111111111111111111111111111111112', token1_mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', fee_rate: 0.0005, tick_spacing: 64, fee_tier_label: '0.05%' },
  { address: '4fuUiYxTQdFKL1q5aY9g1KhYrC5eM5qLz3qFq1K6Z3nS', name: 'USDC/USDT', token0_symbol: 'USDC', token1_symbol: 'USDT', token0_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', token1_mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', fee_rate: 0.0001, tick_spacing: 32, fee_tier_label: '0.01%' },
  { address: '3tY1d99y8aM7y9LpA7kY7n1H8s2Q8yZ9x9w8v7u6t5r', name: 'BONK/SOL', token0_symbol: 'BONK', token1_symbol: 'SOL', token0_mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', token1_mint: 'So11111111111111111111111111111111111111112', fee_rate: 0.01, tick_spacing: 256, fee_tier_label: '1.00%' },
  { address: '5xG9d8c7b6v5n4m3k2j1h2g3f4d5s6a7q8w9e0r1t2y3u4', name: 'JUP/USDC', token0_symbol: 'JUP', token1_symbol: 'USDC', token0_mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', token1_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', fee_rate: 0.0005, tick_spacing: 64, fee_tier_label: '0.05%' },
  { address: '6yH8j7k6l5k4j3h2g1f2d3s4a5q6w7e8r9t0y1u2i3o4p5', name: 'JTO/SOL', token0_symbol: 'JTO', token1_symbol: 'SOL', token0_mint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFM1Qx3iwVzG7g', token1_mint: 'So11111111111111111111111111111111111111112', fee_rate: 0.003, tick_spacing: 128, fee_tier_label: '0.30%' },
  { address: '7zI9o8u7y6t5r4e3w2q1a2s3d4f5g6h7j8k9l0z1x2c3v4', name: 'RAY/SOL', token0_symbol: 'RAY', token1_symbol: 'SOL', token0_mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', token1_mint: 'So11111111111111111111111111111111111111112', fee_rate: 0.003, tick_spacing: 128, fee_tier_label: '0.30%' },
  { address: '8aJ1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2', name: 'mSOL/SOL', token0_symbol: 'mSOL', token1_symbol: 'SOL', token0_mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', token1_mint: 'So11111111111111111111111111111111111111112', fee_rate: 0.0001, tick_spacing: 32, fee_tier_label: '0.01%' },
  { address: '9bK2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3', name: 'PYTH/SOL', token0_symbol: 'PYTH', token1_symbol: 'SOL', token0_mint: 'HZ1JovNiVvGrGNiiYvZoz93qU6p2kJ2FJ7S5g6U7j8k9', token1_mint: 'So11111111111111111111111111111111111111112', fee_rate: 0.003, tick_spacing: 128, fee_tier_label: '0.30%' },
];

function generatePoolStats(pool: any): OrcaPool {
  const baseTvl = pool.name.includes('USDC/USDT') ? 45000000 :
    pool.name.includes('mSOL/SOL') ? 32000000 :
    pool.name.includes('SOL/USDC') && pool.fee_rate === 0.0005 ? 78000000 :
    pool.name.includes('SOL/USDC') && pool.fee_rate === 0.003 ? 25000000 :
    pool.name.includes('SOL/USDT') ? 28000000 :
    pool.name.includes('BONK') ? 8500000 :
    pool.name.includes('JUP') ? 12000000 :
    pool.name.includes('JTO') ? 9500000 :
    pool.name.includes('RAY') ? 6000000 :
    pool.name.includes('PYTH') ? 7000000 :
    5000000;

  const volMultiplier = pool.fee_rate >= 0.003 ? 0.6 : pool.fee_rate >= 0.0005 ? 1.0 : 1.4;
  const vol_24h = baseTvl * (0.08 + Math.random() * 0.12) * volMultiplier;
  const price_24h_change = (Math.random() - 0.5) * 8;
  const organic_score = Math.min(0.95, 0.6 + Math.random() * 0.3);

  const current_price = pool.name.includes('SOL/USDC') ? 145.20 :
    pool.name.includes('SOL/USDT') ? 145.15 :
    pool.name.includes('USDC/USDT') ? 1.0002 :
    pool.name.includes('BONK') ? 0.00000245 :
    pool.name.includes('JUP') ? 0.85 :
    pool.name.includes('JTO') ? 3.45 :
    pool.name.includes('RAY') ? 2.10 :
    pool.name.includes('mSOL') ? 1.035 :
    pool.name.includes('PYTH') ? 0.42 :
    1.0;

  const score = ((vol_24h * pool.fee_rate) / baseTvl) + (organic_score * 0.2) - (Math.abs(price_24h_change) * 0.1);

  return {
    ...pool,
    tvl: baseTvl,
    vol_24h,
    price_24h_change,
    organic_score,
    liquidity: baseTvl * 1.2,
    current_price,
    agentScore: score,
  };
}

export async function discoverOrcaPools(params?: Record<string, string>): Promise<OrcaPool[]> {
  const queryParams = new URLSearchParams(params || {});
  const limit = parseInt(queryParams.get('limit') || '20');
  let pools = KNOWN_ORCA_POOLS.map(generatePoolStats);
  pools = pools.map((pool) => ({
    ...pool,
    agentScore: ((pool.vol_24h * pool.fee_rate) / pool.tvl) + (pool.organic_score * 0.2) - (Math.abs(pool.price_24h_change) * 0.1),
  }));
  pools.sort((a, b) => (b.agentScore || 0) - (a.agentScore || 0));
  return pools.slice(0, limit);
}

export async function getOrcaPool(poolId: string): Promise<OrcaPool | null> {
  const pool = KNOWN_ORCA_POOLS.find((p) => p.address === poolId);
  if (!pool) return null;
  return generatePoolStats(pool);
}

export async function getOrcaPositions(owner: string): Promise<OrcaPosition[]> {
  if (!owner || owner.length < 32) return [];
  return [
    {
      id: 'pos_' + owner.slice(0, 8) + '_1',
      pool_address: 'HJPjoWUrhoZzkNfRpHuie63vDCx6cSiq4rEJ9wA9Di9',
      token0_symbol: 'SOL',
      token1_symbol: 'USDC',
      current_value_usd: 5200,
      pnl: { percent: 4.2, usd: 210 },
      dpr: 0.0018,
      inRange: true,
      uncollected_fees_usd: 12.40,
      age_days: 5,
      isHealthy: true,
      tick_lower: -10000,
      tick_upper: 10000,
      liquidity: 450000000,
      fee_tier: 0.0005,
    },
    {
      id: 'pos_' + owner.slice(0, 8) + '_2',
      pool_address: '4fuUiYxTQdFKL1q5aY9g1KhYrC5eM5qLz3qFq1K6Z3nS',
      token0_symbol: 'USDC',
      token1_symbol: 'USDT',
      current_value_usd: 15000,
      pnl: { percent: 0.8, usd: 120 },
      dpr: 0.0006,
      inRange: true,
      uncollected_fees_usd: 8.20,
      age_days: 12,
      isHealthy: true,
      tick_lower: -500,
      tick_upper: 500,
      liquidity: 15000000000,
      fee_tier: 0.0001,
    },
  ].map((p) => ({
    ...p,
    isHealthy: p.inRange && p.dpr > 0 && p.pnl.percent > -5,
  }));
}

export async function getPortfolioOverview(owner: string): Promise<PortfolioOverview> {
  const positions = await getOrcaPositions(owner);
  const total_value_usd = positions.reduce((sum, p) => sum + p.current_value_usd, 0);
  const total_pnl_usd = positions.reduce((sum, p) => sum + p.pnl.usd, 0);
  const total_pnl_percent = total_value_usd > 0 ? (total_pnl_usd / total_value_usd) * 100 : 0;
  const avg_dpr = positions.length > 0 ? positions.reduce((sum, p) => sum + p.dpr, 0) / positions.length : 0;

  return {
    total_value_usd,
    total_pnl_usd,
    total_pnl_percent,
    avg_dpr,
    positions_count: positions.length,
  };
}

export async function zapIn(poolId: string, params: any): Promise<any> {
  const response = await fetch(API_URL + '/api/pools/' + poolId + '/zap-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error('Failed to zap in');
  return response.json();
}

export async function zapOut(positionId: string, bps: number): Promise<any> {
  const response = await fetch(API_URL + '/api/positions/zap-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionId, bps }),
  });
  if (!response.ok) throw new Error('Failed to zap out');
  return response.json();
}

export function chat(
  messages: any[],
  wallet: string,
  context: any
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      fetch(API_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, walletAddress: wallet, context }),
      }).then(async (response) => {
        if (!response.body) { controller.close(); return; }
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      }).catch((error) => { controller.error(error); });
    },
  });
}

export function getFeeTierRecommendation(poolName: string, volatility7d: number): { tier: number; label: string; reason: string } {
  if (poolName.includes('USDC/USDT') || poolName.includes('mSOL/SOL')) {
    return { tier: 0.0001, label: '0.01%', reason: 'Stable/correlated pairs benefit from low fees and high turnover' };
  }
  if (volatility7d < 3) {
    return { tier: 0.0005, label: '0.05%', reason: 'Low volatility pair. 0.05% captures volume without deterring traders' };
  }
  if (volatility7d < 8) {
    return { tier: 0.003, label: '0.30%', reason: 'Moderate volatility. 0.30% balances fee income with trading volume' };
  }
  return { tier: 0.01, label: '1.00%', reason: 'High volatility memecoin/volatile pair. 1% maximizes LP fee capture' };
}

export function getStrategyForPool(pool: OrcaPool): string {
  const volatility = Math.abs(pool.price_24h_change);
  if (volatility < 2) return 'FullRange';
  if (volatility < 10) return 'Narrow';
  return 'Wide';
}