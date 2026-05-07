'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, AlertTriangle, TrendingUp, Clock, Coins } from 'lucide-react';
import { getPositions, getPortfolioOverview } from '../lib/lpAgent';
import { Position, PortfolioOverview } from '../lib/types';
import { formatCurrency, formatPercent, formatDPR, formatAge } from '../lib/utils';

interface PositionPanelProps {
  walletAddress: string | null;
  onZapOut: (position: Position) => void;
  onPositionsUpdate: (positions: Position[]) => void;
  onOverviewUpdate: (overview: PortfolioOverview) => void;
}

export function PositionPanel({
  walletAddress,
  onZapOut,
  onPositionsUpdate,
  onOverviewUpdate,
}: PositionPanelProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      setError(null);

      const [positionsData, overviewData] = await Promise.all([
        getPositions(walletAddress),
        getPortfolioOverview(walletAddress),
      ]);

      setPositions(positionsData);
      setOverview(overviewData);
      onPositionsUpdate(positionsData);
      onOverviewUpdate(overviewData);
    } catch (err) {
      setError('Failed to load positions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, onPositionsUpdate, onOverviewUpdate]);

  useEffect(() => {
    if (walletAddress) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    } else {
      setPositions([]);
      setOverview(null);
    }
  }, [walletAddress, fetchData]);

  if (!walletAddress) {
    return (
      <div className="h-full flex flex-col bg-[#030712]">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            Your Positions
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Connect wallet to see your positions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#030712]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-500" />
          Your Positions
        </h2>

        {overview && (
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500">Total Value</div>
                <div className="text-sm font-semibold">{formatCurrency(overview.total_value_usd)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PnL</div>
                <div
                  className={`text-sm font-semibold ${
                    overview.total_pnl_percent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {formatPercent(overview.total_pnl_percent)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Positions</div>
                <div className="text-sm font-semibold">{overview.positions_count}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Avg DPR</div>
                <div className="text-sm font-semibold text-green-500">{formatDPR(overview.avg_dpr)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Positions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading positions...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No open positions.</p>
            <p className="text-sm mt-2">Ask LP Scout to find you a pool.</p>
          </div>
        ) : (
          positions.map((position) => (
            <div
              key={position.id}
              className={`bg-gray-900 rounded-lg p-4 border transition-colors ${
                position.isHealthy === false
                  ? 'border-yellow-600/50'
                  : 'border-gray-800 hover:bg-gray-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-white">
                  {position.token0_symbol}/{position.token1_symbol}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    position.inRange
                      ? 'in-range'
                      : 'out-of-range'
                  }`}
                >
                  {position.inRange ? 'In Range' : 'Out of Range'}
                </span>
              </div>

              {/* Health Warning */}
              {!position.isHealthy && (
                <div className="flex items-center gap-1 text-xs text-yellow-500 mb-3">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Position needs attention</span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Value</div>
                  <div className="text-sm font-medium">{formatCurrency(position.current_value_usd)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">PnL</div>
                  <div
                    className={`text-sm font-medium ${
                      position.pnl.percent >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {formatPercent(position.pnl.percent)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    DPR
                  </div>
                  <div className="text-sm font-medium text-green-500">{formatDPR(position.dpr)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Age
                  </div>
                  <div className="text-sm font-medium">{formatAge(position.age_days)}</div>
                </div>
              </div>

              {/* Uncollected Fees */}
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                <Coins className="w-3 h-3" />
                <span>Uncollected: {formatCurrency(position.uncollected_fees_usd)}</span>
              </div>

              {/* Exit Button */}
              <button
                onClick={() => onZapOut(position)}
                className="w-full py-2 border border-red-500/50 text-red-400 text-sm font-medium rounded-md hover:bg-red-500/10 transition-colors"
              >
                Exit Position
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
