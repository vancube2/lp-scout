const express = require('express');
const router = express.Router();

module.exports = (multiwalletService) => {
  // POST /api/multiwallet/org
  router.post('/org', (req, res) => {
    try {
      const { name, ownerWallet } = req.body;
      const org = multiwalletService.createOrganization(name, ownerWallet);
      res.json({ success: true, org });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/multiwallet/org/:id/wallet
  router.post('/org/:id/wallet', (req, res) => {
    try {
      const { walletAddress } = req.body;
      const org = multiwalletService.addWallet(req.params.id, walletAddress);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      res.json({ success: true, org });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/multiwallet/org/:id/portfolio
  router.get('/org/:id/portfolio', (req, res) => {
    try {
      const portfolio = multiwalletService.getAggregatedPortfolio(req.params.id);
      if (!portfolio) return res.status(404).json({ error: 'Organization not found' });
      res.json({ success: true, portfolio });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/multiwallet/org/:id/compare
  router.get('/org/:id/compare', (req, res) => {
    try {
      const comparison = multiwalletService.compareWallets(req.params.id);
      if (!comparison) return res.status(404).json({ error: 'Organization not found' });
      res.json({ success: true, comparison });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
