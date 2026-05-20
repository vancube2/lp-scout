const express = require('express');
const router = express.Router();

module.exports = (leaderboardService) => {
  // GET /api/leaderboard
  router.get('/', (req, res) => {
    try {
      const sortBy = req.query.sortBy || 'riskAdjusted';
      const limit = parseInt(req.query.limit) || 20;
      const filter = req.query.riskLevel ? { riskLevel: req.query.riskLevel } : {};
      const rankings = leaderboardService.getLeaderboard(sortBy, limit, filter);
      res.json({ success: true, rankings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/leaderboard/:wallet
  router.get('/:wallet', (req, res) => {
    try {
      const details = leaderboardService.getLPerDetails(req.params.wallet);
      if (!details) return res.status(404).json({ error: 'LP not found' });
      res.json({ success: true, lper: details });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/leaderboard/trending/list
  router.get('/trending/list', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const trending = leaderboardService.getTrendingLPers(limit);
      res.json({ success: true, trending });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
