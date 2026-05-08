import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.lpagent.io/open-api/v1';
const HEADERS = { 'x-api-key': process.env.LP_AGENT_API_KEY || '' };

// In-memory session tracking
const userSessions = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const { wallet } = params;

    // Fetch positions and overview
    const [positionsRes, overviewRes] = await Promise.all([
      fetch(`${API_BASE}/lp-positions/opening?owner=${wallet}`, { headers: HEADERS }),
      fetch(`${API_BASE}/lp-positions/overview?owner=${wallet}`, { headers: HEADERS }),
    ]);

    if (!positionsRes.ok || !overviewRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const positionsData = await positionsRes.json();
    const overviewData = await overviewRes.json();

    const positions = positionsData.data || [];
    const overview = overviewData.data || {};

    const inRangeCount = positions.filter((p: any) => p.inRange).length;
    const totalValueUSD = overview.total_value_usd || 0;
    const totalEarnedUSD = overview.total_pnl_usd || 0;
    const todayYieldUSD = positions.reduce((sum: number, p: any) => {
      const dailyYield = p.current_value_usd * p.dpr;
      return sum + dailyYield;
    }, 0);

    // Session tracking
    const lastSeen = userSessions.get(wallet)?.lastSeen;
    const now = Date.now();
    const sessionData = userSessions.get(wallet) || {
      earnedSinceAutoManageOn: 0,
      autoManageOn: false,
      firstSeen: now,
    };

    const earnedSinceLastVisit = lastSeen
      ? sessionData.earnedSinceAutoManageOn * ((now - lastSeen) / (now - sessionData.firstSeen))
      : 0;

    // Update session
    userSessions.set(wallet, {
      ...sessionData,
      lastSeen: now,
    });

    return NextResponse.json({
      totalValueUSD,
      totalEarnedUSD,
      todayYieldUSD,
      positionsCount: positions.length,
      inRangeCount,
      autoManageOn: sessionData.autoManageOn,
      earnedSinceAutoManageOn: sessionData.earnedSinceAutoManageOn,
      sessionSummary: {
        earnedSinceLastVisit: earnedSinceLastVisit.toFixed(2),
        rebalancesSinceLastVisit: 0,
        allInRange: inRangeCount === positions.length,
      },
    });
  } catch (error: any) {
    console.error('User summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
