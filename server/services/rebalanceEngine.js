const EventEmitter = require('events');
const axios = require('axios');
const jitoService = require('./jitoService');
const feeService = require('./feeService');

/**
 * Autonomous Rebalancing Engine with Jito Bundle Support
 * Atomic, MEV-protected rebalances via Jito bundles
 */
class RebalanceEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      enabled: false,
      strategy: 'Spot',
      binRange: 30,
      stopLossPercent: -15,
      maxRebalancesPerDay: 10,
      checkIntervalMs: 60000,
      ...config,
    };

    this.stats = {
      rebalancesToday: 0,
      feesSaved: 0,
      totalValueManaged: 0,
      lastRebalanceTime: null,
      rebalanceHistory: [],
      jitoBundlesLanded: 0,
      avgLandingTimeMs: 0,
    };

    this.isRunning = false;
    this.checkInterval = null;
    this.activePositions = new Map();
    this.serverKeypair = null;

    this.bindMethods();
  }

  bindMethods() {
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.checkPositions = this.checkPositions.bind(this);
    this.executeAtomicRebalance = this.executeAtomicRebalance.bind(this);
  }

  setServerKeypair(keypair) {
    this.serverKeypair = keypair;
    console.log('RebalanceEngine: Server keypair configured');
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);

    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getConfig() {
    return { ...this.config };
  }

  getStats() {
    return { ...this.stats };
  }

  getRebalanceLog(limit = 10) {
    return this.stats.rebalanceHistory.slice(-limit).reverse();
  }

  async start() {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    if (!this.serverKeypair) {
      console.warn('RebalanceEngine: No server keypair - atomic rebalances disabled');
    }

    this.isRunning = true;
    this.emit('started');

    this.scheduleDailyReset();
    this.checkInterval = setInterval(this.checkPositions, this.config.checkIntervalMs);
    await this.checkPositions();
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('stopped');
  }

  scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow - now;
    setTimeout(() => {
      this.stats.rebalancesToday = 0;
      this.scheduleDailyReset();
    }, msUntilMidnight);
  }

  async checkPositions() {
    if (!this.isRunning || !this.config.enabled) return;
    if (this.stats.rebalancesToday >= this.config.maxRebalancesPerDay) return;
    if (!this.serverKeypair) return;

    try {
      for (const [positionId, position] of this.activePositions.entries()) {
        await this.evaluatePosition(position);
      }
    } catch (error) {
      console.error('Error checking positions:', error);
      this.emit('error', { type: 'CHECK_ERROR', message: error.message });
    }
  }

  async evaluatePosition(position) {
    try {
      if (!position.inRange) {
        await this.executeAtomicRebalance(position, 'OUT_OF_RANGE');
        return;
      }

      if (position.pnl?.percent <= this.config.stopLossPercent) {
        await this.executeAtomicRebalance(position, 'STOP_LOSS');
        return;
      }

      const currentBin = position.currentBin || position.bin_lower;
      const activeBin = position.activeBin || currentBin;

      if (Math.abs(currentBin - activeBin) > this.config.binRange) {
        await this.executeAtomicRebalance(position, 'BIN_SHIFT');
      }
    } catch (error) {
      console.error('Error evaluating position:', error);
      this.emit('error', {
        type: 'EVALUATE_ERROR',
        position: position.id,
        message: error.message,
      });
    }
  }

  async executeAtomicRebalance(position, reason) {
    const startTime = Date.now();
    const urgency = jitoService.getUrgency(position);
    const positionValueSOL = parseFloat(position.current_value_usd || 0) / 150;
    const rebalanceFee = feeService.rebalanceFee(positionValueSOL);

    // Emit start event
    this.emit('rebalanceStart', {
      position: position.id,
      pair: `${position.token0_symbol}-${position.token1_symbol}`,
      reason,
      urgency,
      rebalanceFee: rebalanceFee.toFixed(6),
      timestamp: new Date().toISOString(),
    });

    try {
      // Calculate dynamic bin range based on volatility
      const binRange = this.calculateBinRange(position);

      // Submit via Jito atomic bundle
      const result = await jitoService.submitAtomicRebalance({
        positionId: position.id,
        poolId: position.pool_address,
        owner: position.owner,
        keypair: this.serverKeypair,
        strategy: this.config.strategy,
        binRange,
        slippageBps: 500,
        urgency,
        lpAgentApiKey: process.env.LP_AGENT_API_KEY,
      });

      // Track fee revenue
      feeService.trackRevenue('REBALANCE', rebalanceFee, position.owner, {
        positionId: position.id,
        bundleId: result.primaryBundleId,
        landingTimeMs: result.landingTimeMs,
      });

      // Update stats
      this.stats.rebalancesToday++;
      this.stats.feesSaved += position.uncollected_fees_usd || 0;
      this.stats.lastRebalanceTime = new Date().toISOString();
      this.stats.jitoBundlesLanded++;

      // Calculate avg landing time
      if (result.landingTimeMs) {
        const currentAvg = this.stats.avgLandingTimeMs;
        const total = this.stats.jitoBundlesLanded;
        this.stats.avgLandingTimeMs = Math.round(
          (currentAvg * (total - 1) + result.landingTimeMs) / total
        );
      }

      // Record in history
      const rebalanceRecord = {
        id: `reb_${Date.now()}`,
        positionId: position.id,
        pair: `${position.token0_symbol}-${position.token1_symbol}`,
        reason,
        timestamp: this.stats.lastRebalanceTime,
        bundleId: result.primaryBundleId,
        jitoExplorerUrl: result.jitoExplorerUrl,
        tipPaidSOL: result.tipPaidSOL,
        landingTimeMs: result.landingTimeMs,
        feesSaved: position.uncollected_fees_usd || 0,
        newRange: { from: result.fromBinId, to: result.toBinId },
        rebalanceFee,
      };

      this.stats.rebalanceHistory.push(rebalanceRecord);
      if (this.stats.rebalanceHistory.length > 100) {
        this.stats.rebalanceHistory = this.stats.rebalanceHistory.slice(-100);
      }

      // Emit completion
      this.emit('rebalanceComplete', {
        position: position.id,
        pair: `${position.token0_symbol}-${position.token1_symbol}`,
        reason,
        bundleId: result.primaryBundleId,
        jitoExplorerUrl: result.jitoExplorerUrl,
        tipPaidSOL: result.tipPaidSOL,
        landingTimeMs: result.landingTimeMs,
        timestamp: this.stats.lastRebalanceTime,
        feesSaved: position.uncollected_fees_usd || 0,
      });

      console.log(`✓ Atomic rebalance complete: ${result.primaryBundleId} (${result.landingTimeMs}ms)`);

    } catch (error) {
      console.error('Atomic rebalance failed:', error);
      this.emit('engineError', {
        type: 'REBALANCE_FAILED',
        position: position.id,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  calculateBinRange(position) {
    const priceChange = Math.abs(position.price_24h_change || 0);
    if (priceChange > 20) return 50;
    if (priceChange > 10) return 34;
    return 20;
  }

  addPosition(position) {
    this.activePositions.set(position.id, {
      ...position,
      outOfRangeSince: position.inRange ? null : Date.now(),
    });
    this.updateTotalValueManaged();
  }

  removePosition(positionId) {
    this.activePositions.delete(positionId);
    this.updateTotalValueManaged();
  }

  updateTotalValueManaged() {
    this.stats.totalValueManaged = Array.from(this.activePositions.values())
      .reduce((sum, pos) => sum + (pos.current_value_usd || 0), 0);
  }
}

module.exports = { RebalanceEngine };
