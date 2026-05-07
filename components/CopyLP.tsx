'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../lib/config';

interface LPer {
  address: string;
  totalValue: number;
  totalPnL: number;
  winRate: number;
  poolCount: number;
  avgDpr: number;
  score: number;
}

interface Mirror {
  id: string;
  lperAddress: string;
  status: 'active' | 'paused' | 'stopped';
  allocation: number;
  maxAllocation: number;
  positions: number;
  pnl: number;
  startedAt: string;
}

export function CopyLP() {
  const [activeTab, setActiveTab] = useState<'top' | 'mirrors' | 'history'>('top');
  const [topLPers, setTopLPers] = useState<LPer[]>([]);
  const [activeMirrors, setActiveMirrors] = useState<Mirror[]>([]);
  const [selectedLPer, setSelectedLPer] = useState<LPer | null>(null);
  const [allocation, setAllocation] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [lpersRes, mirrorsRes] = await Promise.all([
        fetch(`${API_URL}/api/copy-lp/top-lpers`),
        fetch(`${API_URL}/api/copy-lp/mirrors`),
      ]);

      if (lpersRes.ok) {
        const data = await lpersRes.json();
        if (data.success) {
          setTopLPers(data.lpers || []);
        }
      }

      if (mirrorsRes.ok) {
        const data = await mirrorsRes.json();
        if (data.success) {
          setActiveMirrors(data.mirrors || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Copy LP data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const startMirroring = async () => {
    if (!selectedLPer) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/copy-lp/mirrors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lperAddress: selectedLPer.address,
          options: { maxAllocation: allocation },
        }),
      });
      if (res.ok) {
        setSelectedLPer(null);
        setActiveTab('mirrors');
        fetchData();
      }
    } catch (err) {
      setError('Failed to start mirroring');
    } finally {
      setLoading(false);
    }
  };

  const stopMirror = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/copy-lp/mirrors/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to stop mirror');
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#030712]">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Copy LP
          </h2>
          <div className="text-xs text-gray-400">
            {activeMirrors.length} active
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['top', 'mirrors', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'top' ? 'Top LPers' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded bg-red-500/20 p-2 text-xs text-red-400">{error}</div>
        )}

        {activeTab === 'top' && (
          <div className="space-y-2">
            {topLPers.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">Loading top LPers...</div>
            ) : (
              topLPers.map((lper, index) => (
                <div
                  key={lper.address}
                  onClick={() => setSelectedLPer(lper)}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedLPer?.address === lper.address
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {lper.address.slice(0, 6)}...{lper.address.slice(-4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-purple-400 font-medium">
                        Score: {lper.score.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">TVL</div>
                      <div className="text-white">${(lper.totalValue / 1000).toFixed(1)}k</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Win Rate</div>
                      <div className={`${lper.winRate > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {lper.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Avg DPR</div>
                      <div className="text-white">{(lper.avgDpr * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'mirrors' && (
          <div className="space-y-3">
            {activeMirrors.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                No active mirrors. Start by copying a top LPer.
              </div>
            ) : (
              activeMirrors.map((mirror) => (
                <div key={mirror.id} className="rounded-lg border border-gray-800 bg-gray-800/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {mirror.lperAddress.slice(0, 6)}...{mirror.lperAddress.slice(-4)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      mirror.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {mirror.status}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Positions</div>
                      <div className="text-white">{mirror.positions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">PnL</div>
                      <div className={mirror.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {mirror.pnl >= 0 ? '+' : ''}{mirror.pnl.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Allocation</div>
                      <div className="text-white">${mirror.allocation}/{mirror.maxAllocation} SOL</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Started</div>
                      <div className="text-white">{new Date(mirror.startedAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => stopMirror(mirror.id)}
                    className="mt-2 w-full rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                  >
                    Stop Mirroring
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center text-sm text-gray-500 py-8">
            Mirror history feature coming soon
          </div>
        )}
      </div>

      {/* Modal for starting mirror */}
      {selectedLPer && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-gray-900 border border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Mirror {selectedLPer.address.slice(0, 6)}...{selectedLPer.address.slice(-4)}
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-gray-400">
                Max Allocation: {allocation} SOL
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={allocation}
                onChange={(e) => setAllocation(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>100 SOL</span>
                <span>10000 SOL</span>
              </div>
            </div>

            <div className="mb-4 rounded bg-gray-800 p-2 text-xs">
              <div className="text-gray-400">LPer Stats:</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div>Win Rate: {selectedLPer.winRate.toFixed(1)}%</div>
                <div>Pools: {selectedLPer.poolCount}</div>
                <div>Avg DPR: {(selectedLPer.avgDpr * 100).toFixed(2)}%</div>
                <div>Total PnL: {selectedLPer.totalPnL.toFixed(2)}%</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLPer(null)}
                className="flex-1 rounded bg-gray-700 px-3 py-2 text-xs text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={startMirroring}
                disabled={loading}
                className="flex-1 rounded bg-purple-500 px-3 py-2 text-xs text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Mirror'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
