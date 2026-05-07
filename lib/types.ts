export interface Pool {
  address: string;
  name: string;
  token0_symbol: string;
  token1_symbol: string;
  token0_mint: string;
  token1_mint: string;
  tvl: number;
  vol_24h: number;
  fee: number;
  organic_score: number;
  price_24h_change: number;
  agentScore?: number;
  bin_step?: number;
  base_fee?: number;
}

export interface Position {
  id: string;
  pool_address: string;
  token0_symbol: string;
  token1_symbol: string;
  current_value_usd: number;
  pnl: {
    percent: number;
    usd: number;
  };
  dpr: number;
  inRange: boolean;
  uncollected_fees_usd: number;
  age_days: number;
  isHealthy?: boolean;
  bin_lower?: number;
  bin_upper?: number;
}

export interface PortfolioOverview {
  total_value_usd: number;
  total_pnl_usd: number;
  total_pnl_percent: number;
  avg_dpr: number;
  positions_count: number;
}

export interface ZapInParams {
  owner: string;
  inputSOL: number;
  strategy: 'Spot' | 'Curve' | 'BidAsk';
  slippage_bps: number;
}

export interface ZapResult {
  tx_hash?: string;
  success: boolean;
  error?: string;
  quote?: {
    token0_out?: number;
    token1_out?: number;
    estimated_value_usd?: number;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: ActionData;
}

export interface ActionData {
  type: 'ZAP_IN' | 'ZAP_OUT';
  poolId?: string;
  positionId?: string;
  inputSOL?: number;
  bps?: number;
  strategy?: 'Spot' | 'Curve' | 'BidAsk';
  reason: string;
}

export interface ChatContext {
  topPools: Pool[];
  openPositions: Position[];
  portfolioOverview: PortfolioOverview | null;
}
