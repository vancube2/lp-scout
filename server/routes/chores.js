const express = require('express');
const router = express.Router();

/**
 * Chores Routes - Task management and execution
 */

module.exports = (choreRunner) => {
  // GET /api/chores
  router.get('/', (req, res) => {
    try {
      const active = choreRunner.getActiveChores();
      const completed = choreRunner.getCompletedChores(10);

      res.json({
        success: true,
        chores: {
          active,
          completed,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/chores
  router.post('/', async (req, res) => {
    try {
      const { instruction, walletAddress, context = {} } = req.body;

      if (!instruction) {
        return res.status(400).json({
          success: false,
          error: 'instruction is required',
        });
      }

      const chore = await choreRunner.createChore(instruction, {
        walletAddress,
        ...context,
      });

      res.json({
        success: true,
        chore,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/chores/:id
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const chore = choreRunner.getChoreById(id);

      if (!chore) {
        return res.status(404).json({
          success: false,
          error: 'Chore not found',
        });
      }

      res.json({
        success: true,
        chore,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // DELETE /api/chores/:id (cancel)
  router.delete('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const cancelled = choreRunner.cancelChore(id);

      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Chore not found or already completed',
        });
      }

      res.json({
        success: true,
        message: 'Chore cancelled',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // PATCH /api/chores/:id
  router.patch('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const chore = choreRunner.updateChore(id, updates);

      if (!chore) {
        return res.status(404).json({
          success: false,
          error: 'Chore not found',
        });
      }

      res.json({
        success: true,
        chore,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/chores/run
  router.post('/run', async (req, res) => {
    try {
      // Trigger immediate chore check
      await choreRunner.checkChores();

      res.json({
        success: true,
        message: 'Chore check completed',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/chores/events (SSE)
  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Listen to chore events
    const onChoreCreated = (data) => {
      sendEvent({ type: 'CHORE_CREATED', ...data });
    };

    const onChoreExecuting = (data) => {
      sendEvent({ type: 'CHORE_EXECUTING', ...data });
    };

    const onChoreCompleted = (data) => {
      sendEvent({ type: 'CHORE_COMPLETED', ...data });
    };

    const onChoreFailed = (data) => {
      sendEvent({ type: 'CHORE_FAILED', ...data });
    };

    const onChoreCancelled = (data) => {
      sendEvent({ type: 'CHORE_CANCELLED', ...data });
    };

    choreRunner.on('choreCreated', onChoreCreated);
    choreRunner.on('choreExecuting', onChoreExecuting);
    choreRunner.on('choreCompleted', onChoreCompleted);
    choreRunner.on('choreFailed', onChoreFailed);
    choreRunner.on('choreCancelled', onChoreCancelled);

    // Keep connection alive
    const heartbeat = setInterval(() => {
      sendEvent({ type: 'HEARTBEAT', timestamp: new Date().toISOString() });
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      choreRunner.off('choreCreated', onChoreCreated);
      choreRunner.off('choreExecuting', onChoreExecuting);
      choreRunner.off('choreCompleted', onChoreCompleted);
      choreRunner.off('choreFailed', onChoreFailed);
      choreRunner.off('choreCancelled', onChoreCancelled);
    });
  });

  return router;
};
