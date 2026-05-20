'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gavel, CheckCircle, Clock, AlertTriangle, Vote, FileText } from 'lucide-react';

export function Governance() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'passed'>('all');

  useEffect(() => {
    fetchProposals();
    fetchSummary();
  }, [filter]);

  const fetchProposals = async () => {
    try {
      let url = 'http://localhost:4000/api/governance/proposals';
      if (filter !== 'all') url += '?status=' + filter.toUpperCase();
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setProposals(data.proposals);
    } catch (e) { console.error(e); }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/governance/summary');
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch (e) { console.error(e); }
  };

  const statusColor = (status: string) => {
    if (status === 'ACTIVE') return 'text-green-400 border-green-500/50 bg-green-500/10';
    if (status === 'PASSED') return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
    return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
  };

  const categoryIcon = (cat: string) => {
    if (cat === 'FEE_TIER') return '\ud83d\udcb0';
    if (cat === 'PROTOCOL_FEE') return '\u2699\ufe0f';
    if (cat === 'INCENTIVES') return '\ud83c\udf81';
    if (cat === 'TECHNICAL') return '\ud83d\udd27';
    return '\ud83d\udccb';
  };

  return (
    <div className='px-4 py-6 space-y-4'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center'>
          <Gavel className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>Governance Tracker</h2>
          <p className='text-xs text-[#94a3b8]'>Proposals affecting your LP positions</p>
        </div>
      </div>

      {summary && (
        <div className='grid grid-cols-3 gap-2'>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-center'>
            <div className='text-lg font-bold text-green-400'>{summary.activeVotes}</div>
            <div className='text-xs text-[#94a3b8]'>Active Votes</div>
          </div>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-center'>
            <div className='text-lg font-bold text-yellow-400'>{summary.pending}</div>
            <div className='text-xs text-[#94a3b8]'>Pending</div>
          </div>
          <div className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3 text-center'>
            <div className='text-lg font-bold text-blue-400'>{summary.recentlyPassed}</div>
            <div className='text-xs text-[#94a3b8]'>Passed</div>
          </div>
        </div>
      )}

      <div className='flex gap-1'>
        {['all', 'active', 'pending', 'passed'].map((f) => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg `}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className='space-y-3'>
        {proposals.map((p: any) => (
          <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`rounded-2xl border p-4 `}
          >
            <div className='flex items-start justify-between'>
              <div className='flex items-center gap-2'>
                <span className='text-lg'>{categoryIcon(p.category)}</span>
                <span className='text-xs font-bold uppercase tracking-wider'>{p.status}</span>
              </div>
              <div className='text-xs text-[#64748b]'>Ends {new Date(p.endsAt).toLocaleDateString()}</div>
            </div>

            <h3 className='font-bold text-white text-sm mt-2'>{p.title}</h3>
            <p className='text-xs text-[#94a3b8] mt-1 line-clamp-2'>{p.description}</p>

            <div className='mt-3'>
              <div className='flex h-2 rounded-full overflow-hidden bg-[#1e293b]'>
                <div style={{ width: p.voting.for + '%' }} className='bg-green-500' />
                <div style={{ width: p.voting.against + '%' }} className='bg-red-500' />
                <div style={{ width: p.voting.abstain + '%' }} className='bg-gray-500' />
              </div>
              <div className='flex justify-between text-xs mt-1'>
                <span className='text-green-400'>For {p.voting.for}%</span>
                <span className='text-red-400'>Against {p.voting.against}%</span>
                <span className='text-[#64748b]'>Quorum {p.voting.quorum}%</span>
              </div>
            </div>

            <div className='mt-3 bg-white/5 rounded-lg p-2'>
              <div className='text-xs font-bold text-white'>LP Impact</div>
              <div className={`text-xs mt-0.5 `}>
                {p.lpImpact.impactLevel.toUpperCase()} {p.lpImpact.impactDirection} - {p.lpImpact.reasoning}
              </div>
              {Array.isArray(p.lpImpact.affectedPools) && (
                <div className='flex gap-1 mt-1 flex-wrap'>
                  {p.lpImpact.affectedPools.map((pool: string) => (
                    <span key={pool} className='text-[10px] px-1.5 py-0.5 bg-[#1e293b] rounded text-[#94a3b8]'>{pool}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
