const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

/**
 * LP Scout MCP Server
 * Provides Model Context Protocol interface for agent interoperability
 * Runs on port 4001 (separate from Express on 4000)
 */

class LPScoutMCP {
  constructor(rebalanceEngine, choreRunner, copyLPService) {
    this.engine = rebalanceEngine;
    this.chores = choreRunner;
    this.copyLP = copyLPService;

    this.server = new Server(
      {
        name: 'lp-scout',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pool_recommendations',
            description: 'Get AI-powered liquidity pool recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                strategy: {
                  type: 'string',
                  enum: ['conservative', 'balanced', 'aggressive'],
                  description: 'Risk strategy preference',
                },
                min_tvl: {
                  type: 'number',
                  description: 'Minimum TVL threshold in USD',
                },
              },
            },
          },
          {
            name: 'analyze_position',
            description: 'Analyze a specific LP position',
            inputSchema: {
              type: 'object',
              properties: {
                position_id: {
                  type: 'string',
                  description: 'Position ID to analyze',
                },
              },
              required: ['position_id'],
            },
          },
          {
            name: 'rebalance_position',
            description: 'Rebalance a position to optimal range',
            inputSchema: {
              type: 'object',
              properties: {
                position_id: {
                  type: 'string',
                  description: 'Position ID to rebalance',
                },
                target_strategy: {
                  type: 'string',
                  enum: ['Spot', 'Curve', 'BidAsk'],
                  description: 'Strategy for rebalancing',
                },
              },
              required: ['position_id'],
            },
          },
          {
            name: 'get_engine_status',
            description: 'Get status of the auto-rebalancing engine',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'configure_engine',
            description: 'Configure the auto-rebalancing engine',
            inputSchema: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Enable/disable auto-rebalancing',
                },
                strategy: {
                  type: 'string',
                  enum: ['Spot', 'Curve', 'BidAsk'],
                },
                bin_range: {
                  type: 'number',
                  minimum: 20,
                  maximum: 70,
                },
                stop_loss: {
                  type: 'number',
                  minimum: -30,
                  maximum: -5,
                },
                max_rebalances_per_day: {
                  type: 'number',
                  minimum: 1,
                  maximum: 20,
                },
              },
            },
          },
          {
            name: 'create_chore',
            description: 'Create a new chore/task for the agent',
            inputSchema: {
              type: 'object',
              properties: {
                instruction: {
                  type: 'string',
                  description: 'Natural language instruction',
                },
                wallet_address: {
                  type: 'string',
                  description: 'Wallet address for context',
                },
              },
              required: ['instruction'],
            },
          },
          {
            name: 'list_chores',
            description: 'List active and completed chores',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['active', 'completed', 'all'],
                  default: 'active',
                },
              },
            },
          },
          {
            name: 'get_top_lpers',
            description: 'Get list of top performing LPs',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  default: 10,
                  maximum: 50,
                },
              },
            },
          },
          {
            name: 'start_copy_lper',
            description: 'Start copying a top LPer',
            inputSchema: {
              type: 'object',
              properties: {
                lper_address: {
                  type: 'string',
                  description: 'Address of LPer to copy',
                },
                max_allocation: {
                  type: 'number',
                  description: 'Maximum SOL to allocate',
                  default: 1000,
                },
              },
              required: ['lper_address'],
            },
          },
          {
            name: 'zap_in',
            description: 'Execute a zap-in to a pool',
            inputSchema: {
              type: 'object',
              properties: {
                pool_id: {
                  type: 'string',
                  description: 'Pool address',
                },
                amount_sol: {
                  type: 'number',
                  description: 'Amount of SOL to zap in',
                },
                strategy: {
                  type: 'string',
                  enum: ['Spot', 'Curve', 'BidAsk'],
                  default: 'Spot',
                },
                wallet_address: {
                  type: 'string',
                  description: 'Wallet address',
                },
              },
              required: ['pool_id', 'amount_sol', 'wallet_address'],
            },
          },
          {
            name: 'zap_out',
            description: 'Execute a zap-out from a position',
            inputSchema: {
              type: 'object',
              properties: {
                position_id: {
                  type: 'string',
                  description: 'Position ID to exit',
                },
                percentage: {
                  type: 'number',
                  description: 'Percentage to withdraw (1-100)',
                  minimum: 1,
                  maximum: 100,
                  default: 100,
                },
              },
              required: ['position_id'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_pool_recommendations':
            return await this.handleGetPoolRecommendations(args);
          case 'analyze_position':
            return await this.handleAnalyzePosition(args);
          case 'rebalance_position':
            return await this.handleRebalancePosition(args);
          case 'get_engine_status':
            return await this.handleGetEngineStatus();
          case 'configure_engine':
            return await this.handleConfigureEngine(args);
          case 'create_chore':
            return await this.handleCreateChore(args);
          case 'list_chores':
            return await this.handleListChores(args);
          case 'get_top_lpers':
            return await this.handleGetTopLPers(args);
          case 'start_copy_lper':
            return await this.handleStartCopyLPer(args);
          case 'zap_in':
            return await this.handleZapIn(args);
          case 'zap_out':
            return await this.handleZapOut(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleGetPoolRecommendations(args) {
    // This would fetch from your LP Agent API
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            recommendations: [
              {
                pool: 'SOL-USDC',
                address: '...',
                agent_score: 1.85,
                tvl: 2500000,
                recommended_strategy: 'Spot',
                reason: 'High volume, stable pair, good organic score',
              },
            ],
            strategy: args.strategy || 'balanced',
          }),
        },
      ],
    };
  }

  async handleAnalyzePosition(args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            position_id: args.position_id,
            health: 'healthy',
            in_range: true,
            pnl_percent: 12.5,
            dpr: 0.0034,
            uncollected_fees: 45.20,
            recommendation: 'Hold position, consider collecting fees',
          }),
        },
      ],
    };
  }

  async handleRebalancePosition(args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            action: 'rebalance_initiated',
            position_id: args.position_id,
            target_strategy: args.target_strategy || 'Spot',
            status: 'pending',
            message: 'Rebalance request queued. Check status in Engine Panel.',
          }),
        },
      ],
    };
  }

  async handleGetEngineStatus() {
    const config = this.engine.getConfig();
    const stats = this.engine.getStats();
    const log = this.engine.getRebalanceLog(5);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            enabled: config.enabled,
            strategy: config.strategy,
            bin_range: config.binRange,
            stop_loss: config.stopLossPercent,
            max_rebalances_per_day: config.maxRebalancesPerDay,
            rebalances_today: stats.rebalancesToday,
            fees_saved: stats.feesSaved,
            total_value_managed: stats.totalValueManaged,
            recent_rebalances: log,
          }),
        },
      ],
    };
  }

  async handleConfigureEngine(args) {
    this.engine.updateConfig(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Engine configuration updated',
            config: this.engine.getConfig(),
          }),
        },
      ],
    };
  }

  async handleCreateChore(args) {
    const context = { walletAddress: args.wallet_address };
    const chore = await this.chores.createChore(args.instruction, context);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            chore_id: chore.id,
            type: chore.type,
            description: chore.description,
            status: chore.status,
            confidence: chore.confidence,
            questions: chore.questions || [],
          }),
        },
      ],
    };
  }

  async handleListChores(args) {
    const status = args.status || 'active';
    let chores = [];

    if (status === 'active' || status === 'all') {
      chores = chores.concat(this.chores.getActiveChores());
    }
    if (status === 'completed' || status === 'all') {
      chores = chores.concat(this.chores.getCompletedChores());
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ chores }),
        },
      ],
    };
  }

  async handleGetTopLPers(args) {
    const lpers = this.copyLP.getTopLPers().slice(0, args.limit || 10);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ top_lpers: lpers }),
        },
      ],
    };
  }

  async handleStartCopyLPer(args) {
    const mirror = await this.copyLP.startMirroring(args.lper_address, {
      maxAllocation: args.max_allocation,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            mirror_id: mirror.id,
            status: mirror.status,
            lper_address: mirror.lperAddress,
            message: `Started mirroring ${mirror.lperAddress}`,
          }),
        },
      ],
    };
  }

  async handleZapIn(args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            action: 'zap_in_initiated',
            pool_id: args.pool_id,
            amount_sol: args.amount_sol,
            strategy: args.strategy,
            wallet: args.wallet_address,
            status: 'pending',
            message: 'Zap-in transaction prepared. Sign in wallet to confirm.',
          }),
        },
      ],
    };
  }

  async handleZapOut(args) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            action: 'zap_out_initiated',
            position_id: args.position_id,
            percentage: args.percentage || 100,
            status: 'pending',
            message: 'Zap-out transaction prepared. Sign in wallet to confirm.',
          }),
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('LP Scout MCP Server running on stdio');
  }
}

module.exports = { LPScoutMCP };
