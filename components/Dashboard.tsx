'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, Activity, MessageCircle, Zap, ChevronDown } from 'lucide-react';
import { Pool, Position, PortfolioOverview } from '../lib/types';
import { PositionCard } from './PositionCard';
import { PoolCard } from './PoolCard';
import { ActionSheet } from './ActionSheet';
import { ChatOverlay } from './ChatOverlay';
import { ActivityFeed } from './ActivityFeed';
import { AutoManageToggle } from './AutoManageToggle';

interface DashboardProps {
  walletAddress: string | null;
  positions: Position[];
  pools: Pool[];
  overview: PortfolioOverview | null;
  onConnectWallet: () => void;
  onZapIn: (pool: Pool) => void;
  onZapOut: (position: Position) => void;
  onAction: (action: any) => void;
}

interface ActivityItem {
  id: string;
  type: 'rebalance' | 'zap_in' | 'zap_out' | 'fee_harvest';
  description: string;
  timestamp: string;
  value?: number;
}

export function Dashboard({
  walletAddress,
  positions,
  pools,
  overview,
  onConnectWallet,
  onZapIn,
  onZapOut,
  onAction,
}: DashboardProps) {
  const [showChat, setShowChat] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [autoManageEnabled, setAutoManageEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Connect to SSE for activities
  useEffect(() => {
    if (!walletAddress) return;

    const eventSource = new EventSource(`/api/activities?wallet=${walletAddress}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'activity') {
          setActivities(prev => [data.payload, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error('Failed to parse activity:', err);
      }
    };

    return () => eventSource.close();
  }, [walletAddress]);

  // Calculate portfolio health
  const healthyCount = positions.filter(p => p.isHealthy).length;
  const outOfRangeCount = positions.filter(p => !p.inRange).length;
  const totalYield = positions.reduce((sum, p) => sum + (p.current_value_usd * p.dpr), 0);

  return (
    <div className="min-h-screen bg-[#030712] pb-24">
      {/* Sticky header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-[#030712]/80 backdrop-blur-lg border-b border-[#1e293b]"
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">LP Scout</h1>
              <p className="text-xs text-[#94a3b8]">
                {walletAddress ? 'Live' : 'Demo Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!walletAddress ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onConnectWallet}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect
              </motion.button>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowActivity(true)}
                  className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors relative"
                >
                  <Activity className="w-5 h-5" />
                  {activities.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                      {Math.min(activities.length, 9)}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowChat(true)}
                  className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio summary bar */}
        {walletAddress && overview && (
          <div className="px-4 pb-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-[#94a3b8] mb-0.5">Total Value</p>
              <p className="text-xl font-bold text-white">
                ${overview.total_value_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="h-8 w-px bg-[#1e293b]" />
            <div>
              <p className="text-xs text-[#94a3b8] mb-0.5">24h Yield</p>
              <p className="text-lg font-semibold text-green-400">
                +${totalYield.toFixed(2)}
              </p>
            </div>
            <div className="h-8 w-px bg-[#1e293b]" />
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${outOfRangeCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm text-[#94a3b8]">
                {outOfRangeCount > 0 ? `${outOfRangeCount} need attention` : `${healthyCount} healthy`}
              </span>
            </div>
          </div>
        )}
      </motion.header>

      {/* Main scrollable content */}
      <div ref={scrollRef} className="px-4 py-6 space-y-8">
        {/* Auto-manage toggle (if wallet connected) */}
        {walletAddress && (
          <AutoManageToggle
            enabled={autoManageEnabled}
            onToggle={setAutoManageEnabled}
            earningsSinceOn={1247.50}
          />
        )}

        {/* Your Positions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Your Positions
            </h2>
            {positions.length > 0 && (
              <span className="text-sm text-[#94a3b8]">
                {healthyCount}/{positions.length} healthy
              </span>
            )}
          </div>

          <div className="space-y-3">
            {!walletAddress ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onConnectWallet}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-[#1e293b] hover:border-green-500/50 hover:bg-green-500/5 transition-colors"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0f172a] flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-[#94a3b8]" />
                  </div>
                  <p className="text-[#94a3b8] font-medium">Connect wallet to see positions</p>
                </div>
              </motion.button>
            ) : positions.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-[#0f172a] border border-[#1e293b]">
                <p className="text-[#94a3b8]">No open positions</p>
                <p className="text-sm text-[#64748b] mt-1">Discover pools below to start earning</p>
              </div>
            ) : (
              <AnimatePresence>
                {positions.map((position, i) => (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PositionCard
                      position={position}
                      onAction={(action) => {
                        if (action.type === 'ZAP_OUT') {
                          onZapOut(position);
                        } else {
                          setSelectedAction({ type: action.type, position });
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Top Pools */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Top Opportunities
            </h2>
            <button className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
              See All
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          </div>

          <div className="space-y-3">
            {pools.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-[#0f172a] border border-[#1e293b] shimmer" />
                ))}
              </div>
            ) : (
              <AnimatePresence>
                {pools.slice(0, 5).map((pool, i) => (
                  <motion.div
                    key={pool.address}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PoolCard
                      pool={pool}
                      rank={i + 1}
                      onZapIn={() => onZapIn(pool)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>

      {/* Floating chat button (mobile) */}
      {!showChat && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-500 shadow-lg shadow-green-500/25 flex items-center justify-center text-white z-40"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Overlays */}
      <AnimatePresence>
        {showChat && (
          <ChatOverlay
            walletAddress={walletAddress}
            onClose={() => setShowChat(false)}
            onAction={(action) => {
              onAction(action);
              setShowChat(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showActivity && (
          <ActivityFeed
            activities={activities}
            onClose={() => setShowActivity(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAction && (
          <ActionSheet
            action={selectedAction}
            onClose={() => setSelectedAction(null)}
            onConfirm={() => {
              // Handle action confirmation
              setSelectedAction(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
