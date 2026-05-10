'use client';

import { useState, useEffect } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Dashboard } from '../components/Dashboard';
import { Pool, Position, PortfolioOverview } from '../lib/types';

export function ClientPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);

  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { publicKey, connected } = useWallet();

  // Sync wallet state
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      console.log('Wallet connected:', address);
      setWalletAddress(address);
    } else {
      if (walletAddress) {
        console.log('Wallet disconnected');
        setWalletAddress(null);
      }
    }
  }, [connected, publicKey, walletAddress]);

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
