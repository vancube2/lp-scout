'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, Zap, Scissors, TrendingUp, Clock } from 'lucide-react';

interface Activity {
  id: string;
  type: 'rebalance' | 'zap_in' | 'zap_out' | 'fee_harvest';
  description: string;
  timestamp: string;
  value?: number;
}

interface ActivityFeedProps {
  activities: Activity[];
  onClose: () => void;
}

export function ActivityFeed({ activities, onClose }: ActivityFeedProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'rebalance':
        return ArrowRightLeft;
      case 'zap_in':
        return Zap;
      case 'zap_out':
        return TrendingUp;
      case 'fee_harvest':
        return Scissors;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'rebalance':
        return 'bg-blue-500/20 text-blue-400';
      case 'zap_in':
        return 'bg-green-500/20 text-green-400';
      case 'zap_out':
        return 'bg-red-500/20 text-red-400';
      case 'fee_harvest':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-[#1e293b] text-[#94a3b8]';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#030712]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">Activity</h2>
            <p className="text-xs text-[#94a3b8]">{activities.length} events</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-white"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence>
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0f172a] border border-[#1e293b] flex items-center justify-center">
                <Clock className="w-8 h-8 text-[#64748b]" />
              </div>
              <p className="text-[#94a3b8] mb-1">No activity yet</p>
              <p className="text-sm text-[#64748b]">Your actions will appear here</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, i) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium mb-0.5">{activity.description}</p>
                      <p className="text-sm text-[#64748b]">{formatTime(activity.timestamp)}</p>
                    </div>
                    {activity.value && activity.value > 0 && (
                      <div className="text-right">
                        <p className="text-green-400 font-medium">+${activity.value.toFixed(2)}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
