import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioOverview } from '../../../../lib/orcaData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    if (!owner) {
      return NextResponse.json({ error: 'owner query param required' }, { status: 400 });
    }
    const overview = await getPortfolioOverview(owner);
    return NextResponse.json(overview);
  } catch (error: any) {
    console.error('Overview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}