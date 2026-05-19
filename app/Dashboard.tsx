'use client';

import { useState, useEffect } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dashboard as DashboardUI } from '../components/Dashboard';
import { OrcaPool, OrcaPosition, PortfolioOverview } from '../lib/types';

export function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pools, setPools] = useState<OrcaPool[]>([]);
  const [positions, setPositions] = useState<OrcaPosition[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);

  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { publicKey, connected } = useWallet();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toBase58());
    } else {
      if (walletAddress) setWalletAddress(null);
    }
  }, [connected, publicKey, walletAddress]);

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

  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      setOverview(null);
      return;
    }
    const fetchData = async () => {
      try {
        const [posRes, ovRes] = await Promise.all([
          fetch('/api/positions/opening?owner=' + walletAddress),
          fetch('/api/positions/overview?owner=' + walletAddress),
        ]);
        if (posRes.ok) setPositions(await posRes.json());
        if (ovRes.ok) setOverview(await ovRes.json());
      } catch (err) {
        console.error('Error fetching wallet data:', err);
      }
    };
    fetchData();
  }, [walletAddress]);

  const handleConnectWallet = () => setWalletModalVisible(true);

  if (!mounted) {
    return (
      <div className='min-h-screen bg-[#030712] flex items-center justify-center'>
        <div className='text-[#94a3b8] animate-pulse'>Loading Orca LP Agent...</div>
      </div>
    );
  }

  return (
    <DashboardUI
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