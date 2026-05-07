const EventEmitter = require('events');
const axios = require('axios');

/**
 * Autonomous Rebalancing Engine for LP Scout
 * Monitors positions and automatically rebalances based on configured parameters
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
      checkIntervalMs: 60000, // Check every minute
      ...config,
    };

    this.stats = {
      rebalancesToday: 0,
      feesSaved: 0,
      totalValueManaged: 0,
      lastRebalanceTime: null,
      rebalanceHistory: [],
    };

    this.isRunning = false;
    this.checkInterval = null;
    this.activePositions = new Map();

    // Bind methods
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.checkPositions = this.checkPositions.bind(this);
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);

    // Restart if already running
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

    this.isRunning = true;
    this.emit('started');

    // Reset daily stats at midnight
    this.scheduleDailyReset();

    // Start monitoring loop
    this.checkInterval = setInterval(this.checkPositions, this.config.checkIntervalMs);

    // Initial check
    await this.checkPositions();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

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
      this.scheduleDailyReset(); // Schedule next reset
    }, msUntilMidnight);
  }

  async checkPositions() {
    if (!this.isRunning || !this.config.enabled) {
      return;
    }

    try {
      // Check if we've hit daily limit
      if (this.stats.rebalancesToday >= this.config.maxRebalancesPerDay) {
        return;
      }

      // Get all monitored positions
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
      // Check if position is out of range
      if (!position.inRange) {
        await this.rebalancePosition(position, 'OUT_OF_RANGE');
        return;
      }

      // Check stop loss
      if (position.pnl.percent <= this.config.stopLossPercent) {
        await this.rebalancePosition(position, 'STOP_LOSS');
        return;
      }

      // Check if bins need rebalancing (simplified logic)
      const currentBin = position.currentBin || position.bin_lower;
      const activeBin = position.activeBin || currentBin;

      if (Math.abs(currentBin - activeBin) > this.config.binRange) {
        await this.rebalancePosition(position, 'BIN_SHIFT');
      }
    } catch (error) {
      console.error('Error evaluating position:', error);
      this.emit('error', {
        type: 'EVALUATE_ERROR',
        position: position.id,
        message: error.message
      });
    }
  }

  async rebalancePosition(position, reason) {
    try {
      // Emit start event
      this.emit('rebalanceStart', {
        position: position.id,
        pair: `${position.token0_symbol}-${position.token1_symbol}`,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Get active bin info
      const poolInfo = await this.getPoolInfo(position.pool_address);
      const activeBin = poolInfo?.liquidityViz?.activeBin?.binId;

      if (!activeBin) {
        throw new Error('Could not determine active bin');
      }

      // Calculate new bin range
      const fromBinId = activeBin - this.config.binRange;
      const toBinId = activeBin + this.config.binRange;

      // Execute zap-out (collect fees and exit)
      const zapOutResult = await this.executeZapOut(position.id, 10000); // 100%

      if (!zapOutResult.success) {
        throw new Error(`Zap-out failed: ${zapOutResult.error}`);
      }

      // Wait a moment for state to settle
      await this.sleep(2000);

      // Check token balance
      const balance = await this.getTokenBalance(position.owner);

      // Reserve 0.05 SOL for fees
      const availableSOL = Math.max(0, balance.sol - 0.05);

      if (availableSOL < 0.1) {
        throw new Error('Insufficient SOL for re-entry');
      }

      // Execute zap-in (re-enter with new range)
      const zapInResult = await this.executeZapIn({
        poolId: position.pool_address,
        owner: position.owner,
        inputSOL: availableSOL * 0.95, // Use 95% of available
        strategy: this.config.strategy,
        fromBinId,
        toBinId,
      });

      if (!zapInResult.success) {
        throw new Error(`Zap-in failed: ${zapInResult.error}`);
      }

      // Calculate fees saved (estimate)
      const feesSaved = position.uncollected_fees_usd || 0;

      // Update stats
      this.stats.rebalancesToday++;
      this.stats.feesSaved += feesSaved;
      this.stats.lastRebalanceTime = new Date().toISOString();

      const rebalanceRecord = {
        id: `reb_${Date.now()}`,
        positionId: position.id,
        pair: `${position.token0_symbol}-${position.token1_symbol}`,
        reason,
        timestamp: this.stats.lastRebalanceTime,
        txHash: zapInResult.tx_hash,
        feesSaved,
        newRange: { fromBinId, toBinId },
      };

      this.stats.rebalanceHistory.push(rebalanceRecord);

      // Keep only last 100 entries
      if (this.stats.rebalanceHistory.length > 100) {
        this.stats.rebalanceHistory = this.stats.rebalanceHistory.slice(-100);
      }

      // Emit completion event
      this.emit('rebalanceComplete', {
        position: position.id,
        pair: `${position.token0_symbol}-${position.token1_symbol}`,
        reason,
        txHash: zapInResult.tx_hash,
        timestamp: this.stats.lastRebalanceTime,
        feesSaved,
      });

    } catch (error) {
      console.error('Rebalance failed:', error);
      this.emit('engineError', {
        type: 'REBALANCE_FAILED',
        position: position.id,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getPoolInfo(poolId) {
    try {
      const response = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/${poolId}/info`,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get pool info:', error);
      return null;
    }
  }

  async getTokenBalance(owner) {
    try {
      const response = await axios.get(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/token/balance`,
        {
          params: { owner },
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return { sol: 0 };
    }
  }

  async executeZapOut(positionId, bps) {
    try {
      // Step 1: Get quote
      const quoteResponse = await axios.post(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/position/decrease-quotes`,
        { id: positionId, bps },
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
        }
      );

      // Step 2: Get transaction
      const txResponse = await axios.post(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/position/decrease-tx`,
        quoteResponse.data,
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
        }
      );

      // Step 3: Submit transaction (for demo, return mock success)
      // In production, this would sign and submit
      return {
        success: true,
        tx_hash: txResponse.data?.tx_hash || `mock_tx_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeZapIn(params) {
    try {
      const { poolId, owner, inputSOL, strategy, fromBinId, toBinId } = params;

      // Step 1: Get landing add transaction
      const txResponse = await axios.post(
        `${process.env.LP_AGENT_API_URL || 'https://api.lpagent.io/open-api/v1'}/pools/landing-add-tx`,
        {
          poolId,
          owner,
          inputSOL,
          stratergy: strategy, // Note: API uses "stratergy" spelling
          fromBinId,
          toBinId,
          slippage_bps: 500,
        },
        {
          headers: { 'x-api-key': process.env.LP_AGENT_API_KEY },
        }
      );

      // Step 2: Submit transaction (for demo, return mock success)
      return {
        success: true,
        tx_hash: txResponse.data?.tx_hash || `mock_tx_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addPosition(position) {
    this.activePositions.set(position.id, position);
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
