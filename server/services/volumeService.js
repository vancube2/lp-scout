/**
 * Volume Service - Detects trading volume spikes in Orca pools
 * Generates alerts for natural entry/exit signals
 */

class VolumeService {
  constructor(orcaIndexer) {
    this.indexer = orcaIndexer;
    this.volumeHistory = new Map(); // poolAddress -> [hourly volumes]
    this.alertThresholds = {
      spike: 2.5,      // 2.5x average = alert
      surge: 4.0,      // 4x average = high priority
      anomaly: 6.0,    // 6x average = critical
    };
    this.activeAlerts = new Map();
  }

  recordVolume(poolAddress, volume24h) {
    if (!this.volumeHistory.has(poolAddress)) {
      this.volumeHistory.set(poolAddress, []);
    }
    const history = this.volumeHistory.get(poolAddress);
    history.push({ timestamp: Date.now(), volume: volume24h });
    // Keep last 72 hours
    while (history.length > 72) history.shift();
  }

  detectSpike(poolAddress) {
    const history = this.volumeHistory.get(poolAddress);
    if (!history || history.length < 24) {
      return { hasSpike: false, reason: 'Insufficient data (need 24h)' };
    }

    const recent = history.slice(-6); // last 6 hours
    const baseline = history.slice(-24, -6); // prior 18 hours
    const avgBaseline = baseline.reduce((s, h) => s + h.volume, 0) / baseline.length;
    const avgRecent = recent.reduce((s, h) => s + h.volume, 0) / recent.length;
    const spikeRatio = avgRecent / avgBaseline;

    if (spikeRatio >= this.alertThresholds.anomaly) {
      return this.createAlert(poolAddress, 'CRITICAL', spikeRatio, avgBaseline, avgRecent);
    }
    if (spikeRatio >= this.alertThresholds.surge) {
      return this.createAlert(poolAddress, 'HIGH', spikeRatio, avgBaseline, avgRecent);
    }
    if (spikeRatio >= this.alertThresholds.spike) {
      return this.createAlert(poolAddress, 'MEDIUM', spikeRatio, avgBaseline, avgRecent);
    }

    return { hasSpike: false, spikeRatio: spikeRatio.toFixed(2) };
  }

  createAlert(poolAddress, severity, ratio, baseline, recent) {
    const pool = this.indexer.getPool(poolAddress);
    const alertId = 'vol_' + poolAddress.slice(0, 8) + '_' + Date.now();
    
    let signal = 'HOLD';
    let reasoning = '';
    
    if (severity === 'CRITICAL') {
      signal = 'EXIT_OR_NARROW';
      reasoning = 'Extreme volume spike suggests major price movement. Consider narrowing range or exiting to avoid IL.';
    } else if (severity === 'HIGH') {
      signal = 'MONITOR_CLOSELY';
      reasoning = 'Significant volume surge. Fees will spike but IL risk increases. Monitor position closely.';
    } else {
      signal = 'FEE_OPPORTUNITY';
      reasoning = 'Above-average volume means higher fee earnings. Good time to have tight range if price is stable.';
    }

    const alert = {
      id: alertId,
      type: 'VOLUME_SPIKE',
      severity,
      poolAddress,
      poolName: pool ? pool.name : poolAddress,
      spikeRatio: ratio.toFixed(2),
      baselineVolume24h: baseline.toFixed(0),
      currentVolume24h: recent.toFixed(0),
      signal,
      reasoning,
      timestamp: new Date().toISOString(),
      estimatedFeeBoost: ((ratio - 1) * 100).toFixed(0) + '%',
    };

    this.activeAlerts.set(alertId, alert);
    return { hasSpike: true, alert };
  }

  getAlertsForWallet(walletAddress, pools) {
    const alerts = [];
    for (const pool of pools) {
      const result = this.detectSpike(pool.pool_address);
      if (result.hasSpike) {
        alerts.push(result.alert);
      }
    }
    return alerts.sort((a, b) => parseFloat(b.spikeRatio) - parseFloat(a.spikeRatio));
  }

  getAllActiveAlerts() {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => parseFloat(b.spikeRatio) - parseFloat(a.spikeRatio));
  }

  dismissAlert(alertId) {
    return this.activeAlerts.delete(alertId);
  }

  /**
   * Generate a summary report of volume trends
   */
  getVolumeTrends(limit = 10) {
    const pools = this.indexer.getTopPools(limit);
    return pools.map(pool => {
      const history = this.volumeHistory.get(pool.address) || [];
      const avgVol = history.length > 0
        ? history.reduce((s, h) => s + h.volume, 0) / history.length
        : pool.vol_24h;
      const trend = history.length >= 2
        ? ((history[history.length - 1].volume - history[0].volume) / history[0].volume * 100).toFixed(1)
        : '0';
      
      return {
        poolAddress: pool.address,
        pair: pool.token0_symbol + '/' + pool.token1_symbol,
        currentVolume24h: pool.vol_24h.toFixed(0),
        avgVolume24h: avgVol.toFixed(0),
        trend: trend + '%',
        vsAverage: ((pool.vol_24h / avgVol) * 100).toFixed(0) + '%',
      };
    });
  }
}

module.exports = { VolumeService };
