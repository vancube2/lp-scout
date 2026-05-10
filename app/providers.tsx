'use client';

import { ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

// Wallet error handler - logs but doesn't crash
function onWalletError(error: Error) {
  console.error('[WalletProvider] Error:', error.name, error.message);
}

export function SolanaProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('[SolanaProviders] Mounting...');
    setMounted(true);
  }, []);

  // Use env var for RPC or fallback to public endpoint
  const endpoint = useMemo(() => {
    const envRpc = process.env.NEXT_PUBLIC_RPC_URL;
    if (envRpc) {
      console.log('[SolanaProviders] Using RPC from env:', envRpc);
      return envRpc;
    }
    console.log('[SolanaProviders] Using default mainnet-beta RPC');
    return clusterApiUrl('mainnet-beta');
  }, []);

  const wallets = useMemo(() => {
    if (typeof window === 'undefined') return [];
    console.log('[SolanaProviders] Initializing wallets: Phantom, Solflare');
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, []);

  // During SSR, render children without providers
  if (!mounted) {
    console.log('[SolanaProviders] SSR mode - rendering without providers');
    return <>{children}</>;
  }

  console.log('[SolanaProviders] Client mode - rendering with providers');

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      }}
    >
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onWalletError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
