import { NextResponse } from 'next/server';

const API_BASE = 'https://api.lpagent.io/open-api/v1';
const HEADERS = { 'x-api-key': process.env.LP_AGENT_API_KEY || '' };

function computeAgentScore(pool: any) {
  const { vol_24h, fee, tvl, organic_score, price_24h_change } = pool;
  const score = ((vol_24h * fee) / tvl) + (organic_score * 0.2) - (Math.abs(price_24h_change) * 0.1);
  return score;
}

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/pools/discover?limit=5`, {
      headers: HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: response.status });
    }

    const data = await response.json();
    let pools = Array.isArray(data) ? data : (data.data || data.pools || []);

    if (!Array.isArray(pools)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 });
    }

    const tickers = pools.slice(0, 5).map((pool: any) => {
      const agentScore = computeAgentScore(pool);
      const dailyYield = ((pool.vol_24h * pool.fee) / pool.tvl) * 100;
      return {
        pair: `${pool.token0_symbol}-${pool.token1_symbol}`,
        dpr: dailyYield,
        tvl: pool.tvl,
        agentScore,
      };
    });

    return NextResponse.json(tickers);
  } catch (error: any) {
    console.error('Live tickers error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
