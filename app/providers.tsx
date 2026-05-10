'use client';

import { ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize wallet adapters - only on client side
  const endpoint = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return clusterApiUrl('mainnet-beta');
  }, []);

  const wallets = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, []);

  // During SSR, render children without providers to avoid hook errors
  if (!mounted || !endpoint) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
