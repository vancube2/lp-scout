'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { Pool } from '../lib/types';

// Static dashboard without wallet
function StaticDashboard({ pools }: { pools: Pool[] }) {
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
  const [pools, setPools] = useState<Pool[]>([]);
  const [WalletContent, setWalletContent] = useState<any>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  // Fetch pools first
  useEffect(() => {
    console.log('[ClientPage] Fetching pools...');
    fetch('/api/pools/discover?limit=10')
      .then(res => res.json())
      .then(data => {
        console.log('[ClientPage] Pools loaded:', data.length);
        setPools(data.slice(0, 5));
      })
      .catch(err => console.error('[ClientPage] Failed to fetch pools:', err));
  }, []);

  // Load wallet content
  useEffect(() => {
    console.log('[ClientPage] Loading wallet content...');

    // Delay wallet loading to ensure DOM is ready
    const timer = setTimeout(() => {
      import('../components/WalletContent')
        .then(mod => {
          console.log('[ClientPage] WalletContent loaded');
          setWalletContent(() => mod.WalletContent);
        })
        .catch(err => {
          console.error('[ClientPage] Failed to load WalletContent:', err);
        })
        .finally(() => {
          setIsLoadingWallets(false);
        });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show static dashboard while loading
  if (!WalletContent || isLoadingWallets) {
    console.log('[ClientPage] Showing static dashboard');
    return <StaticDashboard pools={pools} />;
  }

  console.log('[ClientPage] Showing wallet dashboard');

  // Dynamically import WalletProvider
  const WalletProvider = require('../components/WalletProvider').WalletProvider;

  return (
    <WalletProvider>
      <WalletContent />
    </WalletProvider>
  );
}
