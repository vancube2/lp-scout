'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
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

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#94a3b8] hidden sm:inline">
          {truncateAddress(publicKey.toBase58())}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
    >
      Connect Wallet
    </button>
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
