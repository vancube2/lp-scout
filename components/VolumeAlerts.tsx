'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, TrendingUp, Activity, AlertTriangle, Zap, Volume2, X } from 'lucide-react';

export function VolumeAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'trends'>('alerts');

  useEffect(() => {
    fetchAlerts();
    fetchTrends();
    const interval = setInterval(() => { fetchAlerts(); fetchTrends(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/volume/alerts');
      const data = await res.json();
      if (data.success) setAlerts(data.alerts);
    } catch (e) { console.error(e); }
  };

  const fetchTrends = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/volume/trends?limit=10');
      const data = await res.json();
      if (data.success) setTrends(data.trends);
    } catch (e) { console.error(e); }
  };

  const dismissAlert = async (id: string) => {
    try {
      await fetch('http://localhost:4000/api/volume/alerts/' + id, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const severityColor = (s: string) => {
    if (s === 'CRITICAL') return 'text-red-400 border-red-500/50 bg-red-500/10';
    if (s === 'HIGH') return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
    return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
  };

  return (
    <div className='px-4 py-6 space-y-4'>
      <div className='flex items-center gap-3 mb-2'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center'>
          <Volume2 className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-white'>Volume Spike Detector</h2>
          <p className='text-xs text-[#94a3b8]'>Real-time volume anomaly detection</p>
        </div>
      </div>

      <div className='flex gap-2'>
        <button onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg `}
        >
          <Bell className='w-3 h-3 inline mr-1' /> Alerts ({alerts.length})
        </button>
        <button onClick={() => setActiveTab('trends')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg `}
        >
          <Activity className='w-3 h-3 inline mr-1' /> Trends
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className='space-y-3'>
          {alerts.length === 0 ? (
            <div className='text-center py-8 text-[#94a3b8]'>
              <Bell className='w-8 h-8 mx-auto mb-2 opacity-30' />
              <p>No volume alerts right now</p>
              <p className='text-xs text-[#64748b]'>Alerts appear when volume spikes 2.5x above baseline</p>
            </div>
          ) : (
            alerts.map((alert: any) => (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl border p-4 `}
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'><Zap className='w-4 h-4' /><span className='font-bold text-sm'>{alert.severity}</span></div>
                  <button onClick={() => dismissAlert(alert.id)} className='p-1 hover:bg-white/10 rounded'><X className='w-4 h-4' /></button>
                </div>
                <div className='mt-2'>
                  <div className='text-sm text-white font-bold'>{alert.poolName}</div>
                  <div className='text-xs mt-1'>Volume spike: {alert.spikeRatio}x baseline</div>
                  <div className='text-xs mt-1'>{alert.reasoning}</div>
                  <div className='flex items-center gap-4 mt-2 text-xs'>
                    <span className='text-[#94a3b8]'>Fee boost: +{alert.estimatedFeeBoost}</span>
                    <span className={`font-bold `}>Signal: {alert.signal}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className='space-y-2'>
          {trends.map((trend: any, i: number) => (
            <div key={i} className='bg-[#0f172a] border border-[#1e293b] rounded-xl p-3'>
              <div className='flex items-center justify-between'>
                <div className='font-bold text-sm text-white'>{trend.pair}</div>
                <div className={`text-xs font-bold `}>{parseFloat(trend.trend) > 0 ? '+' : ''}{trend.trend}</div>
              </div>
              <div className='grid grid-cols-3 gap-2 mt-2 text-xs'>
                <div><div className='text-[#94a3b8]'>24h Vol</div><div className='text-white'></div></div>
                <div><div className='text-[#94a3b8]'>Avg</div><div className='text-white'></div></div>
                <div><div className='text-[#94a3b8]'>vs Avg</div><div className='text-white'>{trend.vsAverage}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
