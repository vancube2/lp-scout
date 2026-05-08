'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { truncateAddress } from '../lib/utils';

interface WalletConnectProps {
  onConnect: (address: string | null) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected, connecting, disconnect } = useWallet();
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

  if (!mounted) {
    return (
      <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium opacity-50">
        Loading...
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {connected && publicKey ? (
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
      ) : (
        <WalletMultiButton
          style={{
            backgroundColor: '#22c55e',
            color: 'white',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            height: '40px',
          }}
        />
      )}
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

// Need to import this
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
