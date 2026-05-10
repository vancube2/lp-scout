'use client';

import { useState, useEffect } from 'react';
import { WalletProvider } from '../components/WalletProvider';
import { Dashboard } from '../components/Dashboard';
import { Pool, Position, PortfolioOverview } from '../lib/types';

// Inner component that uses wallet hooks - must be inside WalletProvider
function WalletConnectedContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Dynamic import wallet hooks to avoid SSR issues
  const [walletModal, setWalletModal] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    // Import wallet hooks dynamically after mount
    Promise.all([
      import('@solana/wallet-adapter-react-ui').then(mod => ({ setVisible: mod.useWalletModal().setVisible })),
      import('@solana/wallet-adapter-react').then(mod => ({ publicKey: mod.useWallet().publicKey, connected: mod.useWallet().connected })),
    ]).then(([modal, w]) => {
      setWalletModal(modal);
      setWallet(w);
    }).catch(err => {
      console.error('Failed to load wallet hooks:', err);
      setWalletError('Wallet initialization failed');
    });
  }, []);

  // Sync wallet state
  useEffect(() => {
    if (wallet?.connected && wallet?.publicKey) {
      const address = wallet.publicKey.toBase58();
      console.log('Wallet connected:', address);
      setWalletAddress(address);
    } else if (!wallet?.connected && walletAddress) {
      console.log('Wallet disconnected');
      setWalletAddress(null);
    }
  }, [wallet?.connected, wallet?.publicKey, walletAddress]);

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
    if (walletModal) {
      walletModal.setVisible(true);
    } else {
      console.error('Wallet modal not initialized');
    }
  };

  if (walletError) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p>Error: {walletError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            Reload
          </button>
        </div>
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

export function ClientPage() {
  return (
    <WalletProvider>
      <WalletConnectedContent />
    </WalletProvider>
  );
}
