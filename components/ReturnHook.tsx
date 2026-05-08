'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Clock, ArrowRightLeft } from 'lucide-react';

interface SessionSummary {
  earnedSinceLastVisit: number;
  rebalancesSinceLastVisit: number;
  allInRange: boolean;
}

interface ReturnHookProps {
  isVisible: boolean;
  onClose: () => void;
  summary: SessionSummary;
  positionsCount: number;
}

export function ReturnHook({ isVisible, onClose, summary, positionsCount }: ReturnHookProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-x-4 bottom-24 z-40"
      >
        <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] border border-green-500/30 rounded-2xl p-4 shadow-2xl shadow-green-500/10"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white mb-1">
                Welcome back!
              </h3>

              {summary.earnedSinceLastVisit > 0 ? (
                <p className="text-sm text-[#94a3b8]">
                  Your positions earned{' '}
                  <span className="text-green-400 font-semibold">
                    ${summary.earnedSinceLastVisit.toFixed(2)}
                  </span>
                  {' '}since your last visit.
                </p>
              ) : summary.allInRange ? (
                <p className="text-sm text-[#94a3b8]">
                  All {positionsCount} positions healthy and in range.
                </p>
              ) : (
                <p className="text-sm text-[#94a3b8]">
                  Some positions need attention.
                </p>
              )}

              {/* Quick stats */}
              <div className="flex gap-4 mt-3">
                {summary.rebalancesSinceLastVisit > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                    <span className="text-[#94a3b8]">
                      {summary.rebalancesSinceLastVisit} auto-rebalances
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3 h-3 text-green-400" />
                  <span className="text-[#94a3b8]">
                    {positionsCount} positions active
                  </span>
                </div>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => {
                setDismissed(true);
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
