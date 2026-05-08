'use client';

import { useState, useEffect } from 'react';
import { X, Zap, AlertCircle, ExternalLink } from 'lucide-react';
import { zapIn, zapOut } from '../lib/lpAgent';
import { Pool, Position, ZapResult, ActionData } from '../lib/types';
import { formatCurrency, getSolscanLink, truncateAddress } from '../lib/utils';

interface ZapModalProps {
  mode: 'in' | 'out';
  pool: Pool | null;
  position: Position | null;
  pendingAction: ActionData | null;
  walletAddress: string | null;
  onClose: (success?: boolean, result?: ZapResult) => void;
}

const STRATEGIES = [
  {
    value: 'Spot',
    label: 'Spot',
    description: 'Equal distribution. Best for stable pairs like USDC/USDT.',
  },
  {
    value: 'Curve',
    label: 'Curve',
    description: 'Concentrated around current price. Best for correlated assets like SOL/stSOL.',
  },
  {
    value: 'BidAsk',
    label: 'BidAsk',
    description: 'Wide range. Best for volatile/directional pairs.',
  },
];

const SLIPPAGE_OPTIONS = [50, 100, 200, 500];
const WITHDRAW_OPTIONS = [25, 50, 75, 100];

export function ZapModal({
  mode,
  pool,
  position,
  pendingAction,
  walletAddress,
  onClose,
}: ZapModalProps) {
  // Zap In state
  const [inputSOL, setInputSOL] = useState(pendingAction?.inputSOL?.toString() || '');
  const [strategy, setStrategy] = useState<'Spot' | 'Curve' | 'BidAsk'>(
    pendingAction?.strategy || 'Spot'
  );
  const [slippage, setSlippage] = useState(500);
  const [customSlippage, setCustomSlippage] = useState('');

  // Zap Out state
  const [withdrawBps, setWithdrawBps] = useState(pendingAction?.bps || 10000);

  // Common state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ZapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set initial values from pending action
  useEffect(() => {
    if (pendingAction) {
      if (pendingAction.inputSOL) {
        setInputSOL(pendingAction.inputSOL.toString());
      }
      if (pendingAction.strategy) {
        setStrategy(pendingAction.strategy);
      }
      if (pendingAction.bps) {
        setWithdrawBps(pendingAction.bps);
      }
    }
  }, [pendingAction]);

  const handleZapIn = async () => {
    if (!walletAddress || !pool || !inputSOL) return;

    try {
      setLoading(true);
      setError(null);

      const res = await zapIn(pool.address, {
        owner: walletAddress,
        inputSOL: parseFloat(inputSOL),
        strategy,
        slippage_bps: customSlippage ? parseInt(customSlippage) : slippage,
      });

      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute zap in');
    } finally {
      setLoading(false);
    }
  };

  const handleZapOut = async () => {
    if (!position) return;

    try {
      setLoading(true);
      setError(null);

      const res = await zapOut(position.id, withdrawBps);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute zap out');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (bps: number) => `${(bps / 100).toFixed(0)}%`;

  if (!walletAddress) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
            <p className="text-gray-400 mb-4">Please connect your wallet to continue.</p>
            <button
              onClick={() => onClose()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold">
              {mode === 'in' ? 'Zap In' : 'Zap Out'}
            </h2>
          </div>
          <button onClick={() => onClose()} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Result View */}
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-green-400 font-semibold mb-2">Transaction Submitted!</div>
              {result.tx_hash && (
                <a
                  href={getSolscanLink(result.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline"
                >
                  View on Solscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {result.quote && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Expected Output</div>
                <div className="space-y-1">
                  {result.quote.token0_out && (
                    <div className="flex justify-between">
                      <span>Token 0:</span>
                      <span>{result.quote.token0_out.toFixed(6)}</span>
                    </div>
                  )}
                  {result.quote.token1_out && (
                    <div className="flex justify-between">
                      <span>Token 1:</span>
                      <span>{result.quote.token1_out.toFixed(6)}</span>
                    </div>
                  )}
                  {result.quote.estimated_value_usd && (
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Estimated Value:</span>
                      <span className="font-semibold">
                        {formatCurrency(result.quote.estimated_value_usd)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => onClose(true, result || undefined)}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Pool/Position Info */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              {mode === 'in' && pool && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Pool</span>
                    <span className="font-semibold">
                      {pool.token0_symbol}/{pool.token1_symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Agent Score</span>
                    <span className="text-green-400 font-semibold">
                      {(pool.agentScore || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {mode === 'out' && position && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Position</span>
                    <span className="font-semibold">
                      {position.token0_symbol}/{position.token1_symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Value</span>
                    <span className="font-semibold">
                      {formatCurrency(position.current_value_usd)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Zap In Form */}
            {mode === 'in' && (
              <div className="space-y-4">
                {/* SOL Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">SOL Amount</label>
                  <input
                    type="number"
                    value={inputSOL}
                    onChange={(e) => setInputSOL(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Strategy Selector */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Strategy</label>
                  <div className="space-y-2">
                    {STRATEGIES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStrategy(s.value as any)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          strategy === s.value
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slippage */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Slippage Tolerance</label>
                  <div className="flex gap-2 mb-2">
                    {SLIPPAGE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setSlippage(option);
                          setCustomSlippage('');
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          slippage === option && !customSlippage
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {(option / 100).toFixed(1)}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => setCustomSlippage(e.target.value)}
                    placeholder="Custom slippage (bps)"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {/* Zap Out Form */}
            {mode === 'out' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Withdraw Amount</label>
                  <div className="flex gap-2 mb-4">
                    {WITHDRAW_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setWithdrawBps(option * 100)}
                        className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                          withdrawBps === option * 100
                            ? 'bg-red-500/20 border border-red-500 text-red-400'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {option}%
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10000"
                    value={withdrawBps}
                    onChange={(e) => setWithdrawBps(parseInt(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <div className="text-center text-sm text-gray-400 mt-2">
                    {formatPercent(withdrawBps)}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={mode === 'in' ? handleZapIn : handleZapOut}
              disabled={
                loading ||
                (mode === 'in' && (!inputSOL || parseFloat(inputSOL) <= 0)) ||
                (mode === 'out' && !position)
              }
              className={`w-full mt-6 py-3 font-semibold rounded-lg transition-colors ${
                mode === 'in'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : mode === 'in' ? (
                'Confirm Zap In'
              ) : (
                'Confirm Exit'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
