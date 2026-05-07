const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

// Import services
const { RebalanceEngine } = require('./services/rebalanceEngine');
const { ChoreRunner } = require('./services/choreRunner');
const { CopyLPService } = require('./services/copyLP');
const { LPScoutMCP } = require('./mcp/lpScoutMCP');

// Import routes
const engineRoutes = require('./routes/engine');
const choresRoutes = require('./routes/chores');
const copyLPRoutes = require('./routes/copyLP');
const agentRoutes = require('./routes/agent');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize services
const rebalanceEngine = new RebalanceEngine();
const choreRunner = new ChoreRunner();
const copyLPService = new CopyLPService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lp-scout-api',
    engine: rebalanceEngine.isRunning ? 'running' : 'stopped',
    activeChores: choreRunner.getActiveChores().length,
    activeMirrors: copyLPService.getActiveMirrors().length,
  });
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LP_AGENT_BASE_URL = 'https://api.lpagent.io/open-api/v1';

// Helper to make LP Agent API calls
async function lpAgentRequest(method, endpoint, data = null, params = null) {
  const config = {
    method,
    url: `${LP_AGENT_BASE_URL}${endpoint}`,
    headers: {
      'x-api-key': process.env.LP_AGENT_API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (data) config.data = data;
  if (params) config.params = params;

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('LP Agent API error:', error.response?.data || error.message);
    throw error;
  }
}

// Compute agentScore for a pool
function computeAgentScore(pool) {
  const { vol_24h, fee, tvl, organic_score, price_24h_change } = pool;
  const score = ((vol_24h * fee) / tvl) + (organic_score * 0.2) - (Math.abs(price_24h_change) * 0.1);
  return score;
}

// Mount new routes
app.use('/api/engine', engineRoutes(rebalanceEngine));
app.use('/api/chores', choresRoutes(choreRunner));
app.use('/api/copy-lp', copyLPRoutes(copyLPService));
app.use('/api/agent', agentRoutes(rebalanceEngine, choreRunner, copyLPService));

// GET /api/pools/discover
app.get('/api/pools/discover', async (req, res) => {
  try {
    const response = await lpAgentRequest('GET', '/pools/discover', null, req.query);

    // Handle different response formats
    let pools = Array.isArray(response) ? response : (response.data || response.pools || []);

    if (!Array.isArray(pools)) {
      console.error('Unexpected response format:', typeof response, response);
      return res.status(500).json({ error: 'Invalid response format from LP Agent' });
    }

    // Add agentScore to each pool and sort
    const poolsWithScore = pools.map(pool => ({
      ...pool,
      agentScore: computeAgentScore(pool),
    }));

    poolsWithScore.sort((a, b) => b.agentScore - a.agentScore);

    res.json(poolsWithScore);
  } catch (error) {
    console.error('Discover pools error:', error);
    res.status(500).json({ error: 'Failed to fetch pools', details: error.message });
  }
});

// GET /api/pools/:poolId
app.get('/api/pools/:poolId', async (req, res) => {
  try {
    const { poolId } = req.params;
    const data = await lpAgentRequest('GET', `/pools/${poolId}`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pool', details: error.message });
  }
});

// GET /api/pools/:poolId/stats
app.get('/api/pools/:poolId/stats', async (req, res) => {
  try {
    const { poolId } = req.params;
    const data = await lpAgentRequest('GET', `/pools/${poolId}/onchain-stats`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pool stats', details: error.message });
  }
});

// GET /api/positions/opening
app.get('/api/positions/opening', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'owner query param required' });
    }

    const response = await lpAgentRequest('GET', '/lp-positions/opening', null, { owner });

    // Handle different response formats
    let positions = Array.isArray(response) ? response : (response.data || response.positions || []);

    if (!Array.isArray(positions)) {
      console.error('Unexpected positions response format:', typeof response, response);
      return res.status(500).json({ error: 'Invalid response format from LP Agent' });
    }

    // Add isHealthy field to each position
    const positionsWithHealth = positions.map(position => ({
      ...position,
      isHealthy: position.inRange && position.dpr > 0 && position.pnl.percent > -5,
    }));

    res.json(positionsWithHealth);
  } catch (error) {
    console.error('Positions error:', error);
    res.status(500).json({ error: 'Failed to fetch positions', details: error.message });
  }
});

