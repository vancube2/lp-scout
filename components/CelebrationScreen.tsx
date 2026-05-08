'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, TrendingUp, ArrowRight } from 'lucide-react';

interface CelebrationScreenProps {
  type: 'zap_in' | 'zap_out' | 'rebalance' | 'harvest';
  data: {
    pair?: string;
    value?: number;
    fees?: number;
    txHash?: string;
  };
  onClose: () => void;
}

export function CelebrationScreen({ type, data, onClose }: CelebrationScreenProps) {
  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#eab308'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#eab308'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Auto-close after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getContent = () => {
    switch (type) {
      case 'zap_in':
        return {
          title: 'Position Opened!',
          subtitle: `You're now earning in ${data.pair}`,
          highlight: `$${data.value?.toFixed(2)}`,
          highlightLabel: 'Deposited',
          color: 'green',
        };
      case 'zap_out':
        return {
          title: 'Position Closed!',
          subtitle: 'Funds returned to wallet',
          highlight: `$${data.value?.toFixed(2)}`,
          highlightLabel: 'Returned',
          color: 'blue',
        };
      case 'rebalance':
        return {
          title: 'Rebalanced!',
          subtitle: `${data.pair} is now in range`,
          highlight: '0.3s',
          highlightLabel: 'Landing time',
          color: 'purple',
        };
      case 'harvest':
        return {
          title: 'Fees Harvested!',
          subtitle: 'Claimed from your position',
          highlight: `$${data.fees?.toFixed(2)}`,
          highlightLabel: 'Collected',
          color: 'yellow',
        };
      default:
        return {
          title: 'Success!',
          subtitle: 'Transaction completed',
          highlight: '',
          highlightLabel: '',
          color: 'green',
        };
    }
  };

  const content = getContent();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]"
    >
      <div className="text-center px-6 max-w-md">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, delay: 0.1 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white mb-2"
        >
          {content.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[#94a3b8] mb-8"
        >
          {content.subtitle}
        </motion.p>

        {/* Highlight stat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 mb-8"
        >
          <p className="text-sm text-[#94a3b8] mb-1">{content.highlightLabel}</p>
          <p className="text-4xl font-bold text-green-400">{content.highlight}</p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          {data.txHash && (
            <a
              href={`https://solscan.io/tx/${data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[#94a3b8] hover:text-white"
            >
              View on Solscan →
            </a>
          )}
        </motion.div>

        {/* Auto-close hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-xs text-[#64748b]"
        >
          Closing in 5 seconds...
        </motion.p>
      </div>
    </motion.div>
  );
}
