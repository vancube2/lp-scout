const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

/**
 * Agent Routes - Public API for agent economy
 * Exposes pool data, position info, and action execution
 */

module.exports = (rebalanceEngine, choreRunner, copyLPService) => {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // GET /api/agent/pools
  router.get('/pools', async (req, res) => {
    try {
      const response = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/discover`,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
          params: req.query,
        }
      );

      const pools = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      // Calculate agentScore for each pool
      const poolsWithScore = pools.map((pool) => ({
        ...pool,
        agent_score: computeAgentScore(pool),
      }));

      // Sort by agent score
      poolsWithScore.sort((a, b) => b.agent_score - a.agent_score);

      res.json({
        success: true,
        pools: poolsWithScore.slice(0, 20),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // GET /api/agent/positions/:owner
  router.get('/positions/:owner', async (req, res) => {
    try {
      const { owner } = req.params;

      const response = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/lp-positions/opening`,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
          params: { owner },
        }
      );

      const positions = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      res.json({
        success: true,
        positions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/agent/analyze
  router.post('/analyze', async (req, res) => {
    try {
      const { walletAddress, context = {} } = req.body;

      // Gather data
      const [poolsResponse, positionsResponse] = await Promise.all([
        axios.get(
          `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/discover`,
          {
            headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
            params: { limit: 10 },
          }
        ),
        walletAddress
          ? axios.get(
              `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/lp-positions/opening`,
              {
                headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
                params: { owner: walletAddress },
              }
            )
          : Promise.resolve({ data: [] }),
      ]);

      const pools = Array.isArray(poolsResponse.data)
        ? poolsResponse.data.slice(0, 5)
        : [];

      const positions = Array.isArray(positionsResponse.data)
        ? positionsResponse.data
        : [];

      const analysis = {
        top_pools: pools.map((p) => ({
          pair: `${p.token0_symbol}-${p.token1_symbol}`,
          address: p.address,
          agent_score: computeAgentScore(p),
          tvl: p.tvl,
          vol_24h: p.vol_24h,
          fee: p.fee,
        })),
        open_positions: positions,
        position_count: positions.length,
        total_value: positions.reduce(
          (sum, p) => sum + (p.current_value_usd || 0),
          0
        ),
        total_pnl: positions.reduce(
          (sum, p) => sum + (p.pnl?.usd || 0),
          0
        ),
        engine_status: rebalanceEngine.getConfig().enabled,
        active_chores: choreRunner.getActiveChores().length,
      };

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/agent/recommend
  router.post('/recommend', async (req, res) => {
    try {
      const { walletAddress, risk_profile = 'balanced' } = req.body;

      // Get top pools
      const poolsResponse = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/discover`,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
          params: { limit: 20 },
        }
      );

      const pools = Array.isArray(poolsResponse.data)
        ? poolsResponse.data
        : [];

      // Score and filter based on risk profile
      let recommendations = pools.map((pool) => ({
        ...pool,
        agent_score: computeAgentScore(pool),
      }));

      if (risk_profile === 'conservative') {
        recommendations = recommendations.filter(
          (p) =>
            p.organic_score > 0.7 &&
            Math.abs(p.price_24h_change) < 5 &&
            p.vol_24h / p.tvl > 0.05
        );
      } else if (risk_profile === 'aggressive') {
        recommendations = recommendations.filter(
          (p) => p.vol_24h / p.tvl > 0.1 && p.agent_score > 0.8
        );
      }

      // Sort by score
      recommendations.sort((a, b) => b.agent_score - a.agent_score);

      // Generate AI recommendation
      const systemPrompt = `You are LP Scout, an expert liquidity pool strategist on Solana.

Analyze these pools and provide a recommendation for a ${risk_profile} investor.

Top pools (sorted by agentScore):
${JSON.stringify(recommendations.slice(0, 5), null, 2)}

Provide:
1. Top 3 recommended pools with reasoning
2. Suggested strategy (Spot/Curve/BidAsk) for each
3. Risk assessment
4. Entry timing recommendation

Be concise and data-driven.`;

      const aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Recommend pools for ${risk_profile} risk profile`,
          },
        ],
      });

      res.json({
        success: true,
        recommendations: recommendations.slice(0, 5),
        analysis: aiResponse.content[0].text,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/agent/action
  router.post('/action', async (req, res) => {
    try {
      const { type, params } = req.body;

      let result;

      switch (type) {
        case 'zap_in':
          result = await executeZapIn(params);
          break;
        case 'zap_out':
          result = await executeZapOut(params);
          break;
        case 'rebalance':
          result = { status: 'queued', message: 'Rebalance requested' };
          break;
        case 'compound':
          result = { status: 'queued', message: 'Compound requested' };
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unknown action type: ${type}`,
          });
      }

      res.json({
        success: true,
        action: type,
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/agent/chat - MCP Connector Version
  router.post('/chat', async (req, res) => {
    try {
      const { messages, walletAddress, context = {}, autoExecute = false } = req.body;

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      const systemPrompt = buildMCPSystemPrompt(walletAddress, context);

      // Tool safety config
      const EXECUTION_TOOLS = [
        'execute_zap_in', 'execute_zap_out', 'execute_rebalance',
        'enable_auto_manage', 'start_copy_lp',
      ];

      const toolConfigs = {};
      if (!autoExecute) {
        EXECUTION_TOOLS.forEach(tool => { toolConfigs[tool] = { enabled: false }; });
      }

      const MCP_SERVER_URL = process.env.PUBLIC_URL
        ? `${process.env.PUBLIC_URL}/mcp`
        : `http://localhost:${process.env.PORT || 4000}/mcp`;

      const stream = await anthropic.beta.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
        mcp_servers: [{ type: 'url', url: MCP_SERVER_URL, name: 'lp-scout' }],
        tools: [{
          type: 'mcp_toolset',
          mcp_server_name: 'lp-scout',
          ...(Object.keys(toolConfigs).length > 0 && { configs: toolConfigs })
        }],
        stream: true,
        betas: ['mcp-client-2025-11-20'],
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            emit({ type: 'text', content: chunk.delta.text });
          }
        }
        if (chunk.type === 'content_block_start') {
          if (chunk.content_block.type === 'mcp_tool_use') {
            emit({ type: 'tool_call', tool: chunk.content_block.name, server: chunk.content_block.server_name, id: chunk.content_block.id });
          }
          if (chunk.content_block.type === 'mcp_tool_result') {
            emit({ type: 'tool_result', toolUseId: chunk.content_block.tool_use_id, isError: chunk.content_block.is_error });
          }
        }
        if (chunk.type === 'message_stop') { emit({ type: 'done' }); break; }
      }

      res.end();
    } catch (error) {
      console.error('Chat MCP error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  });

  // POST /api/agent/chat/confirm - Execute with autoExecute: true
  router.post('/chat/confirm', async (req, res) => {
    req.body.autoExecute = true;
    return router.handle(req, res);
  });

  return router;
};

// Helper function
function computeAgentScore(pool) {
  const { vol_24h, fee, tvl, organic_score, price_24h_change } = pool;
  const score =
    ((vol_24h * fee) / tvl) +
    organic_score * 0.2 -
    Math.abs(price_24h_change) * 0.1;
  return score;
}

function buildMCPSystemPrompt(walletAddress, context) {
  return `You are LP Scout — an elite autonomous Meteora LP agent on Solana.

YOU HAVE DIRECT TOOL ACCESS. You don't suggest actions — you execute them.

TOOL USAGE RULES:
1. For any information request → call the relevant tool immediately
2. For PREVIEW actions (preview_zap_in, preview_zap_out, preview_rebalance)
   → always call these BEFORE execution tools
3. For EXECUTION actions (execute_zap_in, execute_zap_out, execute_rebalance,
   enable_auto_manage, start_copy_lp) → only call if user has confirmed,
   or if they explicitly said "do it", "go ahead", "yes", "execute"
4. Always call get_positions first when user asks about their portfolio
5. Always call discover_pools first when user asks about best pools

RESPONSE FORMAT:
- Call tools silently — don't narrate that you're calling them
- After tool results come back, summarize in max 3 lines
- Always end with what just happened OR the next suggested action
- Positive numbers get ↑, negative get ↓
- Show SOL amounts to 4 decimal places

PROACTIVE BEHAVIOR — after get_positions, automatically flag:
- Any position where inRange=false → offer to rebalance immediately
- Any position where pnl.percent < -10 → flag as stop-loss candidate
- Any uncollectedFee > $5 → suggest collecting
- Auto-manage OFF with 2+ positions → suggest enabling once per session

FEE FRAMING:
- Always mention fees naturally, never apologetically
- "0.05% to enter — fair fee"
- "0.5% on your profit — we earn together"
- "No profit = no fee, always"
- "0.02% rebalance fee — pays for itself in hours"

JITO FRAMING — mention when executing:
- "Sending via Jito atomic bundle — MEV-shielded"
- "Both exit and re-entry land in the same block or neither does"
- "Landed in Xs via Jito"

CURRENT USER:
Wallet: ${walletAddress || "not connected"}`;
}

async function executeZapIn(params) {
  // Implementation would go here
  return { status: 'pending', tx_hash: null };
}

async function executeZapOut(params) {
  // Implementation would go here
  return { status: 'pending', tx_hash: null };
}
