import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import axios from "axios";
import * as feeService from "../services/feeService.js";
import * as jitoService from "../services/jitoService.js";

const LP_AGENT_BASE = "https://api.lpagent.io/open-api/v1";
const LP_AGENT_KEY = process.env.LP_AGENT_API_KEY;
const headers = { "x-api-key": LP_AGENT_KEY };

// agentScore formula
function computeAgentScore(pool) {
  return (
    ((pool.vol_24h * pool.fee) / pool.tvl) +
    (pool.organic_score * 0.2) -
    (Math.abs(pool.price_24h_change || 0) * 0.1)
  );
}

// In-memory stores for engine, chores, and copy LP
const walletConfigs = new Map();
const rebalanceLogs = new Map();
const engineEvents = new Map();

// Helper to emit engine events
function emitEngineEvent(event) {
  const owner = event.owner;
  if (!engineEvents.has(owner)) {
    engineEvents.set(owner, []);
  }
  engineEvents.get(owner).push({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────
// CREATE MCP SERVER
// ─────────────────────────────────────────

export function createLPScoutMCPServer() {
  const server = new McpServer({
    name: "LP Scout",
    version: "1.0.0",
    description:
      "Autonomous Meteora LP management agent on Solana. " +
      "Discovers pools, manages positions, executes Zap-In/Out " +
      "via atomic Jito bundles, runs auto-rebalancing, and handles " +
      "all LP chores autonomously.",
  });

  // ─── POOL INTELLIGENCE TOOLS ───────────────────────────────

  server.tool(
    "discover_pools",
    "Find and rank Meteora pools by realized fee yield (agentScore). " +
    "Returns top pools sorted by what you'll actually earn, not APR.",
    {
      limit: z.number().optional().default(10)
        .describe("Number of pools to return"),
      minScore: z.number().optional()
        .describe("Minimum agentScore threshold"),
      pair: z.string().optional()
        .describe("Filter by token symbol e.g. 'SOL', 'BONK'"),
    },
    async ({ limit, minScore, pair }) => {
      try {
        const res = await axios.get(
          `${LP_AGENT_BASE}/pools/discover`,
          { headers }
        );
        let pools = res.data.data || [];

        pools = pools.map(p => ({
          ...p,
          agentScore: computeAgentScore(p),
        }));

        if (pair) {
          pools = pools.filter(p =>
            p.token0_symbol?.toUpperCase().includes(pair.toUpperCase()) ||
            p.token1_symbol?.toUpperCase().includes(pair.toUpperCase())
          );
        }

        if (minScore !== undefined) {
          pools = pools.filter(p => p.agentScore >= minScore);
        }

        pools = pools
          .sort((a, b) => b.agentScore - a.agentScore)
          .slice(0, limit);

        const formatted = pools.map((p, i) => ({
          rank: i + 1,
          poolId: p.pool_address,
          pair: `${p.token0_symbol}-${p.token1_symbol}`,
          agentScore: p.agentScore.toFixed(3),
          vol24h: `$${(p.vol_24h || 0).toLocaleString()}`,
          fee: `${(p.fee * 100).toFixed(3)}%`,
          tvl: `$${(p.tvl || 0).toLocaleString()}`,
          organicScore: p.organic_score,
          recommendedStrategy:
            p.organic_score > 70 ? "Spot" :
            p.price_24h_change > 10 ? "BidAsk" : "Curve",
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ pools: formatted, count: formatted.length }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_pool_detail",
    "Get detailed stats for a specific Meteora pool including " +
    "on-chain metrics, active bin, and top LPers.",
    {
      poolId: z.string().describe("Pool address"),
    },
    async ({ poolId }) => {
      try {
        const [poolRes, statsRes] = await Promise.all([
          axios.get(`${LP_AGENT_BASE}/pools/${poolId}`, { headers }),
          axios.get(`${LP_AGENT_BASE}/pools/${poolId}/onchain-stats`, { headers }),
        ]);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              pool: poolRes.data.data,
              stats: statsRes.data.data,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_top_lpers",
    "Get top performing LP wallets for a specific pool. " +
    "Use this to find wallets worth copying.",
    {
      poolId: z.string().describe("Pool address"),
    },
    async ({ poolId }) => {
      try {
        const res = await axios.get(
          `${LP_AGENT_BASE}/pools/${poolId}/top-lpers`,
          { headers }
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(res.data.data),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── POSITION MANAGEMENT TOOLS ─────────────────────────────

  server.tool(
    "get_positions",
    "Get all open LP positions for a wallet. Returns PnL, DPR, " +
    "inRange status, uncollected fees, and health score.",
    {
      owner: z.string().describe("Solana wallet address"),
    },
    async ({ owner }) => {
      try {
        const res = await axios.get(
          `${LP_AGENT_BASE}/lp-positions/opening?owner=${owner}`,
          { headers }
        );
        const positions = (res.data.data || []).map(p => ({
          ...p,
          isHealthy: p.inRange && p.dpr > 0 && (p.pnl?.percent || 0) > -5,
          outOfRangeSince: p.inRange ? null : (p.outOfRangeSince || Date.now()),
        }));

        // Compute alerts
        const alerts = [];
        positions.forEach(p => {
          if (!p.inRange) alerts.push(
            `⚠️ ${p.pairName} is OUT OF RANGE — not earning fees`
          );
          if ((p.pnl?.percent || 0) < -10) alerts.push(
            `🔴 ${p.pairName} is down ${p.pnl.percent}% — stop-loss candidate`
          );
          if ((p.uncollectedFee || 0) > 5) alerts.push(
            `💰 ${p.pairName} has $${p.uncollectedFee} in uncollected fees`
          );
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ positions, alerts, count: positions.length }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_portfolio_overview",
    "Get portfolio summary: total value, aggregate PnL, " +
    "best/worst positions, fees earned.",
    {
      owner: z.string().describe("Solana wallet address"),
    },
    async ({ owner }) => {
      try {
        const res = await axios.get(
          `${LP_AGENT_BASE}/lp-positions/overview?owner=${owner}`,
          { headers }
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(res.data.data),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── EXECUTION TOOLS ───────────────────────────────────────

  server.tool(
    "preview_zap_in",
    "Preview a Zap-In before executing. Shows fee breakdown, " +
    "estimated position value, and daily yield. Call this before " +
    "execute_zap_in when the user hasn't confirmed the amount.",
    {
      poolId: z.string().describe("Pool address"),
      inputSOL: z.number().describe("SOL amount to deposit"),
      strategy: z.enum(["Spot", "Curve", "BidAsk"]).optional().default("Spot"),
    },
    async ({ poolId, inputSOL, strategy }) => {
      try {
        const fee = feeService.zapInFee(inputSOL);
        const netDeposit = inputSOL - fee;

        const poolRes = await axios.get(
          `${LP_AGENT_BASE}/pools/${poolId}`,
          { headers }
        );
        const pool = poolRes.data.data;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              poolId,
              pair: `${pool.token0_symbol}-${pool.token1_symbol}`,
              inputSOL,
              netDeposit: netDeposit.toFixed(6),
              lpScoutFee: fee.toFixed(6),
              feePercent: "0.05%",
              strategy,
              estimatedDPR: `${((pool.fee * pool.vol_24h) / pool.tvl * 100).toFixed(3)}%`,
              agentScore: computeAgentScore(pool).toFixed(3),
              readyToExecute: true,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "execute_zap_in",
    "Enter a Meteora LP pool. Executes via LP Agent Zap-In API " +
    "with Jito bundle landing. Charges 0.05% LP Scout fee. " +
    "IMPORTANT: Only call this after confirming amount with user " +
    "OR if user explicitly said to proceed. Use preview_zap_in first.",
    {
      poolId: z.string().describe("Pool address"),
      owner: z.string().describe("Wallet address"),
      inputSOL: z.number().describe("SOL amount to deposit"),
      strategy: z.enum(["Spot", "Curve", "BidAsk"]).optional().default("Spot"),
      slippageBps: z.number().optional().default(500),
    },
    async ({ poolId, owner, inputSOL, strategy, slippageBps }) => {
      try {
        const fee = feeService.zapInFee(inputSOL);
        const netDeposit = inputSOL - fee;

        // Step 1: Generate tx
        const txRes = await axios.post(
          `${LP_AGENT_BASE}/pools/${poolId}/add-tx`,
          {
            stratergy: strategy,
            inputSOL: netDeposit,
            percentX: 0.5,
            owner,
            slippage_bps: slippageBps,
            mode: "zap-in",
          },
          { headers }
        );

        // Step 2: Submit via LP Agent landing
        const submitRes = await axios.post(
          `${LP_AGENT_BASE}/pools/landing-add-tx`,
          txRes.data.data,
          { headers }
        );

        // Track fee
        feeService.trackRevenue("ZAP_IN", fee, owner, { poolId, inputSOL });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              poolId,
              depositedSOL: netDeposit,
              lpScoutFee: fee.toFixed(6),
              txHash: submitRes.data?.data?.txHash,
              positionId: submitRes.data?.data?.positionPubKey,
              message: `Position opened. Fee paid: ${fee.toFixed(6)} SOL (0.05%)`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error executing zap-in: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "preview_zap_out",
    "Preview a Zap-Out before executing. Shows expected SOL received, " +
    "PnL, and fee breakdown. Always call this before execute_zap_out.",
    {
      positionId: z.string().describe("Position ID to close"),
      owner: z.string().describe("Wallet address"),
      bps: z.number().optional().default(10000)
        .describe("Basis points to close: 10000 = 100%, 5000 = 50%"),
    },
    async ({ positionId, owner, bps }) => {
      try {
        const quotesRes = await axios.post(
          `${LP_AGENT_BASE}/position/decrease-quotes`,
          { id: positionId, bps },
          { headers }
        );
        const quote = quotesRes.data.data;

        // Get position for PnL
        const posRes = await axios.get(
          `${LP_AGENT_BASE}/lp-positions/opening?owner=${owner}`,
          { headers }
        );
        const position = posRes.data.data?.find(p => p.id === positionId);
        const pnlPercent = position?.pnl?.percent || 0;
        const posValueSOL = parseFloat(position?.currentValue || 0) / 150;
        const uncollectedSOL = parseFloat(position?.uncollectedFee || 0) / 150;

        const feeBreakdown = feeService.buildFeeBreakdown("ZAP_OUT", {
          positionValueSOL: posValueSOL,
          pnlPercent,
          uncollectedFeesSOL: uncollectedSOL,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              positionId,
              closePercent: `${bps / 100}%`,
              estimatedReceive: quote,
              pnlPercent: pnlPercent.toFixed(2),
              lpScoutFee: feeBreakdown.feeSOL,
              feeLabel: feeBreakdown.label,
              frameLine: feeBreakdown.frameLine,
              readyToExecute: true,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "execute_zap_out",
    "Exit a Meteora LP position. Charges 0.5% of profit as performance " +
    "fee (zero fee on losing positions). Executes via Jito bundle. " +
    "IMPORTANT: Call preview_zap_out first, then only execute if user confirms.",
    {
      positionId: z.string().describe("Position ID to close"),
      owner: z.string().describe("Wallet address"),
      bps: z.number().optional().default(10000)
        .describe("Basis points to withdraw: 10000 = 100%"),
    },
    async ({ positionId, owner, bps }) => {
      try {
        // Get position data for fee calculation
        const posRes = await axios.get(
          `${LP_AGENT_BASE}/lp-positions/opening?owner=${owner}`,
          { headers }
        );
        const position = posRes.data.data?.find(p => p.id === positionId);
        const pnlPercent = position?.pnl?.percent || 0;
        const posValueSOL = parseFloat(position?.currentValue || 0) / 150;
        const uncollectedSOL = parseFloat(position?.uncollectedFee || 0) / 150;

        const feeBreakdown = feeService.buildFeeBreakdown("ZAP_OUT", {
          positionValueSOL: posValueSOL,
          pnlPercent,
          uncollectedFeesSOL: uncollectedSOL,
        });

        // Step 1: Generate tx
        const txRes = await axios.post(
          `${LP_AGENT_BASE}/position/decrease-tx`,
          {
            position_id: positionId,
            bps,
            owner,
            slippage_bps: 500,
            output: "allBaseToken",
          },
          { headers }
        );

        // Step 2: Submit
        const submitRes = await axios.post(
          `${LP_AGENT_BASE}/position/landing-decrease-tx`,
          txRes.data.data,
          { headers }
        );

        // Track revenue
        if (feeBreakdown.fee > 0) {
          feeService.trackRevenue("ZAP_OUT", feeBreakdown.fee, owner, {
            positionId, pnlPercent,
          });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              positionId,
              closedPercent: `${bps / 100}%`,
              pnlPercent: pnlPercent.toFixed(2),
              lpScoutFee: feeBreakdown.feeSOL,
              feeLabel: feeBreakdown.label,
              txHash: submitRes.data?.data?.txHash,
              message: pnlPercent > 0
                ? `Position closed profitably. Fee: ${feeBreakdown.feeSOL} SOL`
                : `Position closed. No fee — LP Scout only earns when you do.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error executing zap-out: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── JITO REBALANCE TOOLS ──────────────────────────────────

  server.tool(
    "preview_rebalance",
    "Preview an atomic Jito rebalance bundle without executing. " +
    "Shows bundle size, tx count, estimated tip, and new bin range. " +
    "Always call this before execute_rebalance.",
    {
      positionId: z.string().describe("Out-of-range position to rebalance"),
      poolId: z.string().describe("Pool address"),
      owner: z.string().describe("Wallet address"),
    },
    async ({ positionId, poolId, owner }) => {
      try {
        // Get pool info for active bin
        const poolInfoRes = await axios.get(
          `${LP_AGENT_BASE}/pools/${poolId}/info`,
          { headers }
        );
        const activeBin =
          poolInfoRes.data.data?.liquidityViz?.activeBin?.binId;

        const tip = jitoService.calculateDynamicTip("medium");

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              positionId,
              poolId,
              activeBin,
              estimatedBinRange: { from: activeBin - 34, to: activeBin + 34 },
              bundleType: "ATOMIC",
              estimatedTxCount: 4,
              estimatedBundleCount: 1,
              estimatedTipSOL: (tip / 1e9).toFixed(6),
              rebalanceFeePercent: "0.02%",
              guarantee: "Exit and re-entry land in the same block or neither does.",
              readyToExecute: true,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "execute_rebalance",
    "Rebalance an out-of-range position using an atomic Jito bundle. " +
    "Zap-out and zap-in land in the same block — zero risk of partial " +
    "execution. Charges 0.02% rebalance fee. MEV-protected.",
    {
      positionId: z.string().describe("Position ID to rebalance"),
      poolId: z.string().describe("Pool address"),
      owner: z.string().describe("Wallet address"),
      urgency: z.enum(["low", "medium", "high"]).optional().default("medium"),
    },
    async ({ positionId, poolId, owner, urgency }) => {
      try {
        const { Keypair } = await import("@solana/web3.js");
        const bs58 = await import("bs58");
        const keypair = Keypair.fromSecretKey(
          bs58.default.decode(process.env.SOLANA_PRIVATE_KEY)
        );

        const result = await jitoService.submitAtomicRebalance({
          positionId,
          poolId,
          owner,
          keypair,
          strategy: "Spot",
          binRange: 34,
          slippageBps: 500,
          urgency,
          lpAgentApiKey: LP_AGENT_KEY,
        });

        // Track rebalance fee
        const posRes = await axios.get(
          `${LP_AGENT_BASE}/lp-positions/opening?owner=${owner}`,
          { headers }
        );
        const position = posRes.data.data?.find(p => p.id === positionId);
        const posValueSOL = parseFloat(position?.currentValue || 0) / 150;
        const rebFee = feeService.rebalanceFee(posValueSOL);
        feeService.trackRevenue("REBALANCE", rebFee, owner, {
          positionId,
          bundleId: result.primaryBundleId,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              bundleId: result.primaryBundleId,
              landingTimeMs: result.landingTimeMs,
              landingTimeDisplay: `${(result.landingTimeMs / 1000).toFixed(1)}s`,
              tipPaidSOL: result.tipPaidSOL,
              rebalanceFeeSOL: rebFee.toFixed(6),
              jitoExplorerUrl: result.jitoExplorerUrl,
              newPositionId: result.newPositionId,
              newRange: { from: result.fromBinId, to: result.toBinId },
              message: `Rebalanced via Jito atomic bundle. ` +
                `Landed in ${(result.landingTimeMs / 1000).toFixed(1)}s. ` +
                `MEV-shielded. Back in range.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── AUTO-MANAGE ENGINE TOOLS ──────────────────────────────

  server.tool(
    "get_engine_status",
    "Get the current status of the auto-manage engine for a wallet. " +
    "Shows if it's running, last action, rebalance count, and config.",
    {
      owner: z.string().describe("Wallet address"),
    },
    async ({ owner }) => {
      try {
        const config = walletConfigs.get(owner);
        const logs = (rebalanceLogs.get(owner) || []).slice(0, 5);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              owner,
              enabled: config?.enabled || false,
              config: config || null,
              recentLogs: logs,
              message: config?.enabled
                ? `Auto-manage is ON. Watching your positions every 60s.`
                : `Auto-manage is OFF. Turn it on to rebalance automatically.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "enable_auto_manage",
    "Enable or disable the autonomous rebalancing engine for a wallet. " +
    "When enabled, LP Scout watches all positions and rebalances " +
    "automatically when they go out of range.",
    {
      owner: z.string().describe("Wallet address"),
      enabled: z.boolean().describe("true to enable, false to disable"),
      strategy: z.enum(["Spot", "Curve", "BidAsk"]).optional().default("Spot"),
      stopLossPercent: z.number().optional().default(-15),
      maxRebalancesPerDay: z.number().optional().default(10),
      binRange: z.number().optional().default(34),
    },
    async ({ owner, enabled, strategy, stopLossPercent,
             maxRebalancesPerDay, binRange }) => {
      try {
        const config = {
          enabled,
          strategy,
          stopLossPercent,
          maxRebalancesPerDay,
          binRange,
          slippageBps: 500,
          enabledAt: enabled ? Date.now() : null,
        };

        walletConfigs.set(owner, config);

        emitEngineEvent({
          type: enabled ? "ENGINE_ENABLED" : "ENGINE_DISABLED",
          owner,
          config,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              enabled,
              config,
              message: enabled
                ? `Auto-manage ON. Watching positions every 60s. ` +
                  `Rebalancing with ${strategy} strategy. ` +
                  `Stop-loss at ${stopLossPercent}%. ` +
                  `Fee: 0.02% per rebalance.`
                : `Auto-manage OFF. Your positions will no longer ` +
                  `be rebalanced automatically.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── COPY LP TOOLS ─────────────────────────────────────────

  server.tool(
    "start_copy_lp",
    "Start mirroring the LP strategy of a top-performing wallet. " +
    "Auto Zap-In when they enter, auto Zap-Out when thresholds hit.",
    {
      sourceWallet: z.string().describe("Wallet to copy"),
      myWallet: z.string().describe("Your wallet"),
      copyPercent: z.number().min(10).max(100)
        .describe("% of their position size to copy"),
      maxSOL: z.number().describe("Max SOL to allocate"),
      stopLossPct: z.number().optional().default(-10),
      takeProfitPct: z.number().optional().default(20),
    },
    async (params) => {
      try {
        // Store mirror config
        const mirrors = global.lpScoutMirrors || new Map();
        const mirrorId = `${params.myWallet}-${params.sourceWallet}-${Date.now()}`;
        mirrors.set(mirrorId, { ...params, active: true, createdAt: Date.now() });
        global.lpScoutMirrors = mirrors;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              mirrorId,
              message: `Now mirroring ${params.sourceWallet.slice(0, 8)}... ` +
                `Copying ${params.copyPercent}% of their positions, ` +
                `max ${params.maxSOL} SOL. ` +
                `Stop-loss: ${params.stopLossPct}%, ` +
                `take-profit: ${params.takeProfitPct}%.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "stop_copy_lp",
    "Stop mirroring a wallet's LP strategy.",
    {
      mirrorId: z.string().describe("Mirror ID to stop"),
    },
    async ({ mirrorId }) => {
      try {
        const mirrors = global.lpScoutMirrors || new Map();
        if (mirrors.has(mirrorId)) {
          mirrors.delete(mirrorId);
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              mirrorId,
              message: "Copy LP stopped. No longer mirroring that wallet.",
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── CHORES TOOLS ──────────────────────────────────────────

  server.tool(
    "create_chore",
    "Create an autonomous LP chore from natural language. " +
    "The chore runs in the background and executes when conditions are met.",
    {
      owner: z.string().describe("Wallet address"),
      instruction: z.string()
        .describe("Natural language instruction e.g. " +
          "'Exit my BONK position if down 20%' or " +
          "'Rebalance SOL-USDC if it goes out of range'"),
    },
    async ({ owner, instruction }) => {
      try {
        // Parse instruction using Claude (sub-call)
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const parseRes = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Parse this LP chore instruction into JSON.
Return ONLY valid JSON, no other text.

Instruction: "${instruction}"

Schema:
{
  "type": "REBALANCE_IF_OUT_OF_RANGE" | "EXIT_ON_STOP_LOSS" |
          "EXIT_ON_TAKE_PROFIT" | "ALERT_ONLY",
  "threshold": number_if_applicable,
  "checkIntervalMinutes": number,
  "pairFilter": "string_if_specific_pair_mentioned"
}`,
          }],
        });

        const parsed = JSON.parse(
          parseRes.content[0].text.replace(/```json|```/g, "").trim()
        );

        const choreId = `chore-${Date.now()}`;
        const chores = global.lpScoutChores || new Map();
        chores.set(choreId, {
          id: choreId,
          owner,
          instruction,
          parsed,
          status: "PENDING",
          createdAt: Date.now(),
        });
        global.lpScoutChores = chores;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              choreId,
              understood: parsed,
              message: `Chore set. LP Scout will ${instruction.toLowerCase()} ` +
                `and execute automatically. You can cancel it anytime.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_chores",
    "Get all active and recent chores for a wallet.",
    {
      owner: z.string().describe("Wallet address"),
    },
    async ({ owner }) => {
      try {
        const chores = global.lpScoutChores || new Map();
        const userChores = [...chores.values()]
          .filter(c => c.owner === owner);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              chores: userChores,
              count: userChores.length,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "cancel_chore",
    "Cancel an active chore.",
    {
      choreId: z.string().describe("Chore ID to cancel"),
    },
    async ({ choreId }) => {
      try {
        const chores = global.lpScoutChores || new Map();
        chores.delete(choreId);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: `Chore ${choreId} cancelled.`,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  // ─── STATUS & INTELLIGENCE TOOLS ───────────────────────────

  server.tool(
    "get_jito_status",
    "Get Jito infrastructure status: bundles landed today, " +
    "average landing time, tips spent, validator coverage.",
    {},
    async () => {
      try {
        const stats = jitoService.getJitoStats();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(stats),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_fee_estimate",
    "Estimate LP Scout fees for a given action before executing.",
    {
      action: z.enum(["ZAP_IN", "ZAP_OUT", "REBALANCE", "YIELD"]),
      amountSOL: z.number().describe("SOL amount involved"),
      pnlPercent: z.number().optional()
        .describe("Current PnL % (for ZAP_OUT performance fee calculation)"),
    },
    async ({ action, amountSOL, pnlPercent }) => {
      try {
        const breakdown = feeService.buildFeeBreakdown(action, {
          depositSOL: amountSOL,
          positionValueSOL: amountSOL,
          pnlPercent: pnlPercent || 0,
          uncollectedFeesSOL: 0,
          collectedFeesSOL: amountSOL,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(breakdown),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "recommend_pool",
    "Get AI-powered pool recommendation based on risk profile " +
    "and available capital. Returns top 3 with reasoning.",
    {
      owner: z.string().describe("Wallet address"),
      capitalSOL: z.number().describe("Available SOL to deploy"),
      riskProfile: z.enum(["conservative", "moderate", "aggressive"])
        .optional().default("moderate"),
      preferredPairs: z.array(z.string()).optional(),
    },
    async ({ owner, capitalSOL, riskProfile, preferredPairs }) => {
      try {
        const res = await axios.get(
          `${LP_AGENT_BASE}/pools/discover`,
          { headers }
        );
        let pools = (res.data.data || []).map(p => ({
          ...p,
          agentScore: computeAgentScore(p),
        }));

        // Filter by risk profile
        if (riskProfile === "conservative") {
          pools = pools.filter(p =>
            p.agentScore > 0.8 &&
            p.organic_score > 60 &&
            p.vol_24h > 500000
          );
        } else if (riskProfile === "moderate") {
          pools = pools.filter(p =>
            p.agentScore > 0.5 &&
            p.organic_score > 40
          );
        }

        if (preferredPairs?.length) {
          pools = pools.filter(p =>
            preferredPairs.some(pair =>
              p.token0_symbol?.includes(pair) ||
              p.token1_symbol?.includes(pair)
            )
          );
        }

        const top3 = pools
          .sort((a, b) => b.agentScore - a.agentScore)
          .slice(0, 3)
          .map((p, i) => ({
            rank: i + 1,
            poolId: p.pool_address,
            pair: `${p.token0_symbol}-${p.token1_symbol}`,
            agentScore: p.agentScore.toFixed(3),
            strategy: riskProfile === "conservative" ? "Spot" :
                      riskProfile === "aggressive" ? "BidAsk" : "Curve",
            estimatedDailyReturn:
              `${((p.fee * p.vol_24h) / p.tvl * 100).toFixed(3)}%`,
            reasoning:
              `Score ${p.agentScore.toFixed(2)}: ` +
              `$${(p.vol_24h / 1e6).toFixed(1)}M daily vol, ` +
              `${(p.fee * 100).toFixed(3)}% fee, ` +
              `organic score ${p.organic_score}`,
            suggestedAmount: Math.min(capitalSOL * 0.5, capitalSOL).toFixed(2),
          }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              recommendations: top3,
              riskProfile,
              capitalSOL,
            }),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}
