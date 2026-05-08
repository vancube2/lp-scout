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

    const response = await fetch(`${API_BASE}/lp-positions/overview?owner=${owner}`, {
      headers: HEADERS,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch overview' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.data || data);
  } catch (error: any) {
    console.error('Overview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
