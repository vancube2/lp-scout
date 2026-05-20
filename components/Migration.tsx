'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, TrendingUp, Wallet, Zap, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';

export function Migration() {
  const [sourceDEX, setSourceDEX] = useState('raydium');
  const [pair, setPair] = useState('SOL/USDC');
  const [value, setValue] = useState('10000');
  const [apr, setApr] = useState('0.15');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/migration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceDEX, poolPair: pair, currentPositionValue: parseFloat(value), currentAPR: parseFloat(apr) }),
      });
      const data = await res.json();
      if (data.success) setResult(data.result);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const dexOptions = [
    { id: 'raydium', name: 'Raydium', color: 'text-red-400' },
    { id: 'meteora', name: 'Meteora', color: 'text-orange-400' },
    { id: 'uniswap', name: 'Uniswap v3', color: 'text-pink-400' },
    { id: 'sushiswap', name: 'SushiSwap', color: 'text-blue-400' },
  ];

  return (
    <div className='px-4 py-6 space-y-6'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center'>
          <ArrowRightLeft className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>Pool Migration Assistant</h2>
          <p className='text-xs text-[#94a3b8]'>Migrate your LP positions to Orca for better yields</p>
        </div>
      </div>

      {!result ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div>
            <label className='text-sm text-[#94a3b8] mb-2 block'>Current DEX</label>
            <div className='grid grid-cols-2 gap-2'>
              {dexOptions.map((dex) => (
                <button key={dex.id} onClick={() => setSourceDEX(dex.id)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-colors `}
                >{dex.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label className='text-sm text-[#94a3b8] mb-1 block'>Pool Pair</label>
            <input type='text' value={pair} onChange={(e) => setPair(e.target.value.toUpperCase())} className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-orange-500' />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='text-sm text-[#94a3b8] mb-1 block'>Position Value ($)</label>
              <input type='number' value={value} onChange={(e) => setValue(e.target.value)} className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-orange-500' />
            </div>
            <div>
              <label className='text-sm text-[#94a3b8] mb-1 block'>Current APR (%)</label>
              <input type='number' value={apr} onChange={(e) => setApr(e.target.value)} step='0.01' className='w-full px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-orange-500' />
            </div>
          </div>
          <button onClick={analyze} disabled={loading} className='w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl disabled:opacity-50'>{loading ? 'Analyzing...' : 'Analyze Migration'}</button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          {result.canMigrate ? (
            <>
              <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
                <h3 className='font-bold text-white text-sm mb-3'>Yield Comparison</h3>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='bg-[#1e293b]/50 rounded-lg p-3 text-center'>
                    <div className='text-xs text-[#94a3b8]'>{result.source.dex}</div>
                    <div className='text-lg font-bold text-[#94a3b8]'>{(result.source.currentAPR * 100).toFixed(1)}%</div>
                    <div className='text-xs text-[#64748b]'>Current APR</div>
                  </div>
                  <div className='bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/30'>
                    <div className='text-xs text-orange-400'>Orca</div>
                    <div className='text-lg font-bold text-orange-400'>{(result.orca.projection.projectedAPR * 100).toFixed(1)}%</div>
                    <div className='text-xs text-green-400'>+{result.comparison.aprDeltaPercent}%</div>
                  </div>
                </div>
              </div>
              <div className='bg-green-500/10 border border-green-500/30 rounded-2xl p-4'>
                <div className='flex items-center gap-2 mb-2'><TrendingUp className='w-4 h-4 text-green-400' /><span className='text-sm font-bold text-green-400'>Migration Benefits</span></div>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'><span className='text-[#94a3b8]'>Capital Efficiency</span><span className='text-white font-bold'>{result.comparison.capitalEfficiencyGain}</span></div>
                  <div className='flex justify-between'><span className='text-[#94a3b8]'>Fee Savings/Year</span><span className='text-white font-bold'></span></div>
                  {result.breakEvenDays && <div className='flex justify-between'><span className='text-[#94a3b8]'>Break-even</span><span className='text-white font-bold'>{result.breakEvenDays} days</span></div>}
                </div>
              </div>
              <div className='space-y-2'>
                <h3 className='font-bold text-white text-sm'>Migration Steps</h3>
                {result.migrationPath.map((step: any) => (
                  <div key={step.step} className='flex items-start gap-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3'>
                    <div className='w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0'>{step.step}</div>
                    <div className='flex-1'><div className='text-sm text-white'>{step.action}</div><div className='text-xs text-[#64748b]'>{step.estimatedTime} \u00b7 {step.gasCost}</div></div>
                  </div>
                ))}
              </div>
              <button onClick={() => setResult(null)} className='w-full py-3 border border-[#334155] text-[#94a3b8] font-semibold rounded-xl'>Analyze Another Position</button>
            </>
          ) : (
            <div className='bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center'>
              <AlertTriangle className='w-8 h-8 text-red-400 mx-auto mb-2' />
              <div className='text-white font-bold'>Cannot Migrate Automatically</div>
              <p className='text-sm text-[#94a3b8] mt-1'>{result.reason}</p>
              {result.action === 'CREATE_POOL' && <div className='mt-3 text-xs text-green-400'>Use the Token Launch Bootstrapper to create this pool first</div>}
              <button onClick={() => setResult(null)} className='mt-4 w-full py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg'>Back</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
