'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Droplets, ArrowUpRight, Zap } from 'lucide-react';
import { Pool } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils';

interface PoolCardProps {
  pool: Pool;
  rank: number;
  onZapIn: () => void;
}

export function PoolCard({ pool, rank, onZapIn }: PoolCardProps) {
  const dailyYield = ((pool.vol_24h * pool.fee) / pool.tvl) * 100;
  const score = pool.agentScore || 0;

  const getScoreColor = (s: number) => {
    if (s >= 7) return 'text-green-400 bg-green-500/20';
    if (s >= 4) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 7) return 'High';
    if (s >= 4) return 'Medium';
    return 'Low';
  };

  return (
    <motion.div
      layout
      className="bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] rounded-2xl p-4 transition-colors"
    >
      {/* Header with rank */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className={`
            w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm
            ${rank <= 3
              ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-400'
              : 'bg-[#1e293b] text-[#94a3b8]'
            }
          `}>
            #{rank}
          </div>

          {/* Token pair */}
          <div className="flex -space-x-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f172a]">
              {pool.token0_symbol.slice(0, 2)}
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f172a]">
              {pool.token1_symbol.slice(0, 2)}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm">
              {pool.token0_symbol}/{pool.token1_symbol}
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Fee {(pool.fee * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Agent score */}
        <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${getScoreColor(score)}`}>
          {getScoreLabel(score)} • {score.toFixed(1)}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#1e293b]/50 rounded-xl p-3">
          <p className="text-xs text-[#94a3b8] mb-1 flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            TVL
          </p>
          <p className="text-sm font-semibold text-white">{formatCurrency(pool.tvl)}</p>
        </div>
        <div className="bg-[#1e293b]/50 rounded-xl p-3">
          <p className="text-xs text-[#94a3b8] mb-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Volume
          </p>
          <p className="text-sm font-semibold text-white">{formatCurrency(pool.vol_24h)}</p>
        </div>
        <div className="bg-[#1e293b]/50 rounded-xl p-3">
          <p className="text-xs text-[#94a3b8] mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Daily Yield
          </p>
          <p className="text-sm font-semibold text-green-400">{formatPercent(dailyYield)}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#94a3b8]">
          Price change 24h: {' '}
          <span className={pool.price_24h_change >= 0 ? 'text-green-400' : 'text-red-400'}>
            {pool.price_24h_change >= 0 ? '+' : ''}{pool.price_24h_change.toFixed(2)}%
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onZapIn}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Zap In
        </motion.button>
      </div>
    </motion.div>
  );
}
