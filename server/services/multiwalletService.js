/**
 * Multi-Wallet Service - Institutional/DAO multi-wallet LP management
 * Aggregate positions across multiple wallets into unified dashboard
 */

class MultiWalletService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
    this.organizations = new Map(); // orgId -> { name, wallets[], settings }
  }

  createOrganization(name, ownerWallet) {
    const orgId = 'org_' + Date.now().toString(36);
    const org = {
      id: orgId,
      name,
      ownerWallet,
      wallets: [ownerWallet],
      createdAt: new Date().toISOString(),
      settings: {
        alertThresholds: {
          minHealthScore: 0.7,
          maxDrawdown: -10,
          minDPR: 0.0005,
        },
        autoRebalance: false,
        feeOptimization: true,
      },
    };
    this.organizations.set(orgId, org);
    return org;
  }

  addWallet(orgId, walletAddress) {
    const org = this.organizations.get(orgId);
    if (!org) return null;
    if (!org.wallets.includes(walletAddress)) {
      org.wallets.push(walletAddress);
    }
    return org;
  }

  removeWallet(orgId, walletAddress) {
    const org = this.organizations.get(orgId);
    if (!org) return null;
    org.wallets = org.wallets.filter(w => w !== walletAddress);
    return org;
  }

  getOrganization(orgId) {
    return this.organizations.get(orgId);
  }

  getAggregatedPortfolio(orgId) {
    const org = this.organizations.get(orgId);
    if (!org) return null;

    const allPositions = [];
    const walletSummaries = [];
    let totalValue = 0;
    let totalPnL = 0;

    for (const wallet of org.wallets) {
      const positions = this.indexer.getPositionsForOwner(wallet);
      const overview = this.indexer.getPortfolioOverview(wallet);
      
      allPositions.push(...positions.map(p => ({ ...p, wallet, walletShort: wallet.slice(0, 4) + '...' + wallet.slice(-4) })));
      
      walletSummaries.push({
        wallet,
        walletShort: wallet.slice(0, 4) + '...' + wallet.slice(-4),
        positionsCount: positions.length,
        totalValueUSD: overview.total_value_usd,
        totalPnLUSD: overview.total_pnl_usd,
        avgDPR: overview.avg_dpr,
        healthScore: this.calculateHealthScore(positions),
      });
      
      totalValue += overview.total_value_usd;
      totalPnL += overview.total_pnl_usd;
    }

    // Aggregate by pool
    const poolAggregation = {};
    for (const pos of allPositions) {
      const key = pos.pool_address;
      if (!poolAggregation[key]) {
        const pool = this.indexer.getPool(key);
        poolAggregation[key] = {
          poolAddress: key,
          pair: pos.token0_symbol + '/' + pos.token1_symbol,
          totalValueUSD: 0,
          totalLiquidity: 0,
          wallets: new Set(),
          positions: [],
        };
      }
      poolAggregation[key].totalValueUSD += pos.current_value_usd;
      poolAggregation[key].totalLiquidity += pos.liquidity;
      poolAggregation[key].wallets.add(pos.wallet);
      poolAggregation[key].positions.push(pos);
    }

    // Risk analysis
    const riskFlags = this.analyzeRisk(allPositions, org.settings);

    return {
      organization: { id: org.id, name: org.name, walletCount: org.wallets.length },
      totalValueUSD: totalValue,
      totalPnLUSD: totalPnL,
      totalPnLPercent: totalValue > 0 ? ((totalPnL / totalValue) * 100).toFixed(2) : '0',
      positionsCount: allPositions.length,
      walletSummaries: walletSummaries.sort((a, b) => b.totalValueUSD - a.totalValueUSD),
      poolBreakdown: Object.values(poolAggregation).map(p => ({
        ...p,
        wallets: Array.from(p.wallets).length,
        shareOfPortfolio: ((p.totalValueUSD / totalValue) * 100).toFixed(1) + '%',
      })).sort((a, b) => b.totalValueUSD - a.totalValueUSD),
      riskFlags,
      recommendations: this.generateRecommendations(allPositions, totalValue, org.settings),
    };
  }

  calculateHealthScore(positions) {
    if (positions.length === 0) return 100;
    const healthy = positions.filter(p => p.isHealthy).length;
    return Math.round((healthy / positions.length) * 100);
  }

  analyzeRisk(positions, settings) {
    const flags = [];
    
    const outOfRange = positions.filter(p => !p.inRange);
    if (outOfRange.length > 0) {
      flags.push({
        severity: 'high',
        type: 'OUT_OF_RANGE',
        message: ${outOfRange.length} position(s) out of range - earning zero fees,
        affectedPositions: outOfRange.map(p => p.id),
      });
    }

    const highIL = positions.filter(p => p.pnl.percent < settings.alertThresholds.maxDrawdown);
    if (highIL.length > 0) {
      flags.push({
        severity: 'medium',
        type: 'HIGH_IL',
        message: ${highIL.length} position(s) with drawdown > %,
        affectedPositions: highIL.map(p => p.id),
      });
    }

    const lowYield = positions.filter(p => p.dpr < settings.alertThresholds.minDPR);
    if (lowYield.length > 3) {
      flags.push({
        severity: 'low',
        type: 'LOW_YIELD',
        message: ${lowYield.length} positions underperforming on fees,
        recommendation: 'Consider rebalancing to higher-yield pools',
      });
    }

    return flags;
  }

  generateRecommendations(positions, totalValue, settings) {
    const recs = [];
    
    if (totalValue > 100000) {
      recs.push({
        type: 'INSTITUTIONAL',
        priority: 'high',
        message: 'Portfolio exceeds . Consider splitting across multiple wallets for risk management.',
        action: 'Review wallet allocation',
      });
    }

    const poolConcentration = positions.reduce((acc, p) => {
      const key = p.pool_address;
      acc[key] = (acc[key] || 0) + p.current_value_usd;
      return acc;
    }, {});
    
    const maxPoolShare = Math.max(...Object.values(poolConcentration)) / totalValue;
    if (maxPoolShare > 0.5) {
      recs.push({
        type: 'DIVERSIFICATION',
        priority: 'medium',
        message: Over 50% of portfolio in one pool. Consider diversification to reduce IL risk.,
        action: 'Explore new pools',
      });
    }

    const uncollectedTotal = positions.reduce((s, p) => s + p.uncollected_fees_usd, 0);
    if (uncollectedTotal > 100) {
      recs.push({
        type: 'FEE_HARVEST',
        priority: 'medium',
        message: $ in uncollected fees. Harvest and compound for better capital efficiency.,
        action: 'Harvest all fees',
      });
    }

    return recs;
  }

  compareWallets(orgId) {
    const portfolio = this.getAggregatedPortfolio(orgId);
    if (!portfolio) return null;

    return {
      walletComparison: portfolio.walletSummaries.map(w => ({
        ...w,
        shareOfPortfolio: ((w.totalValueUSD / portfolio.totalValueUSD) * 100).toFixed(1) + '%',
        performanceRank: 0, // will be set below
      })),
      topPerformer: portfolio.walletSummaries.reduce((best, w) =>
        parseFloat(w.totalPnLUSD) > parseFloat(best.totalPnLUSD) ? w : best, portfolio.walletSummaries[0]),
      needsAttention: portfolio.walletSummaries.filter(w => w.healthScore < 70),
    };
  }
}

module.exports = { MultiWalletService };
