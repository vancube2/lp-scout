/**
 * Fee Service - LP Scout Revenue System
 * Transparent fees: we only earn when users earn
 */

const FEE_WALLET = process.env.LP_SCOUT_FEE_WALLET;

const FEES = {
  ZAP_IN_BPS: 5,         // 0.05%
  PERFORMANCE_BPS: 50,   // 0.5% of profit only
  REBALANCE_BPS: 2,      // 0.02%
  YIELD_SHARE_BPS: 500,  // 5% of fees earned
  AGENT_ROUTING_BPS: 3,  // 0.03%
};

// Fee calculations — all return SOL amounts
function zapInFee(depositSOL) {
  return depositSOL * (FEES.ZAP_IN_BPS / 10000);
}

function performanceFee(positionValueSOL, pnlPercent) {
  if (pnlPercent <= 0) return 0;
  const profitSOL = positionValueSOL * (pnlPercent / 100);
  return profitSOL * (FEES.PERFORMANCE_BPS / 10000);
}

function rebalanceFee(positionValueSOL) {
  return positionValueSOL * (FEES.REBALANCE_BPS / 10000);
}

function yieldShareFee(collectedFeesSOL) {
  return collectedFeesSOL * (FEES.YIELD_SHARE_BPS / 10000);
}

function agentRoutingFee(routedSOL) {
  return routedSOL * (FEES.AGENT_ROUTING_BPS / 10000);
}

function buildFeeBreakdown(action, params) {
  switch (action) {
    case 'ZAP_IN': {
      const fee = zapInFee(params.depositSOL);
      return {
        fee,
        feeSOL: fee.toFixed(6),
        label: `LP Scout fee: ${fee.toFixed(6)} SOL (0.05%)`,
        netDeposit: params.depositSOL - fee,
        frameLine: null,
      };
    }
    case 'ZAP_OUT': {
      const fee = performanceFee(params.positionValueSOL, params.pnlPercent);
      const yieldFee = yieldShareFee(params.uncollectedFeesSOL || 0);
      const totalFee = fee + yieldFee;
      return {
        fee: totalFee,
        feeSOL: totalFee.toFixed(6),
        performanceFee: fee.toFixed(6),
        yieldFee: yieldFee.toFixed(6),
        label: totalFee > 0
          ? `LP Scout fee: ${totalFee.toFixed(6)} SOL`
          : `No fee — LP Scout only earns when you do`,
        frameLine: fee > 0
          ? `0.5% on your gain — you're up, we earn together`
          : `No profit, no fee. Always.`,
        netReceive: params.positionValueSOL - totalFee,
      };
    }
    case 'REBALANCE': {
      const fee = rebalanceFee(params.positionValueSOL);
      return {
        fee,
        feeSOL: fee.toFixed(6),
        label: `Rebalance fee: ${fee.toFixed(6)} SOL (0.02%)`,
        frameLine: `Engine pays for itself in hours of fees earned`,
      };
    }
    case 'YIELD': {
      const fee = yieldShareFee(params.collectedFeesSOL);
      return {
        fee,
        feeSOL: fee.toFixed(6),
        label: `Yield share: ${fee.toFixed(6)} SOL (5% of earned fees)`,
        netYield: params.collectedFeesSOL - fee,
        frameLine: `95% of your fees, kept by you`,
      };
    }
    default:
      return { fee: 0, label: 'No fee', frameLine: null };
  }
}

// Revenue tracking
const revenueLog = [];
let totalRevenue = { ZAP_IN: 0, ZAP_OUT: 0, REBALANCE: 0, YIELD: 0, AGENT: 0 };

function trackRevenue(action, feeSOL, wallet, meta = {}) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    feeSOL,
    wallet: wallet ? wallet.slice(0, 8) + '...' : 'agent',
    meta,
  };
  revenueLog.unshift(entry);
  if (revenueLog.length > 500) revenueLog.pop();
  totalRevenue[action] = (totalRevenue[action] || 0) + feeSOL;
}

function getRevenueSummary() {
  const total = Object.values(totalRevenue).reduce((s, v) => s + v, 0);
  return {
    totalSOL: total.toFixed(6),
    byAction: totalRevenue,
    recentLog: revenueLog.slice(0, 50),
    projectedMonthlySOL: (total * 30).toFixed(2),
  };
}

module.exports = {
  zapInFee,
  performanceFee,
  rebalanceFee,
  yieldShareFee,
  agentRoutingFee,
  buildFeeBreakdown,
  trackRevenue,
  getRevenueSummary,
  FEE_WALLET,
  FEES,
};
