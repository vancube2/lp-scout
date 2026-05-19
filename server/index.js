const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

// Import services
const { RebalanceEngine } = require('./services/rebalanceEngine');
const { ChoreRunner } = require('./services/choreRunner');
const { CopyLPService } = require('./services/copyLP');
const { OrcaIndexer } = require('./services/orcaIndexer');
const { FeeService } = require('./services/feeService');
const jitoService = require('./services/jitoService');

// Import routes
const engineRoutes = require('./routes/engine');
const choresRoutes = require('./routes/chores');
const copyLPRoutes = require('./routes/copyLP');
const agentRoutes = require('./routes/agent');
const jitoRoutes = require('./routes/jito');
const revenueRoutes = require('./routes/revenue');
const userRoutes = require('./routes/user');
const activitiesRoutes = require('./routes/activities');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Server keypair for signing (if private key provided)
let serverKeypair = null;
if (process.env.SOLANA_PRIVATE_KEY) {
  try {
    serverKeypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY));
    console.log('Server keypair loaded:', serverKeypair.publicKey.toBase58());
  } catch (err) {
    console.error('Failed to load server keypair:', err.message);
  }
}

app.use(cors());
app.use(express.json());

// Initialize services
const orcaIndexer = new OrcaIndexer();
const rebalanceEngine = new RebalanceEngine(orcaIndexer);
const choreRunner = new ChoreRunner(orcaIndexer);
const copyLPService = new CopyLPService(orcaIndexer);
const feeService = new FeeService();

if (serverKeypair) {
  rebalanceEngine.setServerKeypair(serverKeypair);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orca-lp-agent', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/engine', engineRoutes(rebalanceEngine));
app.use('/api/chores', choresRoutes(choreRunner));
app.use('/api/copy-lp', copyLPRoutes(copyLPService));
app.use('/api/agent', agentRoutes(rebalanceEngine, choreRunner, copyLPService, orcaIndexer));
app.use('/api/jito', jitoRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activities', activitiesRoutes);

// Chat endpoint - proxy to frontend API or handle directly
app.post('/api/chat', async (req, res) => {
  try {
    // Forward to frontend chat handler or handle here
    res.status(501).json({ error: 'Chat handled by frontend API route' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pool discovery endpoint
app.get('/api/pools/discover', async (req, res) => {
  try {
    const pools = orcaIndexer.getTopPools(req.query.limit || 20);
    res.json({ success: true, pools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Positions endpoint
app.get('/api/positions/opening', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) return res.status(400).json({ error: 'owner required' });
    const positions = orcaIndexer.getPositionsForOwner(owner);
    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Portfolio overview
app.get('/api/positions/overview', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) return res.status(400).json({ error: 'owner required' });
    const overview = orcaIndexer.getPortfolioOverview(owner);
    res.json({ success: true, overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fee tier recommendation
app.get('/api/pools/fee-tier-recommendation', async (req, res) => {
  try {
    const { pair, volatility7d } = req.query;
    const rec = orcaIndexer.getFeeTierRecommendation(pair, parseFloat(volatility7d) || 5);
    res.json({ success: true, recommendation: rec });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// IL projection
app.get('/api/positions/il-projection', async (req, res) => {
  try {
    const { positionId, priceChangePct } = req.query;
    const projection = orcaIndexer.getILProjection(positionId, parseFloat(priceChangePct) || 10);
    res.json({ success: true, projection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Orca LP Agent server running on port ${PORT}`);
  console.log('Orca Indexer initialized with', orcaIndexer.getTopPools(100).length, 'pools');
});

module.exports = app;