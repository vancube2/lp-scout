'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Shield, Zap, ChevronRight, Wallet } from 'lucide-react';
import { Pool } from '../lib/types';

interface OnboardingScreenProps {
  onComplete: () => void;
  onConnectWallet: () => void;
}

interface TickerData {
  pair: string;
  dpr: number;
  tvl: number;
  agentScore: number;
}

export function OnboardingScreen({ onComplete, onConnectWallet }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live tickers
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/pools/live-tickers');
        if (res.ok) {
          const data = await res.json();
          setTickers(data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch tickers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 30000);
    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      icon: TrendingUp,
      title: 'Maximize Your Yield',
      subtitle: 'AI-powered pool discovery',
      description: 'Find the highest-performing liquidity pools on Meteora with real-time agent scoring.',
    },
    {
      icon: Shield,
      title: 'MEV-Protected',
      subtitle: 'Jito bundle technology',
      description: 'Every transaction is shielded from sandwich attacks. Atomic rebalances land together or not at all.',
    },
    {
      icon: Zap,
      title: 'One-Tap Actions',
      subtitle: 'Zero complexity',
      description: 'Zap in, rebalance, harvest fees — all with a single tap. The AI handles the rest.',
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(c => c + 1);
    } else {
      onComplete();
    }
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Live ticker tape at top */}
      <div className="bg-[#0f172a] border-b border-[#1e293b] py-3 overflow-hidden">
        <div className="ticker-tape">
          <div className="ticker-tape-content">
            {[...tickers, ...tickers].map((ticker, i) => (
              <div key={i} className="flex items-center gap-4 px-6">
                <span className="text-white font-medium">{ticker.pair}</span>
                <span className="text-green-400">
                  ↑{ticker.dpr.toFixed(2)}% daily
                </span>
                <span className="text-[#94a3b8]">
                  ${(ticker.tvl / 1000000).toFixed(1)}M TVL
                </span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                  {ticker.agentScore.toFixed(1)} score
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 px-6 text-[#94a3b8]">
                <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                Loading live markets...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center"
            >
              <CurrentIcon className="w-10 h-10 text-green-400" />
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-green-400 text-sm font-medium mb-2 tracking-wide uppercase"
            >
              {slides[currentSlide].subtitle}
            </motion.p>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-3xl font-bold text-white mb-4"
            >
              {slides[currentSlide].title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[#94a3b8] text-lg leading-relaxed"
            >
              {slides[currentSlide].description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-8 pt-4 safe-bottom">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-8 bg-green-500'
                  : 'w-1.5 bg-[#1e293b] hover:bg-[#334155]'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={nextSlide}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </motion.button>

          {currentSlide === 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConnectWallet}
              className="w-full py-4 bg-[#1e293b] hover:bg-[#334155] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </motion.button>
          )}
        </div>

        {/* Skip option */}
        <button
          onClick={onComplete}
          className="w-full mt-4 text-[#94a3b8] text-sm hover:text-white transition-colors"
        >
          Skip onboarding
        </button>
      </div>
    </div>
  );
}
