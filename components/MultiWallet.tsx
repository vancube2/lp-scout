'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Wallet, TrendingUp, AlertTriangle, Users, ChevronRight, Trash2 } from 'lucide-react';

export function MultiWallet() {
  const [orgName, setOrgName] = useState('');
  const [ownerWallet, setOwnerWallet] = useState('');
  const [org, setOrg] = useState<any>(null);
  const [newWallet, setNewWallet] = useState('');
  const [portfolio, setPortfolio] = useState<any>(null);
  const [view, setView] = useState<'create' | 'manage'>('create');

  const createOrg = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/multiwallet/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName || 'My Organization', ownerWallet: ownerWallet || 'demo_owner' }),
      });
      const data = await res.json();
      if (data.success) { setOrg(data.org); setView('manage'); }
    } catch (e) { console.error(e); }
  };

  const addWallet = async () => {
    if (!org || !newWallet) return;
    try {
      const res = await fetch('http://localhost:4000/api/multiwallet/org/' + org.id + '/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: newWallet }),
      });
      const data = await res.json();
      if (data.success) { setOrg(data.org); setNewWallet(''); fetchPortfolio(data.org.id); }
    } catch (e) { console.error(e); }
  };

  const fetchPortfolio = async (orgId: string) => {
    try {
      const res = await fetch('http://localhost:4000/api/multiwallet/org/' + orgId + '/portfolio');
      const data = await res.json();
      if (data.success) setPortfolio(data.portfolio);
    } catch (e) { console.error(e); }
  };

  return (
    <div className='px-4 py-6 space-y-4'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-400 flex items-center justify-center'>
          <Building2 className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>Multi-Wallet View</h2>
          <p className='text-xs text-[#94a3b8]'>Manage multiple LP wallets for DAOs and funds</p>
        </div>
      </div>

      {view === 'create' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <h3 className='font-bold text-white text-sm mb-3'>Create Organization</h3>
            <div className='space-y-3'>
              <div>
                <label className='text-xs text-[#94a3b8] mb-1 block'>Organization Name</label>
                <input type='text' value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder='e.g., My DAO Treasury' className='w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:outline-none focus:border-slate-500' />
              </div>
              <div>
                <label className='text-xs text-[#94a3b8] mb-1 block'>Owner Wallet</label>
                <input type='text' value={ownerWallet} onChange={(e) => setOwnerWallet(e.target.value)} placeholder='Solana wallet address' className='w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white focus:outline-none focus:border-slate-500' />
              </div>
            </div>
          </div>
          <button onClick={createOrg} className='w-full py-3 bg-slate-500 hover:bg-slate-600 text-white font-semibold rounded-xl'><Plus className='w-4 h-4 inline mr-1' /> Create Organization</button>
        </motion.div>
      )}

      {view === 'manage' && org && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-4'>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='font-bold text-white'>{org.name}</div>
                <div className='text-xs text-[#94a3b8]'>{org.wallets.length} wallets \u00b7 ID: {org.id.slice(0, 8)}...</div>
              </div>
              <button onClick={() => { setOrg(null); setPortfolio(null); setView('create'); }} className='text-xs text-red-400'>Reset</button>
            </div>
          </div>

          <div className='flex gap-2'>
            <input type='text' value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder='Add wallet address' className='flex-1 px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white text-sm focus:outline-none focus:border-slate-500' />
            <button onClick={addWallet} className='px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-xl'><Plus className='w-4 h-4' /></button>
          </div>

          <button onClick={() => fetchPortfolio(org.id)} className='w-full py-2 bg-[#1e293b] hover:bg-[#334155] text-white text-sm rounded-xl'>
            <Wallet className='w-4 h-4 inline mr-1' /> Load Aggregated Portfolio
          </button>

          {portfolio && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-2'>
                <div className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-center'>
                  <div className='text-lg font-bold text-white'></div>
                  <div className='text-xs text-[#94a3b8]'>Total Value</div>
                </div>
                <div className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-center'>
                  <div className={`text-lg font-bold `}>{parseFloat(portfolio.totalPnLPercent) >= 0 ? '+' : ''}{portfolio.totalPnLPercent}%</div>
                  <div className='text-xs text-[#94a3b8]'>Total PnL</div>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='text-xs font-bold text-[#94a3b8] uppercase tracking-wider'>Wallet Performance</div>
                {portfolio.walletSummaries.map((w: any) => (
                  <div key={w.wallet} className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Wallet className='w-4 h-4 text-[#94a3b8]' />
                        <span className='text-sm text-white font-mono'>{w.walletShort}</span>
                      </div>
                      <div className='text-sm text-white'></div>
                    </div>
                    <div className='flex justify-between text-xs mt-1'>
                      <span className='text-[#94a3b8]'>{w.positionsCount} positions \u00b7 Health {w.healthScore}%</span>
                      <span className={w.totalPnLUSD >= 0 ? 'text-green-400' : 'text-red-400'}>{w.totalPnLUSD >= 0 ? '+' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>

              {portfolio.poolBreakdown.length > 0 && (
                <div className='space-y-2'>
                  <div className='text-xs font-bold text-[#94a3b8] uppercase tracking-wider'>Pool Concentration</div>
                  {portfolio.poolBreakdown.slice(0, 5).map((p: any) => (
                    <div key={p.poolAddress} className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-white'>{p.pair}</span>
                        <span className='text-xs text-[#94a3b8]'>{p.shareOfPortfolio}</span>
                      </div>
                      <div className='w-full h-1.5 bg-[#1e293b] rounded-full mt-2'>
                        <div style={{ width: p.shareOfPortfolio }} className='h-full bg-slate-400 rounded-full' />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {portfolio.riskFlags.length > 0 && (
                <div className='space-y-2'>
                  <div className='text-xs font-bold text-red-400 uppercase tracking-wider'>Risk Alerts</div>
                  {portfolio.riskFlags.map((flag: any, i: number) => (
                    <div key={i} className='bg-red-500/10 border border-red-500/30 rounded-xl p-3'>
                      <div className='flex items-center gap-2'><AlertTriangle className='w-4 h-4 text-red-400' /><span className='text-sm text-red-400 font-bold'>{flag.type}</span></div>
                      <p className='text-xs text-[#94a3b8] mt-1'>{flag.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {portfolio.recommendations.length > 0 && (
                <div className='bg-gradient-to-r from-slate-500/10 to-gray-500/10 border border-slate-500/30 rounded-2xl p-4'>
                  <div className='text-xs font-bold text-white uppercase tracking-wider mb-2'>AI Recommendations</div>
                  {portfolio.recommendations.map((rec: any, i: number) => (
                    <div key={i} className='flex items-start gap-2 mb-2'>
                      <ChevronRight className='w-4 h-4 text-slate-400 shrink-0 mt-0.5' />
                      <div>
                        <div className='text-sm text-white'>{rec.message}</div>
                        <div className='text-xs text-slate-400'>Priority: {rec.priority}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
