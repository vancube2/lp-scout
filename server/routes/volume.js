const express = require('express');
const router = express.Router();

module.exports = (volumeService) => {
  // GET /api/volume/alerts
  router.get('/alerts', (req, res) => {
    try {
      const alerts = volumeService.getAllActiveAlerts();
      res.json({ success: true, alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/volume/check
  router.post('/check', (req, res) => {
    try {
      const { poolAddresses } = req.body;
      const results = (poolAddresses || []).map(addr => volumeService.detectSpike(addr));
      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/volume/trends
  router.get('/trends', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const trends = volumeService.getVolumeTrends(limit);
      res.json({ success: true, trends });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/volume/alerts/:id
  router.delete('/alerts/:id', (req, res) => {
    try {
      const dismissed = volumeService.dismissAlert(req.params.id);
      res.json({ success: dismissed });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
