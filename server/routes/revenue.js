const express = require('express');
const router = express.Router();
const feeService = require('../services/feeService');

// Owner-only guard
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

module.exports = router;
