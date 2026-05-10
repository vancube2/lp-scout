'use client';

import React, { useState, useEffect } from 'react';
import { WalletProvider } from '../components/WalletProvider';
import { Dashboard } from '../components/Dashboard';
import { Pool, Position, PortfolioOverview } from '../lib/types';

// Static version of dashboard without wallet
function StaticDashboard() {
  const [pools, setPools] = useState<Pool[]>([]);

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const res = await fetch('/api/pools/discover?limit=10');
        if (res.ok) {
          const data = await res.json();
          setPools(data.slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching pools:', err);
      }
    };
    fetchPools();
  }, []);

  return (
    <Dashboard
      walletAddress={null}
      positions={[]}
      pools={pools}
      overview={null}
      onConnectWallet={() => {}}
      onWalletConnected={() => {}}
      onZapIn={() => {}}
      onZapOut={() => {}}
    />
  );
}

export function ClientPage() {
  const [WalletContent, setWalletContent] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Dynamically import the wallet content component
    import('../components/WalletContent')
      .then((mod) => {
        setWalletContent(() => mod.WalletContent);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load WalletContent:', err);
        setHasError(true);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <StaticDashboard />;
  }

  if (hasError || !WalletContent) {
    return <StaticDashboard />;
  }

  return (
    <WalletProvider>
      <WalletContent />
    </WalletProvider>
  );
}
