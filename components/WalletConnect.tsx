'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletModal, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { truncateAddress } from '../lib/utils';

interface WalletConnectProps {
  onConnect: (address: string | null) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected, disconnect, select, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      console.log('Wallet connected:', publicKey.toBase58());
      onConnect(publicKey.toBase58());
    } else if (!connected) {
      onConnect(null);
    }
  }, [connected, publicKey, onConnect]);

  const handleConnect = useCallback(() => {
    console.log('Connect clicked, opening wallet modal');
    console.log('Available wallets:', wallets.map(w => w.adapter.name));
    setVisible(true);
  }, [setVisible, wallets]);

  if (!mounted) {
    return (
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium opacity-50 cursor-not-allowed">
        Loading...
      </button>
    );
  }

  return (
    <div className="wallet-button-container">
      <style jsx global>{`
        .wallet-button-container .wallet-adapter-button {
          background-color: #22c55e !important;
          border-radius: 0.5rem !important;
          padding: 0.5rem 1rem !important;
          font-weight: 500 !important;
          height: 40px !important;
          transition: background-color 0.2s !important;
          font-family: inherit !important;
        }
        .wallet-button-container .wallet-adapter-button:hover {
          background-color: #16a34a !important;
        }
      `}</style>
      <WalletMultiButton />
    </div>
  );
}

// Hook to access wallet modal from other components
export function useWalletConnectModal() {
  const { setVisible } = useWalletModal();
  const { publicKey, connected } = useWallet();

  return {
    openWalletModal: () => setVisible(true),
    isConnected: connected,
    walletAddress: publicKey?.toBase58() || null,
  };
}
