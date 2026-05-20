'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, Zap, Droplets, ArrowUpRight,
  Rocket, ArrowRightLeft, Volume2, Trophy, Gavel, Building2,
  LayoutDashboard
} from 'lucide-react';
import { OrcaPool, OrcaPosition, PortfolioOverview } from '../lib/types';
import { formatCurrency, formatPercent, formatFeeRate, getTickRangeLabel } from '../lib/utils';
import { TokenLaunch } from './TokenLaunch';
import { Migration } from './Migration';
import { VolumeAlerts } from './VolumeAlerts';
import { Leaderboard } from './Leaderboard';
import { Governance } from './Governance';
import { MultiWallet } from './MultiWallet';

interface DashboardProps {
  walletAddress: string | null;
  positions: OrcaPosition[];
  pools: OrcaPool[];
  overview: PortfolioOverview | null;
  onConnectWallet: () => void;
  onWalletConnected: (address: string | null) => void;
  onZapIn: (pool: OrcaPool) => void;
  onZapOut: (position: OrcaPosition) => void;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'token-launch', label: 'Launch', icon: Rocket },
  { id: 'migration', label: 'Migrate', icon: ArrowRightLeft },
  { id: 'volume', label: 'Volume', icon: Volume2 },
  { id: 'leaderboard', label: 'Rankings', icon: Trophy },
  { id: 'governance', label: 'Gov', icon: Gavel },
  { id: 'multiwallet', label: 'DAO', icon: Building2 },
];

