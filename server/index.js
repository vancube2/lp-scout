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
const { LPScoutMCP } = require('./mcp/lpScoutMCP');
const jitoService = require('./services/jitoService');
const feeService = require('./services/feeService');

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
const rebalanceEngine = new RebalanceEngine();
const choreRunner = new ChoreRunner();
const copyLPService = new CopyLPService();

// Pass server keypair to rebalance engine if available
if (serverKeypair) {
  rebalanceEngine.setServerKeypair(serverKeypair);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lp-scout-api',
    engine: rebalanceEngine.isRunning ? 'running' : 'stopped',
    activeChores: choreRunner.getActiveChores().length,
    activeMirrors: copyLPService.getActiveMirrors().length,
    jitoEnabled: !!serverKeypair,
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
app.use('/api/jito', jitoRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activities', activitiesRoutes);

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

// GET /api/pools/live-tickers (for onboarding - no auth required)
app.get('/api/pools/live-tickers', async (req, res) => {
  try {
    const response = await lpAgentRequest('GET', '/pools/discover', null, { limit: 5 });
    let pools = Array.isArray(response) ? response : (response.data || response.pools || []);

    if (!Array.isArray(pools)) {
      return res.status(500).json({ error: 'Invalid response' });
    }

    const tickers = pools.slice(0, 5).map(pool => {
      const agentScore = computeAgentScore(pool);
      const dailyYield = ((pool.vol_24h * pool.fee) / pool.tvl) * 100;
      return {
        pair: `${pool.token0_symbol}-${pool.token1_symbol}`,
        dpr: dailyYield,
        tvl: pool.tvl,
        agentScore,
      };
    });

    res.json(tickers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Calculate fee
    const feeBreakdown = feeService.buildFeeBreakdown('ZAP_IN', { depositSOL: inputSOL });
    const netDeposit = feeBreakdown.netDeposit;

    // Step 1: Get transaction with net deposit
    const step1Data = await lpAgentRequest('POST', `/pools/${poolId}/add-tx`, {
      stratergy: strategy || 'Spot',
      owner,
      inputSOL: netDeposit,
      slippage_bps: slippage_bps || 500,
      mode: 'zap-in',
    });

    // Step 2: Submit transaction
    const step2Data = await lpAgentRequest('POST', `/pools/${poolId}/add-tx/submit`, step1Data);

    // Track revenue
    feeService.trackRevenue('ZAP_IN', feeBreakdown.fee, owner, {
      poolId,
      strategy,
      depositSOL: inputSOL,
    });

    res.json({
      ...step2Data,
      feeBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to zap in', details: error.message });
  }
});

// POST /api/positions/zap-out
app.post('/api/positions/zap-out', async (req, res) => {
  try {
    const { positionId, bps, owner } = req.body;

    // Get position info for fee calculation
    const positionsRes = await lpAgentRequest('GET', '/lp-positions/opening', null, { owner });
    const positions = Array.isArray(positionsRes) ? positionsRes : (positionsRes.data || []);
    const position = positions.find(p => p.id === positionId);

    // Calculate fee if position found
    let feeBreakdown = null;
    if (position) {
      const positionValueSOL = parseFloat(position.current_value_usd) / 150;
      const uncollectedFeesSOL = parseFloat(position.uncollected_fees_usd || 0) / 150;
      feeBreakdown = feeService.buildFeeBreakdown('ZAP_OUT', {
        positionValueSOL,
        pnlPercent: position.pnl?.percent || 0,
        uncollectedFeesSOL,
      });

      // Track revenue
      feeService.trackRevenue('ZAP_OUT', feeBreakdown.fee, owner, {
        positionId,
        pnl: position.pnl?.percent,
      });
    }

    // Step 1: Get quote
    const quote = await lpAgentRequest('POST', '/position/decrease-quotes', {
      id: positionId,
      bps,
    });

    // Step 2: Get transaction
    const tx = await lpAgentRequest('POST', '/position/decrease-tx', quote);

    // Step 3: Submit transaction
    const result = await lpAgentRequest('POST', '/position/decrease-tx/submit', tx);

    res.json({
      ...result,
      quote,
      feeBreakdown,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to zap out', details: error.message });
  }
});

// POST /api/agent/execute (with fee tracking)
app.post('/api/agent/execute', async (req, res) => {
  try {
    const { action, wallet, params } = req.body;

    // Calculate agent routing fee
    const routedSOL = params.inputSOL || 0;
    const agentFee = feeService.agentRoutingFee(routedSOL);
    feeService.trackRevenue('AGENT', agentFee, wallet, { action, params });

    res.json({
      success: true,
      fee: agentFee,
      message: 'Agent routing fee tracked',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { messages, walletAddress, context, hasWallet } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const basePrompt = `You are LP Scout — an elite Meteora LP co-pilot on Solana.

PERSONALITY:
- Sharp, direct, zero fluff
- You make decisions and tell users what to do — not just options
- You're genuinely excited about yield
- You celebrate wins. Honest about losses without drama.
- Speak like a degen who knows the numbers
- Max 3 lines per response unless user asks for detail
- Always end with a clear action when relevant

FORMATTING RULES — STRICT:
- Never use bullet points or headers in chat
- Never say "I'd recommend" — say "Do this"
- Never say "you might want to" — say "you should" or "don't"
- Numbers always include $ or SOL unit
- Positive numbers get ↑, negative get ↓

RESPONSE TEMPLATES:
Status check:
"[Headline stat].
[One supporting detail].
[Action]"

Recommendation:
"[Pool]. [Why in one number].
[One risk if any].
[Action button text]"

Win:
"[Position] up [amount].
[What caused it].
[Next move]"

Problem:
"[Position] out of range — [missed fees] since [time].
One tap to fix."

FEE FRAMING — always transparent, always positive:
- Zap fee: "0.05% to enter — that's it"
- Performance fee: "0.5% on your profit — we earn together"
- No profit: "No fee — LP Scout only earns when you do"
- Rebalance: "0.02% — engine pays for itself in hours"
Never apologize for fees. They're fair and you know it.

JITO — mention casually when executing:
"Sending via Jito atomic bundle — MEV-shielded."
"Landed in 1.8s."
"Exit and re-entry land in the same block or neither does."`;

  // Different context based on wallet connection
  let walletSpecificPrompt = '';
  if (hasWallet && walletAddress) {
    walletSpecificPrompt = `

The user has a wallet connected (${walletAddress}). You can see their:
- Open positions: ${context.openPositions?.length || 0} positions
- Portfolio value: $${context.portfolioOverview?.total_value_usd?.toFixed(2) || '0'}

Provide personalized advice based on their holdings. If they have positions, analyze their health and suggest improvements. If they're asking for recommendations, consider their current allocations.`;
  } else {
    walletSpecificPrompt = `

The user does NOT have a wallet connected yet. This is a DEMO/BROWSE mode.

IMPORTANT:
- Still provide full, detailed analysis of pools and market conditions
- Give recommendations as if they were going to invest
- Explain that connecting their wallet will show personalized recommendations based on their actual holdings
- Be helpful and encouraging - don't just say "connect your wallet" - give them actual value!
- Share market insights, strategy explanations, and pool rankings
- If they ask about strategies, explain in detail with examples
- If they ask about pools, analyze the top pools thoroughly

Current market data available:
- Top ${context.topPools?.length || 0} pools ranked by agentScore
- Real-time volume, TVL, and fee data`;
  }

  const systemPrompt = basePrompt + walletSpecificPrompt + `

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LP Scout server running on port ${PORT}`);
  console.log(`Engine API available at /api/engine`);
  console.log(`Chores API available at /api/chores`);
  console.log(`Copy LP API available at /api/copy-lp`);
  console.log(`Agent API available at /api/agent`);
  console.log(`Jito API available at /api/jito`);
  console.log(`User API available at /api/user`);
  console.log(`MCP endpoint available at /mcp`);
});

// MCP endpoint for Anthropic connector (stateless HTTP transport)
// This must be publicly accessible via HTTPS for hackathon demos
// Use ngrok: ngrok http 4000, then set PUBLIC_URL in .env
app.post('/mcp', async (req, res) => {
  try {
    // Dynamic import for ES modules
    const { createLPScoutMCPServer } = await import('./mcp/lpScoutMCPServer.mjs');
    const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');

    const mcpServer = createLPScoutMCPServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    res.on('close', () => transport.close());

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// MCP capabilities endpoint for external agents
app.get('/mcp/capabilities', (req, res) => {
  res.json({
    agent: 'LP Scout',
    version: '1.0.0',
    mcpEndpoint: `${process.env.PUBLIC_URL || `http://localhost:${PORT}`}/mcp`,
    tools: [
      'discover_pools', 'get_pool_detail', 'get_top_lpers',
      'get_positions', 'get_portfolio_overview',
      'preview_zap_in', 'execute_zap_in',
      'preview_zap_out', 'execute_zap_out',
      'preview_rebalance', 'execute_rebalance',
      'get_engine_status', 'enable_auto_manage',
      'start_copy_lp', 'stop_copy_lp',
      'create_chore', 'get_chores', 'cancel_chore',
      'get_jito_status', 'get_fee_estimate', 'recommend_pool',
    ],
  });
});

// Keep old MCP server for backward compatibility (stdio for local CLI)
async function startMCPIOld() {
  try {
    const mcpServer = new LPScoutMCP(rebalanceEngine, choreRunner, copyLPService);
    await mcpServer.start();
  } catch (error) {
    console.error('Legacy MCP server failed to start:', error.message);
  }
}
startMCPIOld();

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
