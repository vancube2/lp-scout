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

  // POST /api/agent/chat
  router.post('/chat', async (req, res) => {
    try {
      const { messages, walletAddress, context = {} } = req.body;

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const systemPrompt = `You are LP Scout, an expert AI agent for Meteora liquidity pool strategy on Solana.

You have access to:
- Real-time pool data with agentScore
- User's open positions with PnL, DPR, inRange status
- Rebalancing engine controls
- Chore/task management
- Copy LP functionality

Your personality: sharp, direct, data-driven. Give concrete recommendations.

When recommending actions, end with an action block:
<action>
{
  "type": "ZAP_IN|ZAP_OUT|REBALANCE|COMPOUND",
  "params": { ... }
}
</action>

Context:
${JSON.stringify(context, null, 2)}`;

      const stream = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          fullResponse += chunk.delta.text;
          res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
        }
      }

      // Parse any action blocks
      const actionMatch = fullResponse.match(
        /<action>([\s\S]*?)<\/action>/
      );
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1].trim());
          res.write(`data: ${JSON.stringify({ action })}\n\n`);
        } catch (e) {
          console.error('Failed to parse action block:', e);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message });
    }
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

async function executeZapIn(params) {
  // Implementation would go here
  return { status: 'pending', tx_hash: null };
}

async function executeZapOut(params) {
  // Implementation would go here
  return { status: 'pending', tx_hash: null };
}
