'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/config';

interface EngineConfig {
  enabled: boolean;
  strategy: 'Spot' | 'Curve' | 'BidAsk';
  binRange: number;
  stopLossPercent: number;
  maxRebalancesPerDay: number;
  minRebalanceInterval: number;
}

interface EngineStats {
  rebalancesToday: number;
  feesSaved: number;
  totalValueManaged: number;
  lastCheck: string | null;
}

interface RebalanceLog {
  id: string;
  positionId: string;
  timestamp: string;
  oldStrategy: string;
  newStrategy: string;
  success: boolean;
  gasUsed: number;
  pnl: number;
}

export function EnginePanel() {
  const [config, setConfig] = useState<EngineConfig>({
    enabled: false,
    strategy: 'Spot',
    binRange: 50,
    stopLossPercent: -10,
    maxRebalancesPerDay: 5,
    minRebalanceInterval: 3600,
  });
  const [stats, setStats] = useState<EngineStats>({
    rebalancesToday: 0,
    feesSaved: 0,
    totalValueManaged: 0,
    lastCheck: null,
  });
  const [logs, setLogs] = useState<RebalanceLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'logs'>('status');

  const fetchEngineData = useCallback(async () => {
    try {
      const [configRes, statusRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/engine/config`),
        fetch(`${API_URL}/api/engine/status`),
        fetch(`${API_URL}/api/engine/rebalances?limit=10`),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success) {
          setConfig(configData.config);
        }
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success) {
          setIsRunning(statusData.status.isRunning);
          setStats({
            rebalancesToday: statusData.status.rebalancesToday || 0,
            feesSaved: statusData.status.feesSaved || 0,
            totalValueManaged: statusData.status.totalValueManaged || 0,
            lastCheck: statusData.status.lastCheck,
          });
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setLogs(logsData.rebalances || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch engine data:', err);
      setError('Failed to connect to engine');
    }
  }, []);

  useEffect(() => {
    fetchEngineData();
    const interval = setInterval(fetchEngineData, 30000);
    return () => clearInterval(interval);
  }, [fetchEngineData]);

  const handleStartStop = async () => {
    setLoading(true);
    try {
      const endpoint = isRunning ? '/api/engine/stop' : '/api/engine/start';
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        setIsRunning(!isRunning);
      }
    } catch (err) {
      setError('Failed to toggle engine');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/engine/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      setError('Failed to update config');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#030712]">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Rebalance Engine
          </h2>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
            isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {isRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['status', 'config', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded bg-red-500/20 p-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* Start/Stop Button */}
            <button
              onClick={handleStartStop}
              disabled={loading}
              className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isRunning
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {loading ? 'Processing...' : isRunning ? 'Stop Engine' : 'Start Engine'}
            </button>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-xs text-gray-400">Rebalances Today</div>
                <div className="text-lg font-semibold text-white">{stats.rebalancesToday}</div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3">
                <div className="text-xs text-gray-400">Fees Saved</div>
                <div className="text-lg font-semibold text-green-400">
                  ${stats.feesSaved.toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-3 col-span-2">
                <div className="text-xs text-gray-400">Total Value Managed</div>
                <div className="text-lg font-semibold text-white">
                  ${stats.totalValueManaged.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Current Strategy */}
            <div className="rounded-lg bg-gray-800/50 p-3">
              <div className="text-xs text-gray-400 mb-2">Active Strategy</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{config.strategy}</span>
                <span className="text-xs text-gray-400">Bin Range: {config.binRange}</span>
              </div>
            </div>

            {stats.lastCheck && (
              <div className="text-xs text-gray-500 text-center">
                Last check: {new Date(stats.lastCheck).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Strategy</label>
              <select
                value={config.strategy}
                onChange={(e) => setConfig({ ...config, strategy: e.target.value as any })}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
              >
                <option value="Spot">Spot (Stable pairs)</option>
                <option value="Curve">Curve (Correlated)</option>
                <option value="BidAsk">BidAsk (Volatile)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Bin Range: {config.binRange}
              </label>
              <input
                type="range"
                min="20"
                max="70"
                value={config.binRange}
                onChange={(e) => setConfig({ ...config, binRange: parseInt(e.target.value) })}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>20</span>
                <span>70</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Stop Loss: {config.stopLossPercent}%
              </label>
              <input
                type="range"
                min="-30"
                max="-5"
                value={config.stopLossPercent}
                onChange={(e) => setConfig({ ...config, stopLossPercent: parseInt(e.target.value) })}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>-30%</span>
                <span>-5%</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Max Rebalances/Day: {config.maxRebalancesPerDay}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={config.maxRebalancesPerDay}
                onChange={(e) => setConfig({ ...config, maxRebalancesPerDay: parseInt(e.target.value) })}
                className="w-full accent-green-500"
              />
            </div>

            <button
              onClick={handleUpdateConfig}
              disabled={loading}
              className="w-full rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                No rebalances yet
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-lg bg-gray-800/50 p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 truncate">{log.positionId.slice(0, 8)}...</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {log.oldStrategy} → {log.newStrategy}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-gray-500">
                    <span>Gas: {log.gasUsed} SOL</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
