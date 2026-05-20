const express = require('express');
const router = express.Router();

module.exports = (governanceService) => {
  // GET /api/governance/proposals
  router.get('/proposals', (req, res) => {
    try {
      const status = req.query.status || null;
      const proposals = governanceService.getProposals(status);
      res.json({ success: true, proposals });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/governance/proposals/:id
  router.get('/proposals/:id', (req, res) => {
    try {
      const proposal = governanceService.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
      res.json({ success: true, proposal });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/governance/impact
  router.post('/impact', (req, res) => {
    try {
      const { positions } = req.body;
      const impacts = governanceService.getImpactForWallet(positions || []);
      res.json({ success: true, impacts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/governance/summary
  router.get('/summary', (req, res) => {
    try {
      const summary = governanceService.getGovernanceSummary();
      res.json({ success: true, summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