// GET /api/positions/overview
app.get('/api/positions/overview', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'owner query param required' });
    }

    const data = await lpAgentRequest('GET', '/lp-positions/overview', null, { owner });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview', details: error.message });
  }
});

// POST /api/pools/:poolId/zap-in
app.post('/api/pools/:poolId/zap-in', async (req, res) => {
  try {
    const { poolId } = req.params;
    const { owner, inputSOL, strategy, slippage_bps } = req.body;

    // Step 1: Get transaction
    const step1Data = await lpAgentRequest('POST', `/pools/${poolId}/add-tx`, {
      stratergy: strategy || 'Spot',
      owner,
      inputSOL,
      slippage_bps: slippage_bps || 500,
      mode: 'zap-in',
    });

    // Step 2: Submit transaction
    const step2Data = await lpAgentRequest('POST', `/pools/${poolId}/add-tx/submit`, step1Data);

    res.json(step2Data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to zap in', details: error.message });
  }
});

// POST /api/positions/zap-out
app.post('/api/positions/zap-out', async (req, res) => {
  try {
    const { positionId, bps } = req.body;

    // Step 1: Get quote
    const quote = await lpAgentRequest('POST', '/position/decrease-quotes', {
      id: positionId,
      bps,
    });

    // Step 2: Get transaction
    const tx = await lpAgentRequest('POST', '/position/decrease-tx', quote);

    // Step 3: Submit transaction
    const result = await lpAgentRequest('POST', '/position/decrease-tx/submit', tx);

    res.json({ ...result, quote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to zap out', details: error.message });
  }
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { messages, walletAddress, context } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemPrompt = `You are LP Scout, an expert AI agent for Meteora liquidity pool strategy on Solana.

You have access to real-time LP Agent data including:
- Top pools ranked by agentScore (a composite of realized fee yield, organic score, and volatility)
- The user's current open positions with PnL, DPR (daily profit rate), inRange status, and uncollected fees
- Portfolio overview metrics
- Rebalancing engine controls
- Chore/task management
- Copy LP functionality

Your personality: sharp, direct, like a degen who actually knows their numbers. No fluff. Give concrete recommendations with the data behind them.

When recommending a pool, always mention:
- The agentScore and what drives it
- 24h volume and fee rate
- Organic score (quality signal)
- Your recommended strategy: Spot (stable pairs), Curve (correlated assets), BidAsk (volatile/directional)

When reviewing positions, always check:
- inRange status (out of range = not earning fees)
- DPR trend
- PnL percent
- Age of position

When you recommend entering or exiting a position, end your message with a structured action block in this exact format:
<action>
{
  "type": "ZAP_IN" | "ZAP_OUT",
  "poolId": "pool_address_if_zap_in",
  "positionId": "position_id_if_zap_out",
  "inputSOL": number_if_zap_in,
  "bps": number_if_zap_out,
  "strategy": "Spot" | "Curve" | "BidAsk",
  "reason": "one sentence why"
}
</action>

Current context:
${JSON.stringify(context, null, 2)}`;

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.text) {
        fullResponse += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}

`);
      }
    }

    // Parse any action blocks
    const actionMatch = fullResponse.match(/<action>([\s\S]*?)<\/action>/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        res.write(`data: ${JSON.stringify({ action })}

`);
      } catch (e) {
        console.error('Failed to parse action block:', e);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}

`);
    res.end();
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}

`);
    res.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`LP Scout server running on port ${PORT}`);
  console.log(`Engine API available at /api/engine`);
  console.log(`Chores API available at /api/chores`);
  console.log(`Copy LP API available at /api/copy-lp`);
  console.log(`Agent API available at /api/agent`);
});

// Start MCP server
const mcpServer = new LPScoutMCP(rebalanceEngine, choreRunner, copyLPService);
mcpServer.start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  rebalanceEngine.stop();
  choreRunner.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  rebalanceEngine.stop();
  choreRunner.stop();
  process.exit(0);
});
