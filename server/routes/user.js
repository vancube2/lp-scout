const express = require('express');
const router = express.Router();
const axios = require('axios');

const API_BASE = 'https://api.lpagent.io/open-api/v1';
const HEADERS = { 'x-api-key': process.env.LP_AGENT_API_KEY };

// In-memory session tracking
const userSessions = new Map();

// GET /api/user/summary/:wallet
router.get('/summary/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    // Fetch positions and overview
    const [positionsRes, overviewRes] = await Promise.all([
      axios.get(`${API_BASE}/lp-positions/opening`, {
        headers: HEADERS,
        params: { owner: wallet },
      }),
      axios.get(`${API_BASE}/lp-positions/overview`, {
        headers: HEADERS,
        params: { owner: wallet },
      }),
    ]);

    const positions = positionsRes.data.data || [];
    const overview = overviewRes.data.data || {};

    // Calculate stats
    const inRangeCount = positions.filter(p => p.inRange).length;
    const totalValueUSD = overview.total_value_usd || 0;
    const totalEarnedUSD = overview.total_pnl_usd || 0;
    const todayYieldUSD = positions.reduce((sum, p) => {
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

    // Calculate earnings since last visit
    const earnedSinceLastVisit = lastSeen
      ? sessionData.earnedSinceAutoManageOn * ((now - lastSeen) / (now - sessionData.firstSeen))
      : 0;

    // Update session
    userSessions.set(wallet, {
      ...sessionData,
      lastSeen: now,
    });

    res.json({
      totalValueUSD,
      totalEarnedUSD,
      todayYieldUSD,
      positionsCount: positions.length,
      inRangeCount,
      autoManageOn: sessionData.autoManageOn,
      earnedSinceAutoManageOn: sessionData.earnedSinceAutoManageOn,
      sessionSummary: {
        earnedSinceLastVisit: earnedSinceLastVisit.toFixed(2),
        rebalancesSinceLastVisit: 0, // Would track from events
        allInRange: inRangeCount === positions.length,
      },
    });
  } catch (err) {
    console.error('User summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
});

// POST /api/user/auto-manage
router.post('/auto-manage', (req, res) => {
  const { wallet, enabled } = req.body;
  const session = userSessions.get(wallet) || {};

  userSessions.set(wallet, {
    ...session,
    autoManageOn: enabled,
    lastSeen: Date.now(),
  });

  res.json({ success: true, autoManageOn: enabled });
});

module.exports = router;
