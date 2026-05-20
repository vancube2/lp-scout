/**
 * Token Launch Service - Guided wizard for projects launching tokens on Orca
 * Suggests optimal fee tier, tick range, and minimum liquidity to bootstrap
 */

class TokenLaunchService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
  }

  /**
   * Analyze token pair and recommend optimal launch configuration
   */
  analyzeLaunchConfig(token0Mint, token1Mint, token0Symbol, token1Symbol, options = {}) {
    const pairName = token0Symbol + '/' + token1Symbol;
    const isStablePair = this.isStablePair(token0Symbol, token1Symbol);
    const isMemeCoin = this.isMemeCoin(token0Symbol, token1Symbol);
    const marketCap = options.marketCap || 1000000;
    const initialLiquidityUSD = options.initialLiquidityUSD || marketCap * 0.05;

    // Fee tier recommendation
    const feeTier = this.recommendFeeTier(token0Symbol, token1Symbol, isStablePair, isMemeCoin);

    // Tick range recommendation based on pair type
    const tickRange = this.recommendTickRange(isStablePair, isMemeCoin, options.volatilityPreference);

    // Minimum liquidity recommendation
    const minLiquidity = this.calculateMinLiquidity(initialLiquidityUSD, feeTier, isStablePair);

    // Price anchor suggestion (start price vs current market price)
    const priceAnchor = this.suggestPriceAnchor(options.currentPrice, options.targetPrice);

    // Bootstrap phases
    const bootstrapPhases = this.buildBootstrapPhases(initialLiquidityUSD, feeTier);

    // Revenue opportunity for us
    const launchAssistFee = initialLiquidityUSD * 0.001; // 0.1% launch assist fee
    const projectedReferralRevenue = initialLiquidityUSD * 0.0005; // 0.05% ongoing referral

    return {
      pairName,
      recommendations: {
        feeTier,
        tickRange,
        minLiquidity,
        priceAnchor,
      },
      bootstrapPhases,
      revenue: {
        launchAssistFeeUSD: launchAssistFee,
        projectedReferralRevenueUSD: projectedReferralRevenue,
      },
      riskFactors: this.assessRiskFactors(token0Symbol, token1Symbol, isStablePair, isMemeCoin),
      estimatedAPR: this.projectAPR(initialLiquidityUSD, feeTier, isStablePair),
    };
  }

  isStablePair(sym0, sym1) {
    const stables = ['USDC', 'USDT', 'USDH', 'DAI', 'UXD'];
    const correlated = ['SOL', 'mSOL', 'jitoSOL', 'bSOL'];
    return (stables.includes(sym0) && stables.includes(sym1)) ||
           (correlated.includes(sym0) && correlated.includes(sym1));
  }

  isMemeCoin(sym0, sym1) {
    const memes = ['BONK', 'WIF', 'MYRO', 'POPCAT', 'SLERF', 'MEW', 'PENG'];
    return memes.includes(sym0) || memes.includes(sym1);
  }

  recommendFeeTier(sym0, sym1, isStable, isMeme) {
    if (isStable) {
      return { tier: 0.0001, label: '0.01%', reason: 'Stable pairs need tight spreads and high turnover. 0.01% attracts arbitrageurs and MEV searchers.' };
    }
    if (isMeme) {
      return { tier: 0.01, label: '1.00%', reason: 'Memecoins have extreme volatility. 1% fee tier captures maximum value during volatile trading periods.' };
    }
    // Check if one is a major token
    const majors = ['SOL', 'JUP', 'JTO', 'RAY', 'PYTH'];
    if (majors.includes(sym0) || majors.includes(sym1)) {
      return { tier: 0.0005, label: '0.05%', reason: 'Major token pairs have moderate volatility. 0.05% balances fee income with trading volume.' };
    }
    return { tier: 0.003, label: '0.30%', reason: 'Standard altcoin pair. 0.30% provides good fee capture for moderate volatility assets.' };
  }

  recommendTickRange(isStable, isMeme, preference = 'balanced') {
    if (isStable) {
      return {
        type: 'Narrow',
        tickLower: -1000,
        tickUpper: 1000,
        widthDescription: 'Very narrow around current price',
        reasoning: 'Stable pairs stay in a tight range. Concentrate liquidity for maximum fee capture.',
        expectedUtilization: '95%+',
      };
    }
    if (isMeme) {
      return {
        type: 'Wide',
        tickLower: -50000,
        tickUpper: 50000,
        widthDescription: 'Wide range to capture volatile moves',
        reasoning: 'Memecoins can swing 50%+ in hours. Wide range prevents going out of range too quickly.',
        expectedUtilization: '60-80%',
      };
    }
    if (preference === 'aggressive') {
      return {
        type: 'Narrow',
        tickLower: -5000,
        tickUpper: 5000,
        widthDescription: 'Tight around current price',
        reasoning: 'Higher fee concentration but higher IL risk. Best for experienced LPs.',
        expectedUtilization: '80-90%',
      };
    }
    return {
      type: 'Moderate',
      tickLower: -15000,
      tickUpper: 15000,
      widthDescription: 'Moderate range for balanced risk/reward',
      reasoning: 'Captures most price action while maintaining reasonable capital efficiency.',
      expectedUtilization: '75-85%',
    };
  }

  calculateMinLiquidity(initialUSD, feeTier, isStable) {
    const baseMultiplier = isStable ? 2.0 : 1.5;
    return {
      minUSD: Math.max(5000, initialUSD * 0.1),
      recommendedUSD: initialUSD,
      optimalUSD: initialUSD * baseMultiplier,
      reasoning: At least {Math.max(5000, initialUSD * 0.1).toFixed(0)} required to avoid high slippage. {initialUSD.toFixed(0)} recommended for competitive depth.,
    };
  }

  suggestPriceAnchor(currentPrice, targetPrice) {
    if (!currentPrice || !targetPrice) {
      return { strategy: 'market', description: 'Start at current market price', adjustment: 0 };
    }
    const deviation = ((targetPrice - currentPrice) / currentPrice) * 100;
    if (Math.abs(deviation) < 1) {
      return { strategy: 'market', description: 'Price aligned with market - start at current price', adjustment: 0 };
    }
    return {
      strategy: deviation > 0 ? 'premium' : 'discount',
      description: Start %  market to ,
      adjustment: deviation,
    };
  }

  buildBootstrapPhases(initialUSD, feeTier) {
    return [
      {
        phase: 1,
        name: 'Seed Liquidity',
        targetUSD: initialUSD * 0.3,
        description: 'Initial concentrated position around market price',
        actions: ['Deposit 30% of planned liquidity', 'Set narrow tick range (-500 to +500)', 'Monitor for 24h'],
        duration: '24 hours',
      },
      {
        phase: 2,
        name: 'Expand Depth',
        targetUSD: initialUSD * 0.7,
        description: 'Widen range as volume and price discovery stabilize',
        actions: ['Add remaining 40% liquidity', 'Widen tick range based on observed volatility', 'Enable auto-compound'],
        duration: '48-72 hours',
      },
      {
        phase: 3,
        name: 'Optimize',
        targetUSD: initialUSD,
        description: 'Fine-tune based on actual trading patterns',
        actions: ['Analyze fee earnings vs IL', 'Adjust tick range to maximize in-range time', 'Consider additional fee tier if volume justifies'],
        duration: 'Ongoing',
      },
    ];
  }

  assessRiskFactors(sym0, sym1, isStable, isMeme) {
    const risks = [];
    if (isMeme) {
      risks.push({ level: 'high', factor: 'Extreme volatility', mitigation: 'Use wide tick range, monitor hourly' });
      risks.push({ level: 'high', factor: 'Liquidity flight risk', mitigation: 'Set competitive fee tier, maintain deep liquidity' });
    }
    if (!isStable && !isMeme) {
      risks.push({ level: 'medium', factor: 'Impermanent loss', mitigation: 'Monitor price divergence, rebalance when >10%' });
    }
    risks.push({ level: 'low', factor: 'Smart contract risk', mitigation: 'Orca is audited and battle-tested on Solana' });
    return risks;
  }

  projectAPR(initialUSD, feeTier, isStable) {
    const baseAPR = isStable ? 0.08 : 0.25;
    const feeMultiplier = feeTier >= 0.01 ? 2.0 : feeTier >= 0.003 ? 1.2 : 1.0;
    return {
      conservative: (baseAPR * feeMultiplier * 0.5 * 100).toFixed(1) + '%',
      expected: (baseAPR * feeMultiplier * 100).toFixed(1) + '%',
      optimistic: (baseAPR * feeMultiplier * 2.0 * 100).toFixed(1) + '%',
    };
  }

  /**
   * Get comparison with hypothetical Raydium/Meteora launch
   */
  getCompetitorComparison(pairName, feeTier) {
    return {
      orca: {
        feeTier: feeTier.label,
        concentratedLiquidity: true,
        capitalEfficiency: 'High - 10-50x more efficient than full-range AMM',
        tickGranularity: 'Custom tick ranges',
        ecosystemSupport: 'Strong - Orca grants, co-marketing',
      },
      raydium: {
        feeTier: '0.25% fixed',
        concentratedLiquidity: false,
        capitalEfficiency: 'Standard constant product AMM',
        tickGranularity: 'N/A',
        ecosystemSupport: 'Moderate',
      },
      meteora: {
        feeTier: 'Dynamic bins',
        concentratedLiquidity: true,
        capitalEfficiency: 'High but different model',
        tickGranularity: 'Bin-based (less granular)',
        ecosystemSupport: 'Growing',
      },
    };
  }
}

module.exports = { TokenLaunchService };
