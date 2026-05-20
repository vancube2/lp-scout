const express = require('express');
const router = express.Router();

module.exports = (tokenLaunchService) => {
  // POST /api/token-launch/analyze
  router.post('/analyze', (req, res) => {
    try {
      const { token0Mint, token1Mint, token0Symbol, token1Symbol, options } = req.body;
      if (!token0Symbol || !token1Symbol) {
        return res.status(400).json({ error: 'token symbols required' });
      }
      const analysis = tokenLaunchService.analyzeLaunchConfig(token0Mint, token1Mint, token0Symbol, token1Symbol, options || {});
      res.json({ success: true, analysis });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/token-launch/compare/:pair
  router.get('/compare/:pair', (req, res) => {
    try {
      const { pair } = req.params;
      const feeTier = { label: '0.05%', tier: 0.0005 };
      const comparison = tokenLaunchService.getCompetitorComparison(pair, feeTier);
      res.json({ success: true, comparison });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
