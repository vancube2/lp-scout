/**
 * Leaderboard Service - Gamified rankings of top Orca LPs
 * Risk-adjusted yield rankings to drive copy-trading adoption
 */

class LeaderboardService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
    this.lpers = new Map();
    this.rankings = [];
    this.lastUpdate = 0;
  }

  generateMockLPers(count = 50) {
    const names = ['orca_whale', 'sol_degen', 'yield_farmer', 'lp_king', 'fee_collector', 'tick_master', 'whirlpool_pro', 'solana_sage', 'dex_veteran', 'apy_hunter'];
    const pools = this.indexer.getTopPools(20);
    
    for (let i = 0; i < count; i++) {
      const wallet = 'LP' + i.toString().padStart(4, '0') + 'x' + Math.random().toString(36).slice(2, 8);
      const pool = pools[Math.floor(Math.random() * pools.length)];
      const baseAPR = ((pool.vol_24h * pool.fee_rate) / pool.tvl) * 365;
      const skillMultiplier = 0.5 + Math.random() * 1.5; // 0.5x to 2.0x skill factor
      const riskLevel = Math.random() > 0.7 ? 'aggressive' : Math.random() > 0.4 ? 'balanced' : 'conservative';
      
      const lper = {
        rank: i + 1,
        wallet: wallet,
        walletShort: wallet.slice(0, 4) + '...' + wallet.slice(-4),
        displayName: names[i % names.length] + '_' + Math.floor(Math.random() * 999),
        totalValueUSD: 5000 + Math.random() * 495000,
        poolsActive: 1 + Math.floor(Math.random() * 5),
        primaryPool: pool.name,
        apr30d: (baseAPR * skillMultiplier * 100).toFixed(2),
        riskAdjustedYield: (baseAPR * skillMultiplier * this.riskMultiplier(riskLevel) * 100).toFixed(2),
        winRate: (50 + Math.random() * 45).toFixed(1),
        sharpeRatio: (0.5 + Math.random() * 2.5).toFixed(2),
        maxDrawdown: (-(2 + Math.random() * 15)).toFixed(1),
        feesEarned30d: (100 + Math.random() * 9000).toFixed(2),
        riskLevel,
        followers: Math.floor(Math.random() * 200),
        isVerified: Math.random() > 0.8,
        streakDays: Math.floor(Math.random() * 30),
      };
      
      this.lpers.set(wallet, lper);
    }
    
    this.recalculateRankings();
  }

  riskMultiplier(level) {
    // Higher risk gets penalized in risk-adjusted ranking
    if (level === 'conservative') return 1.15;
    if (level === 'balanced') return 1.0;
    return 0.85; // aggressive penalized
  }

  recalculateRankings() {
    const all = Array.from(this.lpers.values());
    // Sort by risk-adjusted yield (Sharpe ratio weighted)
    all.sort((a, b) => {
      const scoreA = parseFloat(a.riskAdjustedYield) * parseFloat(a.sharpeRatio);
      const scoreB = parseFloat(b.riskAdjustedYield) * parseFloat(b.sharpeRatio);
      return scoreB - scoreA;
    });
    
    this.rankings = all.map((lper, i) => ({ ...lper, rank: i + 1 }));
    this.lastUpdate = Date.now();
  }

  getLeaderboard(sortBy = 'riskAdjusted', limit = 20, filter = {}) {
    let results = [...this.rankings];
    
    if (filter.riskLevel) {
      results = results.filter(l => l.riskLevel === filter.riskLevel);
    }
    if (filter.minValue) {
      results = results.filter(l => l.totalValueUSD >= filter.minValue);
    }
    
    if (sortBy === 'apr') {
      results.sort((a, b) => parseFloat(b.apr30d) - parseFloat(a.apr30d));
    } else if (sortBy === 'sharpe') {
      results.sort((a, b) => parseFloat(b.sharpeRatio) - parseFloat(a.sharpeRatio));
    } else if (sortBy === 'fees') {
      results.sort((a, b) => parseFloat(b.feesEarned30d) - parseFloat(a.feesEarned30d));
    }
    
    return results.slice(0, limit).map((l, i) => ({ ...l, rank: i + 1 }));
  }

  getLPerDetails(wallet) {
    const lper = this.lpers.get(wallet);
    if (!lper) return null;
    
    return {
      ...lper,
      performanceHistory: this.generatePerformanceHistory(),
      currentPositions: this.generateCurrentPositions(),
      copyStats: {
        totalFollowers: lper.followers,
        followerValue: (lper.followers * lper.totalValueUSD * 0.3).toFixed(0),
        yourPotentialFee: (lper.followers * lper.totalValueUSD * 0.3 * 0.02).toFixed(2), // 2% copy fee
      },
    };
  }

  generatePerformanceHistory() {
    const days = 30;
    const history = [];
    let cumulative = 0;
    for (let i = 0; i < days; i++) {
      const daily = (Math.random() - 0.3) * 2; // slightly positive bias
      cumulative += daily;
      history.push({ day: i + 1, dailyYield: daily.toFixed(2), cumulativeYield: cumulative.toFixed(2) });
    }
    return history;
  }

  generateCurrentPositions() {
    const pools = this.indexer.getTopPools(5);
    return pools.slice(0, 2 + Math.floor(Math.random() * 3)).map(p => ({
      pool: p.name,
      valueUSD: (1000 + Math.random() * 20000).toFixed(0),
      apr: (((p.vol_24h * p.fee_rate) / p.tvl) * 365 * 100).toFixed(1) + '%',
      range: Math.random() > 0.5 ? 'Narrow' : 'Moderate',
      inRange: Math.random() > 0.2,
    }));
  }

  getTrendingLPers(limit = 5) {
    // Lpers with fastest follower growth (simulated)
    return this.rankings
      .filter(l => l.streakDays >= 7)
      .sort((a, b) => parseFloat(b.apr30d) - parseFloat(a.apr30d))
      .slice(0, limit);
  }
}

module.exports = { LeaderboardService };
