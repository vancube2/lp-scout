const EventEmitter = require('events');
const axios = require('axios');

/**
 * Copy LP Service - Monitor and mirror top LPers
 * Tracks successful liquidity providers and optionally mirrors their moves
 */
class CopyLPService extends EventEmitter {
  constructor() {
    super();

    this.topLPers = new Map();
    this.activeMirrors = new Map();
    this.mirrorHistory = [];
    this.isMonitoring = false;
    this.monitorInterval = null;

    this.config = {
      minLpAgeDays: 7,
      minTotalPnl: 1000,
      updateIntervalMs: 300000, // Update top LPers every 5 minutes
      maxMirrors: 5,
    };
  }

  async fetchTopLPers() {
    try {
      // Fetch top pools first
      const poolsResponse = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/discover`,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
          params: { limit: 50 },
        }
      );

      const pools = Array.isArray(poolsResponse.data)
        ? poolsResponse.data
        : poolsResponse.data.data || [];

      // For each pool, get LP information
      const lpers = await Promise.all(
        pools.slice(0, 10).map(async (pool) => {
          try {
            // Get pool stats which may include top LPs
            const statsResponse = await axios.get(
              `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/${pool.address}/onchain-stats`,
              {
                headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
              }
            );

            return {
              pool: pool.address,
              poolName: `${pool.token0_symbol}-${pool.token1_symbol}`,
              topLPs: statsResponse.data?.topLPs || [],
              tvl: pool.tvl,
              vol24h: pool.vol_24h,
              fee24h: pool.vol_24h * pool.fee,
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Flatten and aggregate LPer data
      const aggregatedLPers = new Map();

      lpers.filter(Boolean).forEach((poolData) => {
        poolData.topLPs.forEach((lp) => {
          if (!aggregatedLPers.has(lp.address)) {
            aggregatedLPers.set(lp.address, {
              address: lp.address,
              pools: [],
              totalValue: 0,
              totalPnl: 0,
              score: 0,
            });
          }

          const lper = aggregatedLPers.get(lp.address);
          lper.pools.push({
            address: poolData.pool,
            name: poolData.poolName,
            value: lp.value,
            pnl: lp.pnl,
            tvl: poolData.tvl,
          });
          lper.totalValue += lp.value;
          lper.totalPnl += lp.pnl || 0;
        });
      });

      // Calculate score and filter
      const scoredLPers = Array.from(aggregatedLPers.values())
        .map((lper) => ({
          ...lper,
          score: this.calculateLPerScore(lper),
        }))
        .filter((lper) => lper.totalPnl > this.config.minTotalPnl)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      // Update cache
      this.topLPers = new Map(scoredLPers.map((l) => [l.address, l]));

      this.emit('topLPersUpdated', scoredLPers);
      return scoredLPers;
    } catch (error) {
      console.error('Failed to fetch top LPers:', error);
      this.emit('error', { type: 'FETCH_ERROR', message: error.message });
      return [];
    }
  }

  calculateLPerScore(lper) {
    // Score based on:
    // - Total value managed (40%)
    // - PnL ratio (40%)
    // - Pool diversification (20%)
    const valueScore = Math.log10(lper.totalValue + 1) * 10;
    const pnlRatio = lper.totalValue > 0 ? lper.totalPnl / lper.totalValue : 0;
    const pnlScore = pnlRatio * 100;
    const diversificationScore = Math.min(lper.pools.length, 5) * 4;

    return valueScore * 0.4 + pnlScore * 0.4 + diversificationScore * 0.2;
  }

  async startMirroring(lperAddress, options = {}) {
    try {
      if (this.activeMirrors.size >= this.config.maxMirrors) {
        throw new Error('Maximum number of mirrors reached');
      }

      const lper = this.topLPers.get(lperAddress);
      if (!lper) {
        throw new Error('LPer not found in top list');
      }

      const mirror = {
        id: `mirror_${Date.now()}`,
        lperAddress,
        lperName: options.name || `Top LPer ${lperAddress.slice(0, 4)}...`,
        status: 'active',
        options: {
          maxAllocation: options.maxAllocation || 1000, // SOL
          autoRebalance: options.autoRebalance ?? true,
          stopLoss: options.stopLoss || -20,
          takeProfit: options.takeProfit || 50,
          ...options,
        },
        positions: [],
        createdAt: new Date().toISOString(),
        lastActivity: null,
      };

      this.activeMirrors.set(mirror.id, mirror);

      // Start monitoring this LPer's activity
      this.monitorLPerActivity(mirror.id);

      this.emit('mirrorStarted', mirror);
      return mirror;
    } catch (error) {
      console.error('Failed to start mirroring:', error);
      this.emit('error', { type: 'MIRROR_START_ERROR', message: error.message });
      throw error;
    }
  }

  async stopMirroring(mirrorId) {
    const mirror = this.activeMirrors.get(mirrorId);
    if (!mirror) {
      return false;
    }

    mirror.status = 'stopped';
    this.activeMirrors.delete(mirrorId);

    this.emit('mirrorStopped', mirror);
    return true;
  }

  async monitorLPerActivity(mirrorId) {
    const mirror = this.activeMirrors.get(mirrorId);
    if (!mirror || mirror.status !== 'active') return;

    try {
      // Check for new positions or changes
      const lper = this.topLPers.get(mirror.lperAddress);
      if (!lper) return;

      // For each pool this LPer is in
      for (const pool of lper.pools) {
        // Check if we should mirror this position
        const shouldMirror = await this.evaluateMirror(mirror, pool);

        if (shouldMirror && !mirror.positions.find((p) => p.pool === pool.address)) {
          // Execute mirror entry
          await this.executeMirrorEntry(mirror, pool);
        }
      }
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }

  async evaluateMirror(mirror, pool) {
    // Check if pool meets criteria
    if (pool.tvl < 10000) return false; // Min $10k TVL
    if (pool.value > mirror.options.maxAllocation * 100) return false;

    return true;
  }

  async executeMirrorEntry(mirror, pool) {
    try {
      this.emit('mirrorEntry', {
        mirrorId: mirror.id,
        pool: pool.address,
        amount: Math.min(pool.value * 0.1, mirror.options.maxAllocation),
      });

      mirror.positions.push({
        pool: pool.address,
        poolName: pool.name,
        entryValue: pool.value * 0.1,
        entryTime: new Date().toISOString(),
      });

      mirror.lastActivity = new Date().toISOString();
    } catch (error) {
      console.error('Mirror entry failed:', error);
    }
  }

  getTopLPers() {
    return Array.from(this.topLPers.values()).sort((a, b) => b.score - a.score);
  }

  getActiveMirrors() {
    return Array.from(this.activeMirrors.values());
  }

  getMirrorHistory(limit = 20) {
    return this.mirrorHistory.slice(-limit);
  }

  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Initial fetch
    this.fetchTopLPers();

    // Set up interval
    this.monitorInterval = setInterval(() => {
      this.fetchTopLPers();

      // Check all active mirrors
      for (const mirrorId of this.activeMirrors.keys()) {
        this.monitorLPerActivity(mirrorId);
      }
    }, this.config.updateIntervalMs);

    this.emit('started');
  }

  stop() {
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.emit('stopped');
  }

  updateMirror(mirrorId, updates) {
    const mirror = this.activeMirrors.get(mirrorId);
    if (!mirror) return null;

    Object.assign(mirror.options, updates);
    this.emit('mirrorUpdated', mirror);
    return mirror;
  }

  async getLPerDetails(address) {
    const cached = this.topLPers.get(address);
    if (cached) return cached;

    // Fetch fresh data
    await this.fetchTopLPers();
    return this.topLPers.get(address);
  }
}

module.exports = { CopyLPService };
