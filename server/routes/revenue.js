const express = require('express');
const router = express.Router();
const feeService = require('../services/feeService');

function ownerOnly(req, res, next) {
  const wallet = req.headers['x-wallet-address'];
  if (wallet !== process.env.OWNER_WALLET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

router.get('/summary', ownerOnly, (req, res) => {
  res.json(feeService.getRevenueSummary());
});

router.get('/fee-structure', (req, res) => {
  res.json({
    model: 'fee-only',
    noSubscription: true,
    fees: {
      zapIn: '0.05% of deposit',
      performance: '0.5% of profit only (no profit = no fee)',
      rebalance: '0.02% of position value per rebalance',
      yieldShare: '5% of earned fees',
      autoCompound: '1% of compounded amount',
      copyTrading: '2% of follower yield',
    },
    transparency: 'All fees shown before every transaction. We only earn when you earn or use the product.'
  });
});

module.exports = router;