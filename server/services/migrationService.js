/**
 * Migration Service - Helps LPs migrate from Raydium, Meteora, Uniswap to Orca
 * Side-by-side yield comparisons and migration path recommendations
 */

class MigrationService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
    this.competitorData = new Map();
  }

  /**
   * Analyze a position on another DEX and recommend Orca migration
   */
  analyzeMigration(sourceDEX, poolPair, currentPositionValue, currentAPR, options = {}) {
    const pairLower = poolPair.toLowerCase();
    const orcaPools = this.findOrcaEquivalentPools(poolPair);
    
    if (orcaPools.length === 0) {
      return {
        canMigrate: false,
        reason: 'No Orca pool exists for this pair yet. Use Token Launch Bootstrapper to create one.',
        action: 'CREATE_POOL',
      };
    }

    const bestOrcaPool = orcaPools[0];
    const sourceInfo = this.getSourceDEXInfo(sourceDEX, poolPair, currentPositionValue, currentAPR);
    const orcaProjection = this.projectOrcaYield(bestOrcaPool, currentPositionValue, options);
    const migrationPath = this.buildMigrationPath(sourceDEX, bestOrcaPool);

    const aprDelta = orcaProjection.projectedAPR - currentAPR;
    const feeSavings = sourceInfo.estimatedFeesPerYear * 0.3; // Orca typically 30% lower fees for same depth

    return {
      canMigrate: true,
      source: sourceInfo,
      orca: {
        pool: bestOrcaPool,
        projection: orcaProjection,
      },
      comparison: {
        aprDelta: aprDelta,
        aprDeltaPercent: ((aprDelta / currentAPR) * 100).toFixed(1),
        feeSavingsUSD: feeSavings.toFixed(2),
        capitalEfficiencyGain: orcaProjection.capitalEfficiencyMultiplier.toFixed(1) + 'x',
      },
      migrationPath,
      estimatedMigrationCost: this.estimateMigrationCost(sourceDEX, currentPositionValue),
      breakEvenDays: aprDelta > 0 ? Math.ceil(50 / (aprDelta * currentPositionValue / 365)) : null,
    };
  }

  findOrcaEquivalentPools(pairName) {
    const allPools = this.indexer.getTopPools(100);
    const [sym0, sym1] = pairName.split('/').map(s => s.trim().toUpperCase());
    return allPools.filter(p =>
      (p.token0_symbol.toUpperCase() === sym0 && p.token1_symbol.toUpperCase() === sym1) ||
      (p.token0_symbol.toUpperCase() === sym1 && p.token1_symbol.toUpperCase() === sym0)
    ).sort((a, b) => b.agentScore - a.agentScore);
  }

  getSourceDEXInfo(dex, pair, value, apr) {
    const dexConfigs = {
      raydium: {
        model: 'Constant Product AMM',
        feeTier: '0.25% fixed',
        capitalEfficiency: '1x (baseline)',
        slippageTypical: '0.5-2%',
        impermanentLossRisk: 'Standard AMM (full range)',
        notes: 'Full-range AMM means all liquidity is active but diluted across the entire price curve',
      },
      meteora: {
        model: 'DLMM (Dynamic Liquidity Market Maker)',
        feeTier: 'Dynamic per bin',
        capitalEfficiency: '3-10x',
        slippageTypical: '0.1-0.5%',
        impermanentLossRisk: 'Bin-based IL (discrete ranges)',
        notes: 'Bin-based model less granular than Orca ticks. Rebalancing can be more expensive.',
      },
      uniswap: {
        model: 'v3 Concentrated Liquidity',
        feeTier: '0.05%, 0.30%, 1.00%',
        capitalEfficiency: '10-50x',
        slippageTypical: '0.05-0.3%',
        impermanentLossRisk: 'Concentrated IL (higher than full-range)',
        notes: 'Similar model to Orca but on Ethereum. Gas costs make active management expensive.',
      },
      sushiswap: {
        model: 'v3 Concentrated Liquidity',
        feeTier: '0.05%, 0.30%, 1.00%',
        capitalEfficiency: '10-50x',
        slippageTypical: '0.05-0.3%',
        impermanentLossRisk: 'Concentrated IL',
        notes: 'Fork of Uniswap v3. Same mechanics, different ecosystem.',
      },
    };

    const config = dexConfigs[dex.toLowerCase()] || dexConfigs.raydium;
    const estimatedFeesPerYear = value * apr;

    return {
      dex,
      pair,
      positionValue: value,
      currentAPR: apr,
      ...config,
      estimatedFeesPerYear,
    };
  }

  projectOrcaYield(pool, positionValue, options = {}) {
    const dailyYield = (pool.vol_24h * pool.fee_rate) / pool.tvl;
    const annualizedAPR = dailyYield * 365;
    const capitalEfficiencyMultiplier = pool.fee_rate >= 0.003 ? 15 : pool.fee_rate >= 0.0005 ? 25 : 40;
    
    // Adjust for position size
    const sizeMultiplier = Math.min(1.5, 1 + (positionValue / pool.tvl) * 10);
    const adjustedAPR = annualizedAPR * sizeMultiplier;

    return {
      projectedAPR: adjustedAPR,
      projectedDailyFees: (positionValue * adjustedAPR / 365).toFixed(2),
      projectedMonthlyFees: (positionValue * adjustedAPR / 12).toFixed(2),
      projectedYearlyFees: (positionValue * adjustedAPR).toFixed(2),
      capitalEfficiencyMultiplier,
      recommendedTickRange: this.suggestMigrationTickRange(pool, options.riskPreference),
    };
  }

  suggestMigrationTickRange(pool, riskPreference = 'balanced') {
    const volatility = Math.abs(pool.price_24h_change);
    if (riskPreference === 'conservative') {
      return { lower: -20000, upper: 20000, width: 'Wide', reasoning: 'Protect against volatility, steady fee capture' };
    }
    if (riskPreference === 'aggressive') {
      return { lower: -3000, upper: 3000, width: 'Narrow', reasoning: 'Maximize fee concentration, accept higher IL risk' };
    }
    if (volatility < 2) {
      return { lower: -2000, upper: 2000, width: 'Narrow', reasoning: 'Low volatility pair - tight range maximizes yield' };
    }
    if (volatility > 8) {
      return { lower: -30000, upper: 30000, width: 'Wide', reasoning: 'High volatility - wide range to stay in range longer' };
    }
    return { lower: -10000, upper: 10000, width: 'Moderate', reasoning: 'Balanced approach for moderate volatility' };
  }

  buildMigrationPath(sourceDEX, targetPool) {
    const steps = [];
    
    if (sourceDEX.toLowerCase() === 'raydium') {
      steps.push({ step: 1, action: 'Remove liquidity from Raydium pool', estimatedTime: '1-2 minutes', gasCost: '~0.001 SOL' });
      steps.push({ step: 2, action: 'Swap any residual tokens to desired ratio', estimatedTime: '30 seconds', gasCost: '~0.001 SOL' });
      steps.push({ step: 3, action: 'Deposit into Orca Whirlpool with recommended tick range', estimatedTime: '1-2 minutes', gasCost: '~0.003 SOL' });
    } else if (sourceDEX.toLowerCase() === 'meteora') {
      steps.push({ step: 1, action: 'Close Meteora DLMM position', estimatedTime: '1 minute', gasCost: '~0.001 SOL' });
      steps.push({ step: 2, action: 'Claim any unclaimed fees', estimatedTime: '30 seconds', gasCost: '~0.001 SOL' });
      steps.push({ step: 3, action: 'Deposit into Orca Whirlpool', estimatedTime: '1-2 minutes', gasCost: '~0.003 SOL' });
    } else {
      steps.push({ step: 1, action: 'Remove liquidity from source DEX', estimatedTime: 'Variable', gasCost: 'Depends on chain' });
      steps.push({ step: 2, action: 'Bridge tokens to Solana (if cross-chain)', estimatedTime: '5-30 minutes', gasCost: 'Bridge fees' });
      steps.push({ step: 3, action: 'Deposit into Orca Whirlpool', estimatedTime: '1-2 minutes', gasCost: '~0.003 SOL' });
    }

    steps.push({ step: steps.length + 1, action: 'Enable auto-compound and rebalance engine', estimatedTime: '30 seconds', gasCost: 'Free' });
    
    return steps;
  }

  estimateMigrationCost(sourceDEX, positionValue) {
    const baseCost = 0.005; // SOL
    const percentageCost = positionValue * 0.0001; // 0.01%
    return {
      estimatedSOL: baseCost.toFixed(4),
      estimatedUSD: (baseCost * 145).toFixed(2),
      percentageOfPosition: ((baseCost * 145 + percentageCost) / positionValue * 100).toFixed(2) + '%',
    };
  }

  /**
   * Batch analysis for multiple positions
   */
  analyzePortfolioMigration(positions) {
    const results = positions.map(pos => this.analyzeMigration(pos.sourceDEX, pos.pair, pos.value, pos.apr, pos.options));
    const totalCurrentValue = positions.reduce((sum, p) => sum + p.value, 0);
    const totalProjectedAPR = results.filter(r => r.canMigrate).reduce((sum, r) => sum + r.orca.projection.projectedAPR, 0) / results.filter(r => r.canMigrate).length;
    const totalMigrationCost = results.filter(r => r.canMigrate).reduce((sum, r) => sum + parseFloat(r.estimatedMigrationCost.estimatedUSD), 0);

    return {
      positionsAnalyzed: positions.length,
      migratablePositions: results.filter(r => r.canMigrate).length,
      totalCurrentValue,
      averageProjectedAPR: totalProjectedAPR.toFixed(2),
      totalMigrationCostUSD: totalMigrationCost.toFixed(2),
      details: results,
    };
  }
}

module.exports = { MigrationService };
