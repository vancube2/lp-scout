'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, AlertTriangle, TrendingUp, Clock, Coins, Sparkles, BookOpen, Zap } from 'lucide-react';
import { getPositions, getPortfolioOverview } from '../lib/lpAgent';
import { Position, PortfolioOverview } from '../lib/types';
import { formatCurrency, formatPercent, formatDPR, formatAge } from '../lib/utils';

interface PositionPanelProps {
  walletAddress: string | null;
  onZapOut: (position: Position) => void;
  onPositionsUpdate: (positions: Position[]) => void;
  onOverviewUpdate: (overview: PortfolioOverview) => void;
  onConnectWallet: () => void;
}

export function PositionPanel({
  walletAddress,
  onZapOut,
  onPositionsUpdate,
  onOverviewUpdate,
  onConnectWallet,
}: PositionPanelProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'learn'>('welcome');

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

  // Welcome screen for users without wallet
  if (!walletAddress) {
    return (
      <div className="h-full flex flex-col bg-[#030712]">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            Your Positions
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'welcome'
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Welcome
            </button>
            <button
              onClick={() => setActiveTab('learn')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'learn'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Learn
            </button>
          </div>

          {activeTab === 'welcome' ? (
            <div className="p-4 space-y-4">
              {/* Welcome Card */}
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Welcome to LP Scout</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Connect your wallet to track your Meteora liquidity positions, monitor PnL, and get AI-powered recommendations.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">AI Recommendations</h4>
                    <p className="text-xs text-gray-500">Get personalized pool suggestions based on market conditions</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Real-time Monitoring</h4>
                    <p className="text-xs text-gray-500">Track PnL, DPR, and in-range status across all positions</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Auto-Rebalancing</h4>
                    <p className="text-xs text-gray-500">Set up the engine to automatically rebalance positions</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats Demo */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 opacity-50">
                <div className="text-xs text-gray-500 mb-3">Preview: Portfolio Overview</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600">Total Value</div>
                    <div className="text-lg font-semibold text-gray-600">$0.00</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">PnL</div>
                    <div className="text-lg font-semibold text-gray-600">--</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Positions</div>
                    <div className="text-lg font-semibold text-gray-600">--</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Avg DPR</div>
                    <div className="text-lg font-semibold text-gray-600">--</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">LP Basics</h3>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'What is Liquidity Providing?',
                    content: 'LPs deposit token pairs into pools to enable trading. You earn fees from swaps proportional to your share of the pool.',
                  },
                  {
                    title: 'Understanding Impermanent Loss',
                    content: 'When token prices diverge, you may have less value than holding tokens separately. Higher fees can offset this.',
                  },
                  {
                    title: 'Strategy: Spot',
                    content: 'Equal distribution across price range. Best for stable pairs like USDC/USDT with minimal price movement.',
                  },
                  {
                    title: 'Strategy: Curve',
                    content: 'Concentrated liquidity around current price. Best for correlated assets like SOL/stSOL for higher fee efficiency.',
                  },
                  {
                    title: 'Strategy: BidAsk',
                    content: 'Wide range covering volatile movement. Best for directional pairs where you want to capture volatility fees.',
                  },
                  {
                    title: 'What is agentScore?',
                    content: 'Our composite metric combining realized yield, organic trading volume, and volatility-adjusted returns. Higher is better.',
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
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