export function Dashboard(props: DashboardProps) {
  const { walletAddress, positions, pools, overview, onConnectWallet, onWalletConnected, onZapIn, onZapOut } = props;
  const [activeTab, setActiveTab] = useState('overview');
  const healthyCount = positions.filter((p) => p.isHealthy).length;
  const totalYield = positions.reduce((sum, p) => sum + (p.current_value_usd * p.dpr || 0), 0);

  const renderOverview = () => (
    <div className='space-y-8'>
      <section>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <TrendingUp className='w-5 h-5 text-green-400' />
            Your Positions
          </h2>
        </div>
        {!walletAddress ? (
          <div className='py-8 text-center rounded-2xl bg-[#0f172a] border border-[#1e293b]'>
            <p className='text-[#94a3b8] mb-2'>Connect your wallet to see Orca positions</p>
            <button onClick={onConnectWallet} className='mt-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg'>
              Connect Wallet
            </button>
          </div>
        ) : positions.length === 0 ? (
          <div className='py-8 text-center rounded-2xl bg-[#0f172a] border border-[#1e293b]'>
            <p className='text-[#94a3b8]'>No active Orca positions found</p>
            <p className='text-xs text-[#64748b] mt-1'>Enter a pool below to start earning fees</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {positions.map((position) => (
              <div key={position.id}
                className={`bg-[#0f172a] border rounded-2xl p-4 transition-colors ${position.isHealthy ? 'border-[#1e293b]' : 'border-yellow-500/50'}`}
              >
                <div className='flex items-start justify-between mb-3'>
                  <div>
                    <h3 className='font-bold text-white text-sm'>{position.token0_symbol}/{position.token1_symbol}</h3>
                    <p className='text-xs text-[#94a3b8]'>{getTickRangeLabel(position.tick_lower, position.tick_upper)} &middot; {formatFeeRate(position.fee_tier)}</p>
                  </div>
                  <div className='text-right'>
                    <span className={`text-xs px-2 py-1 rounded-full ${position.inRange ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {position.inRange ? 'In Range' : 'Out of Range'}
                    </span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 text-sm'>
                  <div><p className='text-[#94a3b8]'>Value</p><p className='text-white'>{formatCurrency(position.current_value_usd)}</p></div>
                  <div><p className='text-[#94a3b8]'>PnL</p><p className={position.pnl?.percent >= 0 ? 'text-green-400' : 'text-red-400'}>{formatPercent(position.pnl?.percent || 0)}</p></div>
                  <div><p className='text-[#94a3b8]'>Daily</p><p className='text-green-400'>{formatPercent(position.dpr)}</p></div>
                </div>
                {position.uncollected_fees_usd > 0 && (
                  <div className='mt-3 pt-3 border-t border-[#1e293b] flex justify-between'>
                    <span className='text-sm text-[#94a3b8]'>Uncollected fees</span>
                    <span className='text-sm text-green-400'>{formatCurrency(position.uncollected_fees_usd)}</span>
                  </div>
                )}
                <div className='mt-3 flex gap-2'>
                  <button onClick={() => onZapOut(position)} className='flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium'>Exit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-bold text-white flex items-center gap-2'>
            <Zap className='w-5 h-5 text-yellow-400' />
            Top Orca Opportunities
          </h2>
          <a href='https://orca.so/pools' target='_blank' rel='noopener noreferrer' className='text-xs text-blue-400 flex items-center gap-1 hover:underline'>
            View on Orca <ArrowUpRight className='w-3 h-3' />
          </a>
        </div>
        {pools.length === 0 ? (
          <div className='space-y-3'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-24 rounded-2xl bg-[#0f172a] border border-[#1e293b] animate-pulse' />
            ))}
          </div>
        ) : (
          <div className='space-y-3'>
            {pools.map((pool, i) => (
              <div key={pool.address || i} className='bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] rounded-2xl p-4 transition-colors'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center font-bold text-sm text-blue-400'>#{i + 1}</div>
                    <div>
                      <h3 className='font-bold text-white text-sm'>{pool.token0_symbol}/{pool.token1_symbol}</h3>
                      <p className='text-xs text-[#94a3b8]'>Fee {pool.fee_tier_label}</p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-[#94a3b8]'>Agent Score</p>
                    <p className='text-green-400 font-bold'>{(pool.agentScore || 0).toFixed(1)}</p>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 mb-3'>
                  <div className='bg-[#1e293b]/50 rounded-lg p-2'>
                    <p className='text-xs text-[#94a3b8]'>TVL</p>
                    <p className='text-sm font-semibold text-white'>{formatCurrency(pool.tvl)}</p>
                  </div>
                  <div className='bg-[#1e293b]/50 rounded-lg p-2'>
                    <p className='text-xs text-[#94a3b8]'>Volume</p>
                    <p className='text-sm font-semibold text-white'>{formatCurrency(pool.vol_24h)}</p>
                  </div>
                  <div className='bg-[#1e293b]/50 rounded-lg p-2'>
                    <p className='text-xs text-[#94a3b8]'>Daily Yield</p>
                    <p className='text-sm font-semibold text-green-400'>{formatPercent(((pool.vol_24h * pool.fee_rate) / pool.tvl) * 100)}</p>
                  </div>
                </div>
                <button onClick={() => onZapIn(pool)} className='w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg'>Enter Pool</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'token-launch': return <TokenLaunch />;
      case 'migration': return <Migration />;
      case 'volume': return <VolumeAlerts />;
      case 'leaderboard': return <Leaderboard />;
      case 'governance': return <Governance />;
      case 'multiwallet': return <MultiWallet />;
      default: return renderOverview();
    }
  };

  return (
    <div className='min-h-screen bg-[#030712] pb-24'>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className='sticky top-0 z-40 bg-[#030712]/80 backdrop-blur-lg border-b border-[#1e293b]'
      >
        <div className='px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center'>
              <Droplets className='w-5 h-5 text-white' />
            </div>
            <div>
              <h1 className='text-lg font-bold text-white'>Orca LP Agent</h1>
              <p className='text-xs text-[#94a3b8]'>{walletAddress ? 'Live' : 'Demo Mode'}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {!walletAddress ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={onConnectWallet}
                className='px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2'
              >
                <Wallet className='w-4 h-4' /> Connect Wallet
              </motion.button>
            ) : (
              <div className='flex items-center gap-2'>
                <span className='text-xs text-[#94a3b8] hidden sm:inline'>{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                <button onClick={() => onWalletConnected(null)} className='px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg'>Disconnect</button>
              </div>
            )}
          </div>
        </div>

        {walletAddress && overview && (
          <div className='px-4 pb-4 flex items-center gap-6'>
            <div>
              <p className='text-xs text-[#94a3b8] mb-0.5'>Total Value</p>
              <p className='text-xl font-bold text-white'>${overview.total_value_usd?.toFixed(0) || '0'}</p>
            </div>
            <div className='h-8 w-px bg-[#1e293b]' />
            <div>
              <p className='text-xs text-[#94a3b8] mb-0.5'>24h Yield</p>
              <p className='text-lg font-semibold text-green-400'>+${totalYield.toFixed(2)}</p>
            </div>
            <div className='h-8 w-px bg-[#1e293b]' />
            <div className='flex items-center gap-2'>
              <div className={`w-2 h-2 rounded-full ${positions.length > 0 && healthyCount === positions.length ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className='text-sm text-[#94a3b8]'>{positions.length > 0 ? `${healthyCount}/${positions.length} healthy` : 'No positions'}</span>
            </div>
          </div>
        )}

        <div className='px-4 pb-2'>
          <div className='flex gap-1 overflow-x-auto pb-1'>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155]'
                  }`}
                >
                  <Icon className='w-3.5 h-3.5' />{tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.header>

      <div className='px-4 py-6'>{renderTabContent()}</div>
    </div>
  );
}
