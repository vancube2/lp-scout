'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, DollarSign, Activity, Shield, Wallet, Info } from 'lucide-react';
import { discoverPools } from '../lib/lpAgent';
import { Pool } from '../lib/types';
import { formatCurrency, getAgentScoreColor } from '../lib/utils';

interface PoolDiscoveryProps {
  onZapIn: (pool: Pool) => void;
  onPoolsUpdate: (pools: Pool[]) => void;
  walletAddress: string | null;
  onConnectWallet: () => void;
}

type SortField = 'agentScore' | 'vol_24h' | 'tvl';
type FilterStrategy = 'all' | 'Spot' | 'Curve' | 'BidAsk';

export function PoolDiscovery({ onZapIn, onPoolsUpdate, walletAddress, onConnectWallet }: PoolDiscoveryProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [filteredPools, setFilteredPools] = useState<Pool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('agentScore');
  const [filterStrategy, setFilterStrategy] = useState<FilterStrategy>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await discoverPools();
      // Get top 20 pools
      const topPools = data.slice(0, 20);
      setPools(topPools);
      onPoolsUpdate(topPools);
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

    if (filterStrategy !== 'all') {
      result = result.filter((pool) => getStrategyRecommendation(pool) === filterStrategy);
    }

    result.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
    setFilteredPools(result);
  }, [pools, searchQuery, sortField, filterStrategy]);

  const getStrategyRecommendation = (pool: Pool): string => {
    const volatility = Math.abs(pool.price_24h_change);
    if (volatility < 2) return 'Spot';
    if (volatility < 10) return 'Curve';
    return 'BidAsk';
  };

  const handlePoolClick = (pool: Pool) => {
    if (walletAddress) {
      onZapIn(pool);
    } else {
      setSelectedPool(pool);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#030712]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Top Pools
          <span className="text-xs font-normal text-gray-500 ml-auto">
            {filteredPools.length} pools
          </span>
        </h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pools (e.g., SOL, USDC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-2 mb-3">
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

        {/* Strategy Filter */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'Spot', 'Curve', 'BidAsk'] as FilterStrategy[]).map((strat) => (
            <button
              key={strat}
              onClick={() => setFilterStrategy(strat)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                filterStrategy === strat
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-800 border border-transparent'
              }`}
            >
              {strat === 'all' ? 'All' : strat}
            </button>
          ))}
        </div>
      </div>

      {/* Pool List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && pools.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-800/50 rounded-lg" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={fetchPools}
              className="text-sm text-green-400 hover:text-green-300"
            >
              Retry
            </button>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No pools match your filters</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterStrategy('all'); }}
              className="text-sm text-green-400 hover:text-green-300 mt-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredPools.map((pool, index) => {
            const strategy = getStrategyRecommendation(pool);
            const volatility = Math.abs(pool.price_24h_change);

            return (
              <div
                key={pool.address}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors"
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

                {/* Strategy Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    strategy === 'Spot'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : strategy === 'Curve'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  }`}>
                    {strategy}
                  </span>
                  <span className="text-xs text-gray-500">
                    {volatility.toFixed(1)}% volatility
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Activity className="w-3 h-3" />
                    <span>24h: {formatCurrency(pool.vol_24h)}</span>
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

                {/* Action Button */}
                <button
                  onClick={() => handlePoolClick(pool)}
                  className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {walletAddress ? (
                    <>View Pool Details</>
                  ) : (
                    <>
                      <Info className="w-3 h-3" />
                      View Details
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pool Preview Modal for non-wallet users */}
      {selectedPool && !walletAddress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {selectedPool.token0_symbol}/{selectedPool.token1_symbol}
              </h3>
              <button
                onClick={() => setSelectedPool(null)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Agent Score</div>
                    <div className="text-lg font-bold text-green-400">
                      {(selectedPool.agentScore || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Recommended Strategy</div>
                    <div className="text-lg font-bold text-blue-400">
                      {getStrategyRecommendation(selectedPool)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume:</span>
                  <span>{formatCurrency(selectedPool.vol_24h)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TVL:</span>
                  <span>{formatCurrency(selectedPool.tvl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee Rate:</span>
                  <span>{(selectedPool.fee * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Organic Score:</span>
                  <span>{selectedPool.organic_score.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Price Change:</span>
                  <span className={selectedPool.price_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {selectedPool.price_24h_change > 0 ? '+' : ''}
                    {selectedPool.price_24h_change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    Connect your wallet to enter this pool and start earning fees.
                  </p>
                  <p className="text-xs text-gray-500">
                    You'll be able to zap in with SOL and choose your strategy.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPool(null)}
                className="flex-1 py-2 border border-gray-700 text-gray-400 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedPool(null);
                  onConnectWallet();
                }}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
