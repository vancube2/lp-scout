const express = require('express');
const router = express.Router();

module.exports = (rebalanceEngine, choreRunner, copyLPService, orcaIndexer) => {
  // GET /api/agent/pools
  router.get('/pools', async (req, res) => {
    try {
      const pools = orcaIndexer.getTopPools(req.query.limit || 20);
      res.json({ success: true, pools });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/agent/positions/:owner
  router.get('/positions/:owner', async (req, res) => {
    try {
      const { owner } = req.params;
      const positions = orcaIndexer.getPositionsForOwner(owner);
      res.json({ success: true, positions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/agent/analyze
  router.post('/analyze', async (req, res) => {
    try {
      const { walletAddress } = req.body;
      const positions = orcaIndexer.getPositionsForOwner(walletAddress);
      const overview = orcaIndexer.getPortfolioOverview(walletAddress);
      const pools = orcaIndexer.getTopPools(5);

      // Simple analysis
      const healthy = positions.filter(p => p.isHealthy).length;
      const recommendations = pools.filter(p => 
        !positions.some(pos => pos.pool_address === p.address)
      ).slice(0, 3);

      res.json({
        success: true,
        analysis: {
          positions_count: positions.length,
          healthy_count: healthy,
          total_value: overview.total_value_usd,
          recommendations,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/agent/recommend
  router.post('/recommend', async (req, res) => {
    try {
      const { strategy = 'balanced', min_tvl = 1000000 } = req.body;
      let pools = orcaIndexer.getTopPools(50).filter(p => p.tvl >= min_tvl);

      if (strategy === 'conservative') {
        pools = pools.filter(p => Math.abs(p.price_24h_change) < 3);
      } else if (strategy === 'aggressive') {
        pools = pools.filter(p => p.fee_rate >= 0.003);
      }

      res.json({ success: true, pools: pools.slice(0, 10) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/agent/fee-tier/:pair
  router.get('/fee-tier/:pair', async (req, res) => {
    try {
      const { pair } = req.params;
      const volatility = parseFloat(req.query.volatility) || 5;
      const rec = orcaIndexer.getFeeTierRecommendation(pair, volatility);
      res.json({ success: true, recommendation: rec });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/agent/il-projection/:positionId
  router.get('/il-projection/:positionId', async (req, res) => {
    try {
      const { positionId } = req.params;
      const priceChange = parseFloat(req.query.priceChange) || 10;
      const projection = orcaIndexer.getILProjection(positionId, priceChange);
      res.json({ success: true, projection });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/agent/pool-depth/:poolAddress
  router.get('/pool-depth/:poolAddress', async (req, res) => {
    try {
      const { poolAddress } = req.params;
      const depth = orcaIndexer.getPoolDepth(poolAddress);
      res.json({ success: true, depth });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};