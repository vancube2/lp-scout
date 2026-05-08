'use client';

import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, TrendingDown, Zap, ArrowRightLeft, Scissors } from 'lucide-react';
import { Position } from '../lib/types';
import { formatCurrency, formatPercent } from '../lib/utils';

interface PositionCardProps {
  position: Position;
  onAction: (action: { type: string; position: Position }) => void;
}

export function PositionCard({ position, onAction }: PositionCardProps) {
  const isHealthy = position.isHealthy;
  const isOutOfRange = !position.inRange;
  const hasProfit = position.pnl?.percent > 0;

  return (
    <motion.div
      layout
      className={`
        relative rounded-2xl border overflow-hidden
        ${isOutOfRange
          ? 'bg-red-500/5 border-red-500/30'
          : 'bg-[#0f172a] border-[#1e293b] hover:border-[#334155]'
        }
        transition-colors
      `}
    >
      {/* Out of range warning banner */}
      {isOutOfRange && (
        <div className="bg-red-500/20 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400 font-medium">Out of range — not earning fees</span>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Token pair icons */}
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f172a]">
                {position.token0_symbol.slice(0, 2)}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f172a]">
                {position.token1_symbol.slice(0, 2)}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">
                {position.token0_symbol}/{position.token1_symbol}
              </h3>
              <p className="text-xs text-[#94a3b8]">
                {position.age_days}d old • Bin {position.bin_lower}-{position.bin_upper}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${isOutOfRange
              ? 'bg-red-500/20 text-red-400'
              : isHealthy
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }
          `}>
            {isOutOfRange ? 'OOR' : isHealthy ? 'Healthy' : 'Warning'}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Value</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(position.current_value_usd)}</p>
          </div>
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">PnL</p>
            <p className={`text-sm font-semibold flex items-center gap-1 ${hasProfit ? 'text-green-400' : 'text-red-400'}`}>
              {hasProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercent(position.pnl?.percent || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94a3b8] mb-1">Daily Yield</p>
            <p className="text-sm font-semibold text-green-400">{formatPercent(position.dpr)}</p>
          </div>
        </div>

        {/* Uncollected fees */}
        {position.uncollected_fees_usd > 0 && (
          <div className="bg-green-500/10 rounded-xl px-3 py-2 mb-4 flex items-center justify-between">
            <span className="text-sm text-[#94a3b8]">Uncollected fees</span>
            <span className="text-sm font-semibold text-green-400">
              {formatCurrency(position.uncollected_fees_usd)}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isOutOfRange ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction({ type: 'REBALANCE', position })}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Rebalance
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onAction({ type: 'HARVEST', position })}
                disabled={position.uncollected_fees_usd <= 0}
                className="flex-1 py-2.5 bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <Scissors className="w-4 h-4" />
                Harvest
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onAction({ type: 'ZAP_OUT', position })}
                className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Exit
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
