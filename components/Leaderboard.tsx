'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Shield, Users, Star, ChevronRight, Flame } from 'lucide-react';

export function Leaderboard() {
  const [lpers, setLpers] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('riskAdjusted');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchTrending();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/leaderboard?sortBy=' + sortBy + '&limit=20');
      const data = await res.json();
      if (data.success) setLpers(data.rankings);
    } catch (e) { console.error(e); }
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/leaderboard/trending/list?limit=5');
      const data = await res.json();
      if (data.success) setTrending(data.trending);
    } catch (e) { console.error(e); }
  };

  const fetchDetails = async (wallet: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/leaderboard/' + wallet);
      const data = await res.json();
      if (data.success) setSelected(data.lper);
    } catch (e) { console.error(e); }
  };

  const rankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/50';
    if (rank === 3) return 'bg-orange-700/20 text-orange-400 border-orange-700/50';
    return 'bg-[#1e293b] text-[#94a3b8] border-[#1e293b]';
  };

  return (
    <div className='px-4 py-6 space-y-4'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center'>
          <Trophy className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>LP Leaderboards</h2>
          <p className='text-xs text-[#94a3b8]'>Top Orca LPs by risk-adjusted yield</p>
        </div>
      </div>

      <div className='flex gap-1 overflow-x-auto pb-1'>
        {[
          { key: 'riskAdjusted', label: 'Risk-Adj', icon: Shield },
          { key: 'apr', label: 'APR', icon: TrendingUp },
          { key: 'sharpe', label: 'Sharpe', icon: Star },
          { key: 'fees', label: 'Fees', icon: Flame },
        ].map((s) => (
          <button key={s.key} onClick={() => { setSortBy(s.key); setSelected(null); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap `}
          >
            <s.icon className='w-3 h-3 inline mr-1' /> {s.label}
          </button>
        ))}
      </div>

      {trending.length > 0 && (
        <div className='space-y-2'>
          <div className='text-xs font-bold text-[#94a3b8] uppercase tracking-wider'>Trending</div>
          <div className='flex gap-2 overflow-x-auto pb-1'>
            {trending.map((t: any) => (
              <div key={t.wallet} className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 min-w-[160px]'>
                <div className='text-sm font-bold text-white'>{t.displayName}</div>
                <div className='text-xs text-yellow-400'>{t.apr30d}% APR</div>
                <div className='text-xs text-[#64748b]'>{t.streakDays} day streak</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='space-y-2'>
        {lpers.map((lper: any) => (
          <motion.div key={lper.wallet} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => fetchDetails(lper.wallet)}
            className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors hover:border-[#475569] `}
          >
            <div className='w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0'>
              {lper.rank <= 3 ? (
                <Trophy className={`w-5 h-5 `} />
              ) : (
                <span>{lper.rank}</span>
              )}
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-sm text-white truncate'>{lper.displayName}</span>
                {lper.isVerified && <Shield className='w-3 h-3 text-blue-400 shrink-0' />}
              </div>
              <div className='text-xs text-[#94a3b8]'>{lper.primaryPool} \u00b7 Sharpe {lper.sharpeRatio}</div>
            </div>
            <div className='text-right shrink-0'>
              <div className='text-sm font-bold text-green-400'>{lper.riskAdjustedYield}%</div>
              <div className='text-xs text-[#64748b]'>{lper.followers} followers</div>
            </div>
          </motion.div>
        ))}
      </div>

      {selected && (
        <div className='fixed inset-0 bg-black/80 z-50 p-4 flex items-center justify-center'>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-bold text-white'>{selected.displayName}</h3>
              <button onClick={() => setSelected(null)} className='text-[#94a3b8]'>\u2715</button>
            </div>
            <div className='grid grid-cols-2 gap-3 mb-4'>
              <div className='bg-[#1e293b]/50 rounded-lg p-3 text-center'>
                <div className='text-xs text-[#94a3b8]'>30d APR</div>
                <div className='text-lg font-bold text-green-400'>{selected.apr30d}%</div>
              </div>
              <div className='bg-[#1e293b]/50 rounded-lg p-3 text-center'>
                <div className='text-xs text-[#94a3b8]'>Win Rate</div>
                <div className='text-lg font-bold text-white'>{selected.winRate}%</div>
              </div>
            </div>
            <div className='space-y-2 mb-4'>
              <div className='flex justify-between text-sm'><span className='text-[#94a3b8]'>Total Value</span><span className='text-white'></span></div>
              <div className='flex justify-between text-sm'><span className='text-[#94a3b8]'>Max Drawdown</span><span className='text-red-400'>{selected.maxDrawdown}%</span></div>
              <div className='flex justify-between text-sm'><span className='text-[#94a3b8]'>Fees Earned (30d)</span><span className='text-green-400'></span></div>
            </div>
            {selected.copyStats && (
              <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4'>
                <div className='text-xs text-yellow-400 font-bold mb-1'>Copy This LP</div>
                <div className='text-sm text-white'>{selected.copyStats.totalFollowers} followers managing ~</div>
                <div className='text-xs text-[#94a3b8] mt-1'>Your 2% copy fee potential: </div>
              </div>
            )}
            <button className='w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg'>
              <Users className='w-4 h-4 inline mr-1' /> Start Copying
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
