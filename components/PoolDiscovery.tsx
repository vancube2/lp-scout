'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, DollarSign, Activity, Shield } from 'lucide-react';
import { discoverPools } from '../lib/lpAgent';
import { Pool } from '../lib/types';
import { formatCurrency, getAgentScoreColor } from '../lib/utils';

interface PoolDiscoveryProps {
  onZapIn: (pool: Pool) => void;
  onPoolsUpdate: (pools: Pool[]) => void;
}

type SortField = 'agentScore' | 'vol_24h' | 'tvl';

export function PoolDiscovery({ onZapIn, onPoolsUpdate }: PoolDiscoveryProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [filteredPools, setFilteredPools] = useState<Pool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('agentScore');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await discoverPools();
      const top10 = data.slice(0, 10);
      setPools(top10);
      onPoolsUpdate(top10);
    } catch (err) {
      setError('Failed to load pools');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [onPoolsUpdate]);

  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 60000);
    return () => clearInterval(interval);
  }, [fetchPools]);

  useEffect(() => {
    let result = [...pools];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pool) =>
          pool.token0_symbol.toLowerCase().includes(query) ||
          pool.token1_symbol.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
    setFilteredPools(result);
  }, [pools, searchQuery, sortField]);

  const getStrategyRecommendation = (pool: Pool): string => {
    const volatility = Math.abs(pool.price_24h_change);
    if (volatility < 2) return 'Spot';
    if (volatility < 10) return 'Curve';
    return 'BidAsk';
  };

  return (
    <div className="h-full flex flex-col bg-[#030712]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Top Pools
        </h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-2">
          {(['agentScore', 'vol_24h', 'tvl'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => setSortField(field)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                sortField === field
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {field === 'agentScore' ? 'Score' : field === 'vol_24h' ? 'Volume' : 'TVL'}
            </button>
          ))}
        </div>
      </div>

      {/* Pool List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && pools.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading pools...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No pools found</div>
        ) : (
          filteredPools.map((pool, index) => (
            <div
              key={pool.address}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                  <span className="font-semibold text-white">
                    {pool.token0_symbol}/{pool.token1_symbol}
                  </span>
                </div>
                <div className={`text-sm font-bold ${getAgentScoreColor(pool.agentScore || 0)}`}>
                  {(pool.agentScore || 0).toFixed(2)}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Activity className="w-3 h-3" />
                  <span>Vol: {formatCurrency(pool.vol_24h)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <DollarSign className="w-3 h-3" />
                  <span>Fee: {(pool.fee * 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>Org: {pool.organic_score.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>TVL: {formatCurrency(pool.tvl)}</span>
                </div>
              </div>

              {/* Strategy Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Rec:{' '}
                  <span className="text-green-400">{getStrategyRecommendation(pool)}</span>
                </span>
                <button
                  onClick={() => onZapIn(pool)}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Enter Pool
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
