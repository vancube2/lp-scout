const express = require('express');
const router = express.Router();

module.exports = (migrationService) => {
  // POST /api/migration/analyze
  router.post('/analyze', (req, res) => {
    try {
      const { sourceDEX, poolPair, currentPositionValue, currentAPR, options } = req.body;
      const result = migrationService.analyzeMigration(sourceDEX, poolPair, currentPositionValue, currentAPR, options || {});
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/migration/portfolio
  router.post('/portfolio', (req, res) => {
    try {
      const { positions } = req.body;
      const result = migrationService.analyzePortfolioMigration(positions || []);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
