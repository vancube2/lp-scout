const express = require('express');
const router = express.Router();

/**
 * Copy LP Routes - Mirror top liquidity providers
 */

module.exports = (copyLPService) => {
  // GET /api/copy-lp/top-lpers
  router.get('/top-lpers', async (req, res) => {
    try {
      const lpers = copyLPService.getTopLPers();

      res.json({
        success: true,
        lpers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/copy-lp/lpers/:address
  router.get('/lpers/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const details = await copyLPService.getLPerDetails(address);

      if (!details) {
        return res.status(404).json({
          success: false,
          error: 'LPer not found',
        });
      }

      res.json({
        success: true,
        lper: details,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/copy-lp/mirrors
  router.get('/mirrors', (req, res) => {
    try {
      const mirrors = copyLPService.getActiveMirrors();

      res.json({
        success: true,
        mirrors,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/copy-lp/mirrors
  router.post('/mirrors', async (req, res) => {
    try {
      const { lperAddress, options = {} } = req.body;

      if (!lperAddress) {
        return res.status(400).json({
          success: false,
          error: 'lperAddress is required',
        });
      }

      const mirror = await copyLPService.startMirroring(lperAddress, options);

      res.json({
        success: true,
        mirror,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // DELETE /api/copy-lp/mirrors/:id
  router.delete('/mirrors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const stopped = await copyLPService.stopMirroring(id);

      if (!stopped) {
        return res.status(404).json({
          success: false,
          error: 'Mirror not found',
        });
      }

      res.json({
        success: true,
        message: 'Mirror stopped',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // PATCH /api/copy-lp/mirrors/:id
  router.patch('/mirrors/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const mirror = copyLPService.updateMirror(id, updates);

      if (!mirror) {
        return res.status(404).json({
          success: false,
          error: 'Mirror not found',
        });
      }

      res.json({
        success: true,
        mirror,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/copy-lp/history
  router.get('/history', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const history = copyLPService.getMirrorHistory(limit);

      res.json({
        success: true,
        history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
};
