# Orca LP Agent

AI-powered Orca Whirlpools liquidity management platform. Discover the best pools, manage concentrated liquidity positions, and optimize yield with AI assistance. Built exclusively for the Orca ecosystem on Solana.

## What Makes This Different

- **Orca-Only**: Every feature, every recommendation, every data point is tailored specifically for Orca Whirlpools
- **Fee-Only Revenue**: No subscriptions, no paywalls. We only earn when you earn or transact. Transparent fees shown before every action.
- **Concentrated Liquidity Native**: Built from the ground up for Orca's tick-based concentrated liquidity model (not retrofitted from bin-based systems)
- **Ecosystem-Beneficial**: Features designed to grow Orca TVL, help new projects bootstrap liquidity, and make Orca the default LP destination

## Features

### Core
- **Pool Discovery**: Ranked Orca pools by agentScore (composite of yield, volume, quality, and fee tier optimization)
- **Position Monitoring**: Real-time tracking of open Orca positions with health indicators, tick range status, and uncollected fees
- **Zap In/Out**: One-click entry and exit with strategy selection (Full Range, Narrow, Wide, Custom)
- **Wallet Integration**: Phantom, Backpack, Solflare support via Solana Wallet Adapter

### Orca-Specific Intelligence
- **Fee Tier Optimizer**: Automatically recommends the optimal Orca fee tier (0.01%, 0.05%, 0.30%, 1.00%) based on pair volatility and historical data
- **Tick Range Advisor**: Suggests optimal tick ranges for each strategy type
- **IL Projection Calculator**: Real-time impermanent loss projections with hedge suggestions
- **Pool Depth Visualizer**: Shows liquidity distribution across price ticks for any Orca pool
- **Cross-Tier Yield Comparison**: Compare the same token pair across different Orca fee tiers to find the best APR

### Automation
- **Rebalance Engine**: Autonomous position rebalancing with configurable parameters
- **Auto-Compound**: Automatically collect and reinvest earned fees back into position
- **Chore System**: Natural language task automation ('Rebalance my SOL-USDC position when it goes out of range')
- **Copy LP**: Mirror top-performing Orca liquidity providers

### AI Chat
- **Orca-Native AI**: Claude-powered assistant trained specifically on Orca Whirlpools mechanics, fee structures, and strategies
- **Personalized Advice**: Analyzes your actual holdings when wallet is connected
- **Market Insights**: Real-time analysis of top pools, volume spikes, and opportunity alerts

## Fee Structure (Fee-Only Model)

We believe in aligned incentives. No monthly fees. No subscription tiers. You only pay when the product creates value for you.

| Action | Fee | When Applied |
|--------|-----|--------------|
| Zap In | 0.05% | On deposit into pool |
| Performance | 0.5% | On profit when exiting (no profit = no fee) |
| Rebalance | 0.02% | Per automated rebalance execution |
| Yield Share | 5% | Of fees earned (collected via auto-harvest) |
| Auto-Compound | 1% | Of compounded amount |
| Copy Trading | 2% | Of follower yield (paid by follower, to original LP) |

**Transparency**: Every fee is shown in the UI before you confirm any transaction. We never hide fees or charge subscription fees.

## How This Benefits the Orca Ecosystem

1. **TVL Growth**: By making LPing easier and more profitable, we attract more liquidity to Orca pools
2. **New Project Bootstrapping**: Fee Tier Optimizer and Pool Discovery help new tokens choose Orca as their primary DEX
3. **Educational Value**: AI chat and IL projections help users understand concentrated liquidity, reducing bad experiences and churn
4. **Volume Retention**: By optimizing fee tiers and ranges, we ensure pools capture maximum trading volume
5. **Data Transparency**: Pool depth visualizer and cross-tier comparisons showcase Orca's efficient capital utilization
6. **User Migration**: Tools and analytics that demonstrate Orca's advantages over other DEXs

## Architecture

- **Frontend**: Next.js 14 + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (Orca-specialized prompts)
- **Blockchain**: Solana (mainnet-beta)
- **LP Data**: Orca Whirlpools SDK + Custom Indexer

## Setup

### 1. Install Dependencies

```bash
cd lp-scout
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Environment Variables

Create `.env.local` in the root:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Create `.env` in the `server` directory:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=4000
# Optional: SOLANA_PRIVATE_KEY=your_private_key_for_server_signing
# Optional: ORCA_LP_FEE_WALLET=your_fee_collection_wallet
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

Open http://localhost:3000 in your browser.

## API Endpoints

### Agent
- `GET /api/agent/pools` - Get top Orca pools with agentScore
- `GET /api/agent/positions/:owner` - Get Orca positions for wallet
- `POST /api/agent/analyze` - Analyze wallet portfolio
- `POST /api/agent/recommend` - Get AI recommendations
- `GET /api/agent/fee-tier/:pair` - Fee tier recommendation
- `GET /api/agent/il-projection/:positionId` - IL projection
- `GET /api/agent/pool-depth/:poolAddress` - Liquidity depth

### Core
- `GET /api/pools/discover` - Discover top Orca pools
- `GET /api/positions/opening` - Get open positions
- `GET /api/positions/overview` - Portfolio overview

## Revenue Projections

With the fee-only model, revenue scales with user activity and TVL managed:

- **Conservative**: 100 active users, $5M TVL managed = ~$500-1000/month in fees
- **Growth**: 1,000 active users, $50M TVL = ~$5,000-15,000/month
- **Scale**: 10,000+ users, $500M+ TVL = ~$50,000-150,000/month

Key growth levers:
1. Auto-compound adoption (recurring fee stream)
2. Copy-trading network effects
3. Protocol integrations (new projects using our bootstrapper)
4. Whale LP management (high-value accounts)

## Future Roadmap

- **Orca Governance Integration**: Voting power tracking and proposal impact analysis
- **Token Launch Bootstrapper**: Guided flow for new projects to create optimal Orca pools
- **Mobile App**: React Native app for position alerts and quick actions
- **Institutional Dashboard**: Multi-wallet portfolio management for DAOs and funds
- **Advanced Hedging**: Integration with perp protocols to hedge IL exposure
- **Social LP Leaderboards**: Gamified rankings of top Orca LPs

## License

MIT