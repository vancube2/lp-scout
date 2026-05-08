const express = require('express');
const router = express.Router();

// Store active SSE connections
const clients = new Map();

// GET /api/activities - SSE stream for real-time activity updates
router.get('/', (req, res) => {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'wallet query param required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Store this client connection
  if (!clients.has(wallet)) {
    clients.set(wallet, []);
  }
  clients.get(wallet).push(res);

  // Send initial heartbeat
  res.write('data: {"type":"connected"}\n\n');

  // Send welcome activity
  const welcomeActivity = {
    type: 'activity',
    payload: {
      id: `welcome-${Date.now()}`,
      type: 'connected',
      description: 'Connected to live updates',
      timestamp: new Date().toISOString(),
    },
  };
  res.write(`data: ${JSON.stringify(welcomeActivity)}\n\n`);

  // Clean up on disconnect
  req.on('close', () => {
    const walletClients = clients.get(wallet);
    if (walletClients) {
      const index = walletClients.indexOf(res);
      if (index > -1) {
        walletClients.splice(index, 1);
      }
      if (walletClients.length === 0) {
        clients.delete(wallet);
      }
    }
  });

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write('data: {"type":"heartbeat"}\n\n');
    }
  }, 30000);

  // Clean up heartbeat on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// POST /api/activities/emit - Internal endpoint to emit activities
// This would be called by other services (rebalance engine, etc.)
router.post('/emit', (req, res) => {
  const { wallet, activity } = req.body;

  if (!wallet || !activity) {
    return res.status(400).json({ error: 'wallet and activity required' });
  }

  // Emit to all connected clients for this wallet
  const walletClients = clients.get(wallet);
  if (walletClients) {
    const message = {
      type: 'activity',
      payload: {
        id: `act_${Date.now()}`,
        ...activity,
        timestamp: new Date().toISOString(),
      },
    };

    walletClients.forEach(client => {
      if (!client.writableEnded) {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    });
  }

  res.json({ success: true });
});

module.exports = router;
