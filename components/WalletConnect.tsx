'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { truncateAddress } from '../lib/utils';

interface WalletConnectProps {
  onConnect: (address: string | null) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      onConnect(publicKey.toBase58());
    } else {
      onConnect(null);
    }
  }, [connected, publicKey, onConnect]);

  return (
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
    >
      {connected && publicKey ? truncateAddress(publicKey.toBase58()) : 'Connect Wallet'}
    </WalletMultiButton>
  );
}
