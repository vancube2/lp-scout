import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.lpagent.io/open-api/v1';
const HEADERS = { 'x-api-key': process.env.LP_AGENT_API_KEY || '' };

function computeAgentScore(pool: any) {
  const { vol_24h, fee, tvl, organic_score, price_24h_change } = pool;
  const score = ((vol_24h * fee) / tvl) + (organic_score * 0.2) - (Math.abs(price_24h_change) * 0.1);
  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${API_BASE}/pools/discover${queryString ? `?${queryString}` : ''}`, {
      headers: HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from LP Agent' }, { status: response.status });
    }

    const data = await response.json();
    let pools = Array.isArray(data) ? data : (data.data || data.pools || []);

    if (!Array.isArray(pools)) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    // Add agentScore and sort
    const poolsWithScore = pools.map((pool: any) => ({
      ...pool,
      agentScore: computeAgentScore(pool),
    }));

    poolsWithScore.sort((a: any, b: any) => b.agentScore - a.agentScore);

    return NextResponse.json(poolsWithScore);
  } catch (error: any) {
    console.error('Discover pools error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
