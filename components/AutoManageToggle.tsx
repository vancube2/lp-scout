'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronRight, TrendingUp, Shield, Zap } from 'lucide-react';

interface AutoManageToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  earningsSinceOn: number;
}

export function AutoManageToggle({ enabled, onToggle, earningsSinceOn }: AutoManageToggleProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden"
    >
      {/* Main toggle row */}
      <button
        onClick={() => onToggle(!enabled)}
        className="w-full p-4 flex items-center gap-4"
      >
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center transition-colors
          ${enabled ? 'bg-green-500/20' : 'bg-[#1e293b]'}
        `}>
          <motion.div
            animate={enabled ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ repeat: enabled ? Infinity : 0, duration: 2 }}
          >
            <Bot className={`w-6 h-6 ${enabled ? 'text-green-400' : 'text-[#94a3b8]'}`} />
          </motion.div>
        </div>

        <div className="flex-1 text-left">
          <h3 className="font-bold text-white flex items-center gap-2">
            Auto-Manage
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-[#1e293b] text-[#94a3b8]'}
            `}>
              {enabled ? 'ON' : 'OFF'}
            </span>
          </h3>
          <p className="text-sm text-[#94a3b8]">
            {enabled
              ? `Earned $${earningsSinceOn.toFixed(2)} since on`
              : 'Let AI handle rebalancing 24/7'
            }
          </p>
        </div>

        <div className={`
          w-12 h-6 rounded-full p-1 transition-colors
          ${enabled ? 'bg-green-500' : 'bg-[#334155]'}
        `}>
          <motion.div
            animate={{ x: enabled ? 24 : 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-4 h-4 bg-white rounded-full"
          />
        </div>
      </button>

      {/* Expand details */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1e293b]"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[#94a3b8]">MEV-protected rebalances</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-[#94a3b8]">Auto fee harvesting</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-[#94a3b8]">Only 0.02% per rebalance</span>
              </div>

              <div className="pt-2 border-t border-[#1e293b]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#94a3b8]">Rebalances today</span>
                  <span className="text-white font-medium">0/10</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
