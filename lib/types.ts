export interface OrcaPool {
  address: string;
  name: string;
  token0_symbol: string;
  token1_symbol: string;
  token0_mint: string;
  token1_mint: string;
  tvl: number;
  vol_24h: number;
  fee_rate: number; // e.g., 0.0005 for 0.05%
  tick_spacing: number;
  price_24h_change: number;
  organic_score: number;
  agentScore?: number;
  current_price?: number;
  fee_tier_label?: string; // e.g., '0.05%'
  liquidity?: number;
  reward_mints?: string[];
}

export interface OrcaPosition {
  id: string; // position mint address
  pool_address: string;
  token0_symbol: string;
  token1_symbol: string;
  current_value_usd: number;
  pnl: {
    percent: number;
    usd: number;
  };
  dpr: number; // daily percentage return
  inRange: boolean;
  uncollected_fees_usd: number;
  age_days: number;
  isHealthy?: boolean;
  tick_lower: number;
  tick_upper: number;
  liquidity: number;
  fee_tier: number;
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
  strategy: 'FullRange' | 'Narrow' | 'Wide' | 'Custom';
  slippage_bps: number;
  fee_tier?: number;
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
  strategy?: 'FullRange' | 'Narrow' | 'Wide' | 'Custom';
  reason: string;
}

export interface ChatContext {
  topPools: OrcaPool[];
  openPositions: OrcaPosition[];
  portfolioOverview: PortfolioOverview | null;
}

export interface FeeTierRecommendation {
  pool_pair: string;
  recommended_tier: number;
  recommended_label: string;
  reason: string;
  expected_apr: number;
}

export interface ILProjection {
  position_id: string;
  price_change_pct: number;
  projected_il_pct: number;
  projected_value_usd: number;
  hedge_suggestion?: string;
}

export type Pool = OrcaPool;
export type Position = OrcaPosition;



// Token Launch Bootstrapper types
export interface LaunchConfig {
  pairName: string;
  recommendations: {
    feeTier: { tier: number; label: string; reason: string };
    tickRange: { type: string; tickLower: number; tickUpper: number; widthDescription: string; reasoning: string; expectedUtilization: string };
    minLiquidity: { minUSD: number; recommendedUSD: number; optimalUSD: number; reasoning: string };
    priceAnchor: { strategy: string; description: string; adjustment: number };
  };
  bootstrapPhases: { phase: number; name: string; targetUSD: number; description: string; actions: string[]; duration: string }[];
  revenue: { launchAssistFeeUSD: number; projectedReferralRevenueUSD: number };
  riskFactors: { level: string; factor: string; mitigation: string }[];
  estimatedAPR: { conservative: string; expected: string; optimistic: string };
}

// Migration types
export interface MigrationResult {
  canMigrate: boolean;
  source: any;
  orca: { pool: OrcaPool; projection: any };
  comparison: { aprDelta: number; aprDeltaPercent: string; feeSavingsUSD: string; capitalEfficiencyGain: string };
  migrationPath: { step: number; action: string; estimatedTime: string; gasCost: string }[];
  estimatedMigrationCost: { estimatedSOL: string; estimatedUSD: string; percentageOfPosition: string };
  breakEvenDays: number | null;
}

// Volume alert types
export interface VolumeAlert {
  id: string;
  type: string;
  severity: string;
  poolAddress: string;
  poolName: string;
  spikeRatio: string;
  baselineVolume24h: string;
  currentVolume24h: string;
  signal: string;
  reasoning: string;
  timestamp: string;
  estimatedFeeBoost: string;
}

// Leaderboard types
export interface LPer {
  rank: number;
  wallet: string;
  walletShort: string;
  displayName: string;
  totalValueUSD: number;
  poolsActive: number;
  primaryPool: string;
  apr30d: string;
  riskAdjustedYield: string;
  winRate: string;
  sharpeRatio: string;
  maxDrawdown: string;
  feesEarned30d: string;
  riskLevel: string;
  followers: number;
  isVerified: boolean;
  streakDays: number;
}

// Governance types
export interface Proposal {
  id: string;
  title: string;
  status: string;
  category: string;
  description: string;
  lpImpact: { affectedPools: string[] | string; impactDirection: string; impactLevel: string; reasoning: string };
  voting: { for: number; against: number; abstain: number; quorum: number };
  endsAt: string;
  implementedAt?: string;
}

// Multi-wallet types
export interface AggregatedPortfolio {
  organization: { id: string; name: string; walletCount: number };
  totalValueUSD: number;
  totalPnLUSD: number;
  totalPnLPercent: string;
  positionsCount: number;
  walletSummaries: any[];
  poolBreakdown: any[];
  riskFlags: any[];
  recommendations: any[];
}
