'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletProvider } from '../components/WalletProvider';
import { OnboardingScreen } from '../components/OnboardingScreen';
import { Dashboard } from '../components/Dashboard';
import { CelebrationScreen } from '../components/CelebrationScreen';
import { ReturnHook } from '../components/ReturnHook';
import { ZapModal } from '../components/ZapModal';
import { Pool, Position, PortfolioOverview, ActionData } from '../lib/types';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Celebration state type
type CelebrationType = 'zap_in' | 'zap_out' | 'rebalance' | 'harvest' | null;

interface CelebrationState {
  type: CelebrationType;
  data: {
    pair?: string;
    value?: number;
    fees?: number;
    txHash?: string;
  };
}

interface SessionSummary {
  earnedSinceLastVisit: number;
  rebalancesSinceLastVisit: number;
  allInRange: boolean;
}

function AppContent() {
  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Data state
  const [positions, setPositions] = useState<Position[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);

  // UI state
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [zapMode, setZapMode] = useState<'in' | 'out'>('in');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionData | null>(null);

  // Celebration state
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);

  // Return hook state
  const [showReturnHook, setShowReturnHook] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Check onboarding completion
  useEffect(() => {
    const completed = localStorage.getItem('lp-scout-onboarding');
    if (completed) {
      setHasCompletedOnboarding(true);
    }
  }, []);

  // Fetch pools on mount
  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch positions when wallet connects
  useEffect(() => {
    if (walletAddress) {
      fetchPositions();
      fetchOverview();
      checkSessionSummary();
    }
  }, [walletAddress]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchPools = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pools/discover?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setPools(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch pools:', err);
    }
  };

  const fetchPositions = async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`${API_URL}/api/positions/opening?owner=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchOverview = async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`${API_URL}/api/positions/overview?owner=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data.data || data);
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
  };

  const checkSessionSummary = async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(`${API_URL}/api/user/summary/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessionSummary && data.sessionSummary.earnedSinceLastVisit > 0) {
          setSessionSummary({
            earnedSinceLastVisit: parseFloat(data.sessionSummary.earnedSinceLastVisit),
            rebalancesSinceLastVisit: data.sessionSummary.rebalancesSinceLastVisit || 0,
            allInRange: data.sessionSummary.allInRange,
          });
          setShowReturnHook(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch session summary:', err);
    }
  };

  const handleCompleteOnboarding = () => {
    localStorage.setItem('lp-scout-onboarding', 'true');
    setHasCompletedOnboarding(true);
  };

  const handleZapIn = (pool: Pool) => {
    setSelectedPool(pool);
    setZapMode('in');
    setIsZapModalOpen(true);
  };

  const handleZapOut = (position: Position) => {
    setSelectedPosition(position);
    setZapMode('out');
    setIsZapModalOpen(true);
  };

  const handleAction = (action: ActionData) => {
    setPendingAction(action);
    if (action.type === 'ZAP_IN') {
      const pool = pools.find((p) => p.address === action.poolId);
      if (pool) {
        setSelectedPool(pool);
        setZapMode('in');
        setIsZapModalOpen(true);
      }
    } else if (action.type === 'ZAP_OUT') {
      const position = positions.find((p) => p.id === action.positionId);
      if (position) {
        setSelectedPosition(position);
        setZapMode('out');
        setIsZapModalOpen(true);
      }
    }
  };

  const closeZapModal = (success?: boolean, result?: any) => {
    setIsZapModalOpen(false);
    setSelectedPool(null);
    setSelectedPosition(null);
    setPendingAction(null);

    if (success && result) {
      // Show celebration
      const pair = zapMode === 'in'
        ? `${selectedPool?.token0_symbol}/${selectedPool?.token1_symbol}`
        : `${selectedPosition?.token0_symbol}/${selectedPosition?.token1_symbol}`;

      setCelebration({
        type: zapMode === 'in' ? 'zap_in' : 'zap_out',
        data: {
          pair,
          value: result.quote?.estimated_value_usd || selectedPosition?.current_value_usd,
          txHash: result.tx_hash,
        },
      });

      // Refresh data
      setTimeout(() => {
        fetchPositions();
        fetchOverview();
        fetchPools();
      }, 1000);
    }
  };

  const handleConnectWallet = () => {
    setWalletModalVisible(true);
  };

  // Show onboarding first
  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleCompleteOnboarding}
        onConnectWallet={handleConnectWallet}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Main Dashboard */}
      <Dashboard
        walletAddress={walletAddress}
        positions={positions}
        pools={pools}
        overview={overview}
        onConnectWallet={handleConnectWallet}
        onZapIn={handleZapIn}
        onZapOut={handleZapOut}
        onAction={handleAction}
      />

      {/* Return Hook */}
      {showReturnHook && sessionSummary && (
        <ReturnHook
          isVisible={showReturnHook}
          onClose={() => setShowReturnHook(false)}
          summary={sessionSummary}
          positionsCount={positions.length}
        />
      )}

      {/* Celebration Screen */}
      <AnimatePresence>
        {celebration && (
          <CelebrationScreen
            type={celebration.type!}
            data={celebration.data}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>

      {/* Zap Modal */}
      {isZapModalOpen && (
        <ZapModal
          mode={zapMode}
          pool={selectedPool}
          position={selectedPosition}
          pendingAction={pendingAction}
          walletAddress={walletAddress}
          onClose={(success, result) => closeZapModal(success, result)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
