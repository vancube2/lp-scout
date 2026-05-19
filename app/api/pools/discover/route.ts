import { NextRequest, NextResponse } from 'next/server';
import { discoverOrcaPools } from '../../../../lib/orcaData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pools = await discoverOrcaPools({
      limit: searchParams.get('limit') || '20',
    });
    return NextResponse.json(pools);
  } catch (error: any) {
    console.error('Discover pools error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}