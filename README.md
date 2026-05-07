# LP Scout

AI-powered Meteora liquidity pool agent. Discover the best pools, manage positions, and execute Zap-In/Zap-Out operations with AI assistance. Now featuring autonomous rebalancing, chore automation, and copy trading.

## Features

- **AI Chat Agent**: Get personalized LP recommendations with real-time data
- **Pool Discovery**: Ranked pools by agentScore (composite of yield, volume, and quality)
- **Position Monitoring**: Real-time tracking of open positions with health indicators
- **Zap In/Out**: One-click entry and exit with strategy selection
- **Wallet Integration**: Phantom and Backpack wallet support
- **Rebalance Engine**: Autonomous position rebalancing with configurable parameters
- **Chore System**: Natural language task automation
- **Copy LP**: Mirror top-performing liquidity providers
- **MCP Server**: Model Context Protocol for agent interoperability

## Architecture

- **Frontend**: Next.js 14 + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API
- **Blockchain**: Solana (mainnet-beta)
- **LP Data**: LP Agent API
- **MCP**: Model Context Protocol server on port 4001

## Prerequisites

- Node.js 18+
- LP Agent API key (get from [lpagent.io](https://lpagent.io))
- Anthropic API key
- Solana wallet (Phantom or Backpack)

## Setup

### 1. Clone and Install

```bash
cd lp-scout
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Environment Variables

Create `.env.local` in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Create `.env` in the `server` directory:
```env
LP_AGENT_API_KEY=your_lp_agent_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=4000
# Optional: SOLANA_PRIVATE_KEY=your_private_key_for_server_signing
```

### 3. Run Development Servers

Start the Express backend:
```bash
cd server
npm run dev
```

In a new terminal, start the Next.js frontend:
```bash
cd lp-scout
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The MCP server runs automatically on port 4001.

## Usage

1. Connect your Solana wallet (Phantom or Backpack)
2. The AI agent will automatically analyze your portfolio
3. Browse top-ranked pools in the Pool Discovery tab
4. Chat with LP Scout for personalized recommendations
5. Click "Enter Pool" to Zap In with your chosen strategy
6. Monitor positions in the left panel
7. Exit positions via Zap Out when recommended
8. Configure the Rebalance Engine for autonomous management
9. Use the Copy LP tab to mirror top performers
10. Create chores via natural language instructions

## UI Layout

The 4-panel layout provides:
- **Left (25%)**: Position Panel - Your open positions with health indicators
- **Center (35%)**: Chat - AI assistant with alerts and action cards
- **Top Right (20%)**: Engine Panel - Autonomous rebalancing controls
- **Bottom Right (20%)**: Pool Discovery / Copy LP - Toggle between tabs

## Rebalance Engine

Configure autonomous position management:
- **Strategy**: Spot, Curve, or BidAsk
- **Bin Range**: 20-70 bins
- **Stop Loss**: -30% to -5%
- **Max Rebalances/Day**: 1-20

The engine monitors positions every 60 seconds and auto-rebalances when:
- Position goes out of range
- Volatility threshold exceeded
- Stop loss triggered
- Better opportunities detected

## Chore System

Create natural language tasks:
- "Rebalance my SOL-USDC position when it goes out of range"
- "Alert me when any position drops below -10% PnL"
- "Compound fees every 24 hours"
- "Exit all positions if TVL drops below $1M"

Chores are executed automatically based on conditions.

## Copy LP

Mirror top-performing liquidity providers:
- View ranked LPer list by score (PnL, win rate, diversification)
- Set maximum allocation limit
- Automatically copy position entries/exits
- Track mirror performance vs original

## Strategy Guide

- **Spot**: Equal distribution. Best for stable pairs like USDC/USDT.
- **Curve**: Concentrated around current price. Best for correlated assets like SOL/stSOL.
- **BidAsk**: Wide range. Best for volatile/directional pairs.

## API Endpoints (Backend)

### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pools/discover` | Get top pools with agentScore |
| GET | `/api/pools/:poolId` | Get pool details |
| GET | `/api/pools/:poolId/stats` | Get on-chain stats |
| GET | `/api/positions/opening` | Get open positions for wallet |
| GET | `/api/positions/overview` | Get portfolio overview |
| POST | `/api/pools/:poolId/zap-in` | Execute zap in |
| POST | `/api/positions/zap-out` | Execute zap out |
| POST | `/api/chat` | Stream AI responses |

### Engine Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/engine/config` | Get engine configuration |
| POST | `/api/engine/config` | Update configuration |
| GET | `/api/engine/status` | Get engine status |
| GET | `/api/engine/rebalances` | Get rebalance history |
| POST | `/api/engine/start` | Start engine |
| POST | `/api/engine/stop` | Stop engine |
| GET | `/api/engine/events` | SSE stream for events |

### Chores Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chores` | List active and completed chores |
| POST | `/api/chores` | Create new chore |
| GET | `/api/chores/:id` | Get chore details |
| DELETE | `/api/chores/:id` | Cancel chore |
| PATCH | `/api/chores/:id` | Update chore |
| POST | `/api/chores/run` | Trigger immediate check |
| GET | `/api/chores/events` | SSE stream for chore events |

### Copy LP Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/copy-lp/top-lpers` | Get top LPer list |
| GET | `/api/copy-lp/lpers/:address` | Get LPer details |
| GET | `/api/copy-lp/mirrors` | List active mirrors |
| POST | `/api/copy-lp/mirrors` | Start mirroring |
| DELETE | `/api/copy-lp/mirrors/:id` | Stop mirroring |
| PATCH | `/api/copy-lp/mirrors/:id` | Update mirror settings |
| GET | `/api/copy-lp/history` | Get mirror history |

### Agent Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agent/pools` | Get pools with agentScore |
| GET | `/api/agent/positions/:owner` | Get positions |
| POST | `/api/agent/analyze` | Analyze wallet |
| POST | `/api/agent/recommend` | Get AI recommendations |
| POST | `/api/agent/action` | Execute action |
| POST | `/api/agent/chat` | Chat with SSE |

## MCP Server

The Model Context Protocol server runs on port 4001 and provides:

- `get_pool_recommendations`: Get AI-powered pool recommendations
- `analyze_position`: Analyze a specific LP position
- `rebalance_position`: Rebalance a position to optimal range
- `get_engine_status`: Get status of the auto-rebalancing engine
- `configure_engine`: Configure the auto-rebalancing engine
- `create_chore`: Create a new chore/task for the agent
- `list_chores`: List active and completed chores
- `get_top_lpers`: Get list of top performing LPs
- `start_copy_lper`: Start copying a top LPer
- `zap_in`: Execute a zap-in to a pool
- `zap_out`: Execute a zap-out from a position

## agentScore Formula

```
agentScore = ((vol_24h * fee) / tvl) + (organic_score * 0.2) - (Math.abs(price_24h_change) * 0.1)
```

Higher is better. Considers realized yield, pool quality, and volatility penalty.

## Position Health

A position is considered healthy when:
- `inRange === true` (earning fees)
- `dpr > 0` (positive daily return)
- `pnl.percent > -5` (not heavily underwater)

Unhealthy positions get a yellow warning border in the UI.

## Tech Notes

- LP Agent API uses `stratergy` (not `strategy`) in the add-tx endpoint
- Position IDs are encrypted strings from LP Agent - pass them as-is
- The backend proxies all LP Agent calls to keep API keys server-side
- AI responses stream via Server-Sent Events
- MCP server uses stdio transport for compatibility

## Production Deployment

1. Set production API URLs in `.env.local`
2. Deploy Express server to your preferred host (Railway, Render, etc.)
3. Deploy Next.js to Vercel or similar
4. Update CORS settings in `server/index.js` if needed
5. Ensure environment variables are set on the server
6. MCP server runs automatically alongside the Express server

### Railway Deployment

The `railway.json` is configured for deployment:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "cd server && npm install"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

## License

MIT
