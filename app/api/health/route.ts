import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'lp-scout-frontend',
    timestamp: new Date().toISOString(),
  });
}
