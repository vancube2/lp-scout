'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, AlertTriangle, CheckCircle, ChevronRight, DollarSign, TrendingUp, Shield } from 'lucide-react';

interface LaunchPhase { phase: number; name: string; targetUSD: number; description: string; actions: string[]; duration: string; }

export function TokenLaunch() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({ token0: '', token1: '', marketCap: '', liquidity: '', volatility: 'balanced' });

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/token-launch/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token0Symbol: form.token0,
          token1Symbol: form.token1,
          options: { marketCap: parseFloat(form.marketCap) || 1000000, initialLiquidityUSD: parseFloat(form.liquidity) || 50000 },
        }),
      });
      const data = await res.json();
      if (data.success) setResult(data.analysis);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const steps = [
    { title: 'Token Pair', desc: 'Enter your token pair' },
    { title: 'Liquidity', desc: 'Initial liquidity size' },
    { title: 'Analysis', desc: 'Get recommendations' },
  ];

  return (
    <div className='px-4 py-6 space-y-6'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center'>
          <Rocket className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>Token Launch Bootstrapper</h2>
          <p className='text-xs text-[#94a3b8]'>Optimal Orca pool configuration for new tokens</p>
        </div>
      </div>

      <div className='flex gap-2'>
        {steps.map((s, i) => (
          <div key={i} className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium `}>
            <div className='font-bold'>{i + 1}. {s.title}</div>
            <div className='text-[10px] opacity-70'>{s.desc}</div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div>
            <label className='text-sm text-[#94a3b8] mb-1 block'>Token 0 Symbol</label>
            <input type='text' value={form.token0} onChange={(e) => setForm({ ...form, token0: e.target.value.toUpperCase() })} placeholder='e.g., SOL' className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-purple-500' />
          </div>
          <div>
            <label className='text-sm text-[#94a3b8] mb-1 block'>Token 1 Symbol</label>
            <input type='text' value={form.token1} onChange={(e) => setForm({ ...form, token1: e.target.value.toUpperCase() })} placeholder='e.g., USDC' className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-purple-500' />
          </div>
          <button onClick={() => setStep(1)} className='w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl'>Next <ChevronRight className='w-4 h-4 inline' /></button>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div>
            <label className='text-sm text-[#94a3b8] mb-1 block'>Estimated Market Cap (USD)</label>
            <input type='number' value={form.marketCap} onChange={(e) => setForm({ ...form, marketCap: e.target.value })} placeholder='1000000' className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-purple-500' />
          </div>
          <div>
            <label className='text-sm text-[#94a3b8] mb-1 block'>Initial Liquidity (USD)</label>
            <input type='number' value={form.liquidity} onChange={(e) => setForm({ ...form, liquidity: e.target.value })} placeholder='50000' className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white placeholder-[#475569] focus:outline-none focus:border-purple-500' />
          </div>
          <div className='flex gap-2'>
            <button onClick={() => setStep(0)} className='flex-1 py-3 border border-[#334155] text-[#94a3b8] font-semibold rounded-xl'>Back</button>
            <button onClick={() => { setStep(2); analyze(); }} className='flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl'>{loading ? 'Analyzing...' : 'Analyze'}</button>
          </div>
        </motion.div>
      )}

      {step === 2 && result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <div className='flex items-center gap-2 mb-2'><DollarSign className='w-4 h-4 text-green-400' /><h3 className='font-bold text-white'>Recommended Fee Tier</h3></div>
            <div className='text-2xl font-bold text-green-400'>{result.recommendations.feeTier.label}</div>
            <p className='text-xs text-[#94a3b8] mt-1'>{result.recommendations.feeTier.reason}</p>
          </div>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <div className='flex items-center gap-2 mb-2'><TrendingUp className='w-4 h-4 text-blue-400' /><h3 className='font-bold text-white'>Tick Range</h3></div>
            <div className='text-lg font-bold text-blue-400'>{result.recommendations.tickRange.type}</div>
            <p className='text-xs text-[#94a3b8] mt-1'>{result.recommendations.tickRange.reasoning}</p>
            <p className='text-xs text-[#64748b] mt-1'>Expected utilization: {result.recommendations.tickRange.expectedUtilization}</p>
          </div>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <div className='flex items-center gap-2 mb-2'><Shield className='w-4 h-4 text-yellow-400' /><h3 className='font-bold text-white'>Liquidity Requirements</h3></div>
            <div className='grid grid-cols-3 gap-2 text-sm'>
              <div className='text-center'><div className='text-[#94a3b8] text-xs'>Minimum</div><div className='text-white font-bold'></div></div>
              <div className='text-center'><div className='text-[#94a3b8] text-xs'>Recommended</div><div className='text-white font-bold'></div></div>
              <div className='text-center'><div className='text-[#94a3b8] text-xs'>Optimal</div><div className='text-white font-bold'></div></div>
            </div>
          </div>
          <div className='space-y-2'>
            <h3 className='font-bold text-white text-sm'>Bootstrap Timeline</h3>
            {result.bootstrapPhases.map((phase: LaunchPhase) => (
              <div key={phase.phase} className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold'>{phase.phase}</div>
                  <div className='font-bold text-white text-sm'>{phase.name}</div>
                  <div className='ml-auto text-xs text-[#94a3b8]'>{phase.duration}</div>
                </div>
                <p className='text-xs text-[#94a3b8] mt-1'>{phase.description}</p>
                <div className='mt-1 text-xs text-green-400'>Target: </div>
              </div>
            ))}
          </div>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <h3 className='font-bold text-white text-sm mb-2'>Risk Assessment</h3>
            {result.riskFactors.map((risk: any, i: number) => (
              <div key={i} className='flex items-start gap-2 mb-2'>
                <AlertTriangle className={`w-4 h-4 mt-0.5 `} />
                <div><div className='text-sm text-white'>{risk.factor}</div><div className='text-xs text-[#94a3b8]'>{risk.mitigation}</div></div>
              </div>
            ))}
          </div>
          <div className='bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4'>
            <h3 className='font-bold text-white text-sm mb-2'>Your Revenue Opportunity</h3>
            <div className='flex justify-between text-sm'><span className='text-[#94a3b8]'>Launch Assist Fee</span><span className='text-purple-400 font-bold'></span></div>
            <div className='flex justify-between text-sm mt-1'><span className='text-[#94a3b8]'>Projected Referral</span><span className='text-green-400 font-bold'>/mo</span></div>
          </div>
          <button onClick={() => { setStep(0); setResult(null); }} className='w-full py-3 border border-[#334155] text-[#94a3b8] font-semibold rounded-xl'>Start Over</button>
        </motion.div>
      )}
    </div>
  );
}
