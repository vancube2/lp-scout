'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Check, ArrowRightLeft, Loader2 } from 'lucide-react';

interface ActionSheetProps {
  action: {
    type: string;
    pool?: any;
    position?: any;
  };
  onClose: () => void;
  onConfirm: () => void;
}

export function ActionSheet({ action, onClose, onConfirm }: ActionSheetProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setStep('processing');
    try {
      // Simulate action execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('success');
      setTimeout(() => {
        onConfirm();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Action failed');
      setStep('confirm');
    }
  };

  const getActionDetails = () => {
    switch (action.type) {
      case 'ZAP_IN':
        return {
          title: 'Confirm Zap In',
          description: `Enter ${action.pool?.token0_symbol}/${action.pool?.token1_symbol} pool`,
          icon: ArrowRightLeft,
          color: 'green',
          fee: '0.05% entry fee',
        };
      case 'ZAP_OUT':
        return {
          title: 'Confirm Exit',
          description: `Exit ${action.position?.token0_symbol}/${action.position?.token1_symbol} position`,
          icon: ArrowRightLeft,
          color: 'red',
          fee: 'No fee on exit',
        };
      case 'REBALANCE':
        return {
          title: 'Rebalance Position',
          description: `Move ${action.position?.token0_symbol}/${action.position?.token1_symbol} to active price range`,
          icon: ArrowRightLeft,
          color: 'blue',
          fee: '0.02% rebalance fee',
        };
      case 'HARVEST':
        return {
          title: 'Harvest Fees',
          description: `Collect uncollected fees from ${action.position?.token0_symbol}/${action.position?.token1_symbol}`,
          icon: Check,
          color: 'green',
          fee: '5% of harvested fees',
        };
      default:
        return {
          title: 'Confirm Action',
          description: 'Execute this action?',
          icon: AlertCircle,
          color: 'yellow',
          fee: '',
        };
    }
  };

  const details = getActionDetails();
  const Icon = details.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === 'confirm' ? onClose : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-[#0f172a] border-t border-[#1e293b] sm:border sm:rounded-2xl sm:m-4 overflow-hidden"
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-[#1e293b] rounded-full" />
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center">
                  <div className={`
                    w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center
                    ${details.color === 'green' ? 'bg-green-500/20' : ''}
                    ${details.color === 'red' ? 'bg-red-500/20' : ''}
                    ${details.color === 'blue' ? 'bg-blue-500/20' : ''}
                    ${details.color === 'yellow' ? 'bg-yellow-500/20' : ''}
                  `}>
                    <Icon className={`w-8 h-8 ${
                      details.color === 'green' ? 'text-green-400' :
                      details.color === 'red' ? 'text-red-400' :
                      details.color === 'blue' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{details.title}</h2>
                  <p className="text-[#94a3b8]">{details.description}</p>
                </div>

                {/* Fee info */}
                {details.fee && (
                  <div className="bg-[#1e293b] rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm text-[#94a3b8]">Fee</span>
                    <span className="text-sm font-medium text-white">{details.fee}</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    className={`
                      w-full py-4 font-semibold rounded-xl text-white
                      ${details.color === 'green' ? 'bg-green-500 hover:bg-green-600' : ''}
                      ${details.color === 'red' ? 'bg-red-500 hover:bg-red-600' : ''}
                      ${details.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                      ${details.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    `}
                  >
                    Confirm
                  </motion.button>
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-[#1e293b] hover:bg-[#334155] text-white font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Processing...</h2>
                <p className="text-[#94a3b8]">Submitting via Jito bundle</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">Success!</h2>
                <p className="text-[#94a3b8]">Transaction confirmed</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
