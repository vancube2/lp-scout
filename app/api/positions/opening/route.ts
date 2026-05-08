import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.lpagent.io/open-api/v1';
const HEADERS = { 'x-api-key': process.env.LP_AGENT_API_KEY || '' };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json({ error: 'owner query param required' }, { status: 400 });
    }

    const response = await fetch(`${API_BASE}/lp-positions/opening?owner=${owner}`, {
      headers: HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: response.status });
    }

    const data = await response.json();
    let positions = Array.isArray(data) ? data : (data.data || data.positions || []);

    if (!Array.isArray(positions)) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    // Add isHealthy field
    const positionsWithHealth = positions.map((position: any) => ({
      ...position,
      isHealthy: position.inRange && position.dpr > 0 && position.pnl?.percent > -5,
    }));

    return NextResponse.json(positionsWithHealth);
  } catch (error: any) {
    console.error('Positions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
