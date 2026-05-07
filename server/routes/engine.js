const express = require('express');
const router = express.Router();

/**
 * Engine Routes - Auto-rebalancing configuration and status
 */

module.exports = (rebalanceEngine) => {
  // GET /api/engine/config
  router.get('/config', (req, res) => {
    try {
      const config = rebalanceEngine.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/engine/config
  router.post('/config', (req, res) => {
    try {
      const updates = req.body;
      rebalanceEngine.updateConfig(updates);

      res.json({
        success: true,
        message: 'Configuration updated',
        config: rebalanceEngine.getConfig(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/engine/status
  router.get('/status', (req, res) => {
    try {
      const stats = rebalanceEngine.getStats();
      const isRunning = rebalanceEngine.isRunning;

      res.json({
        success: true,
        status: {
          isRunning,
          ...stats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/engine/rebalances
  router.get('/rebalances', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const log = rebalanceEngine.getRebalanceLog(limit);

      res.json({
        success: true,
        rebalances: log,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/engine/start
  router.post('/start', (req, res) => {
    try {
      rebalanceEngine.start();
      res.json({
        success: true,
        message: 'Engine started',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/engine/stop
  router.post('/stop', (req, res) => {
    try {
      rebalanceEngine.stop();
      res.json({
        success: true,
        message: 'Engine stopped',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/engine/events (SSE)
  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Listen to engine events
    const onRebalanceStart = (data) => {
      sendEvent({ type: 'REBALANCE_START', ...data });
    };

    const onRebalanceComplete = (data) => {
      sendEvent({ type: 'REBALANCE_COMPLETE', ...data });
    };

    const onEngineError = (data) => {
      sendEvent({ type: 'ENGINE_ERROR', ...data });
    };

    rebalanceEngine.on('rebalanceStart', onRebalanceStart);
    rebalanceEngine.on('rebalanceComplete', onRebalanceComplete);
    rebalanceEngine.on('engineError', onEngineError);

    // Keep connection alive
    const heartbeat = setInterval(() => {
      sendEvent({ type: 'HEARTBEAT', timestamp: new Date().toISOString() });
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      rebalanceEngine.off('rebalanceStart', onRebalanceStart);
      rebalanceEngine.off('rebalanceComplete', onRebalanceComplete);
      rebalanceEngine.off('engineError', onEngineError);
    });
  });

  return router;
};
