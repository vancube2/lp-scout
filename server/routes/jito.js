const express = require('express');
const router = express.Router();
const jitoService = require('../services/jitoService');

// GET /api/jito/status
router.get('/status', (req, res) => {
  res.json(jitoService.getJitoStats());
});

// GET /api/jito/bundle/:bundleId
router.get('/bundle/:bundleId', async (req, res) => {
  try {
    const status = await jitoService.getBundleStatus(req.params.bundleId);
    res.json({
      ...status,
      explorerUrl: `https://explorer.jito.wtf/bundle/${req.params.bundleId}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jito/simulate
// Preview what a rebalance bundle would look like without submitting
router.post('/simulate', async (req, res) => {
  const { positionId, poolId, owner } = req.body;
  try {
    // Build bundle but don't submit
    const bundleData = await jitoService.buildAtomicRebalanceBundle({
      positionId,
      poolId,
      owner,
      keypair: null,
      lpAgentApiKey: process.env.LP_AGENT_API_KEY,
      urgency: 'medium',
    });

    const tipAmount = jitoService.calculateDynamicTip('medium');

    res.json({
      valid: true,
      bundleCount: bundleData.bundles.length,
      txCount: bundleData.bundles.reduce((s, b) => s + b.length, 0),
      estimatedTipSOL: (tipAmount / 1e9).toFixed(6),
      newRange: {
        from: bundleData.fromBinId,
        to: bundleData.toBinId,
        activeBin: bundleData.activeBin,
      },
      message: `Atomic bundle ready. ${bundleData.bundles.length === 1
        ? 'Exit and re-entry land in the same block.'
        : 'Two sequential bundles — exit lands first, then re-entry.'}`,
    });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

// GET /api/jito/tip-estimate
router.get('/tip-estimate', (req, res) => {
  const hour = new Date().getUTCHours();
  // Peak hours (14:00–22:00 UTC = US trading hours) = higher tip
  const isPeak = hour >= 14 && hour <= 22;
  res.json({
    low: 1000,
    medium: isPeak ? 35000 : 25000,
    high: isPeak ? 75000 : 50000,
    isPeakHours: isPeak,
    note: isPeak
      ? 'Peak hours — higher tips recommended for fast landing'
      : 'Off-peak — standard tips sufficient',
  });
});

module.exports = router;
