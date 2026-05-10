'use client';

import { ReactNode, useMemo, useState, useEffect } from 'react';
import { clusterApiUrl } from '@solana/web3.js';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [WalletComponents, setWalletComponents] = useState<{
    ConnectionProvider: any;
    SolanaWalletProvider: any;
    WalletModalProvider: any;
    wallets: any[];
    endpoint: string;
  } | null>(null);

  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  useEffect(() => {
    console.log('[WalletProvider] Mount effect running');
    setMounted(true);

    // Dynamically import wallet adapters only on client-side
    const loadWalletAdapters = async () => {
      try {
        console.log('[WalletProvider] Starting dynamic imports...');

        const module1 = await import('@solana/wallet-adapter-react');
        console.log('[WalletProvider] Loaded @solana/wallet-adapter-react');

        const module2 = await import('@solana/wallet-adapter-react-ui');
        console.log('[WalletProvider] Loaded @solana/wallet-adapter-react-ui');

        const phantomModule = await import('@solana/wallet-adapter-phantom');
        console.log('[WalletProvider] Loaded @solana/wallet-adapter-phantom');

        const solflareModule = await import('@solana/wallet-adapter-solflare');
        console.log('[WalletProvider] Loaded @solana/wallet-adapter-solflare');

        const { ConnectionProvider, WalletProvider: SolanaWalletProvider } = module1;
        const { WalletModalProvider } = module2;
        const { PhantomWalletAdapter } = phantomModule;
        const { SolflareWalletAdapter } = solflareModule;

        console.log('[WalletProvider] Creating wallet adapters...');
        const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
        console.log('[WalletProvider] Wallets created:', wallets.length);

        setWalletComponents({
          ConnectionProvider,
          SolanaWalletProvider,
          WalletModalProvider,
          wallets,
          endpoint,
        });
        console.log('[WalletProvider] Wallet components set');
      } catch (err: any) {
        console.error('[WalletProvider] Failed to load wallet adapters:', err);
        setLoadError(err.message || 'Unknown error loading wallets');
      }
    };

    loadWalletAdapters();
  }, [endpoint]);

  // Show error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-400 mb-2">Wallet Error</p>
          <p className="text-[#94a3b8] text-sm mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Prevent hydration mismatch - don't render wallet providers until client-side
  if (!mounted || !WalletComponents) {
    console.log('[WalletProvider] Rendering loading state (mounted:', mounted, 'hasComponents:', !!WalletComponents, ')');
    return (
      <div className="min-h-screen bg-[#030712]">
        {children}
      </div>
    );
  }

  console.log('[WalletProvider] Rendering wallet providers');
  const { ConnectionProvider, SolanaWalletProvider, WalletModalProvider, wallets } = WalletComponents;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
