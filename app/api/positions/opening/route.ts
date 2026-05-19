import { NextRequest, NextResponse } from 'next/server';
import { getOrcaPositions } from '../../../../lib/orcaData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    if (!owner) {
      return NextResponse.json({ error: 'owner query param required' }, { status: 400 });
    }
    const positions = await getOrcaPositions(owner);
    return NextResponse.json(positions);
  } catch (error: any) {
    console.error('Positions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}