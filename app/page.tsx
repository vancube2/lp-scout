'use client';

import { useState, useEffect } from 'react';
import { WalletProvider } from '../components/WalletProvider';
import { Dashboard } from '../components/Dashboard';
import { Pool, Position, PortfolioOverview } from '../lib/types';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function AppContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { setVisible: setWalletModalVisible } = useWalletModal();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch pools on mount
  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools/discover?limit=10');
        if (res.ok) {
          const data = await res.json();
          console.log('Pools fetched:', data.length);
          setPools(data.slice(0, 5));
        } else {
          console.error('Failed to fetch pools:', res.status);
        }
      } catch (err) {
        console.error('Error fetching pools:', err);
      }
    };

    fetchPools();
  }, []);

  // Fetch positions when wallet connects
  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      setOverview(null);
      return;
    }

    const fetchData = async () => {
      try {
        const [posRes, ovRes] = await Promise.all([
          fetch(`/api/positions/opening?owner=${walletAddress}`),
          fetch(`/api/positions/overview?owner=${walletAddress}`),
        ]);

        if (posRes.ok) {
          const posData = await posRes.json();
          setPositions(posData);
        }

        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setOverview(ovData.data || ovData);
        }
      } catch (err) {
        console.error('Error fetching wallet data:', err);
      }
    };

    fetchData();
  }, [walletAddress]);

  const handleConnectWallet = () => {
    console.log('Opening wallet modal...');
    setWalletModalVisible(true);
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-[#94a3b8] animate-pulse">Loading LP Scout...</div>
      </div>
    );
  }

  return (
    <Dashboard
      walletAddress={walletAddress}
      positions={positions}
      pools={pools}
      overview={overview}
      onConnectWallet={handleConnectWallet}
      onWalletConnected={setWalletAddress}
      onZapIn={(pool) => console.log('Zap in:', pool)}
      onZapOut={(position) => console.log('Zap out:', position)}
    />
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
