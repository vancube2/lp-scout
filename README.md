# LP Scout

AI-powered Meteora liquidity pool agent. Discover the best pools, manage positions, and execute Zap-In/Zap-Out operations with AI assistance.

## Features

- **AI Chat Agent**: Get personalized LP recommendations with real-time data
- **Pool Discovery**: Ranked pools by agentScore (composite of yield, volume, and quality)
- **Position Monitoring**: Real-time tracking of open positions with health indicators
- **Zap In/Out**: One-click entry and exit with strategy selection
- **Wallet Integration**: Phantom and Backpack wallet support

## Architecture

- **Frontend**: Next.js 14 + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API
- **Blockchain**: Solana (mainnet-beta)
- **LP Data**: LP Agent API

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

## Usage

1. Connect your Solana wallet (Phantom or Backpack)
2. The AI agent will automatically analyze your portfolio
3. Browse top-ranked pools in the right panel
4. Chat with LP Scout for personalized recommendations
5. Click "Enter Pool" to Zap In with your chosen strategy
6. Monitor positions in the left panel
7. Exit positions via Zap Out when recommended

## Strategy Guide

- **Spot**: Equal distribution. Best for stable pairs like USDC/USDT.
- **Curve**: Concentrated around current price. Best for correlated assets like SOL/stSOL.
- **BidAsk**: Wide range. Best for volatile/directional pairs.

## API Endpoints (Backend)

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

## Production Deployment

1. Set production API URLs in `.env.local`
2. Deploy Express server to your preferred host (Railway, Render, etc.)
3. Deploy Next.js to Vercel or similar
4. Update CORS settings in `server/index.js` if needed
5. Ensure environment variables are set on the server

## License

MIT
