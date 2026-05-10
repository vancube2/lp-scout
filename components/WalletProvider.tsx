'use client';

import { ReactNode, useState, useEffect } from 'react';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[WalletProvider] useEffect running');

    const initWallet = async () => {
      try {
        console.log('[WalletProvider] Starting wallet initialization...');

        // Wait a tick to ensure we're fully client-side
        await new Promise(resolve => setTimeout(resolve, 0));

        // Check if we're in browser
        if (typeof window === 'undefined') {
          console.log('[WalletProvider] Not in browser, skipping');
          return;
        }

        console.log('[WalletProvider] In browser, loading dependencies...');

        // Dynamically import everything
        const [{ clusterApiUrl }, { ConnectionProvider, WalletProvider: SolanaWalletProvider }, { WalletModalProvider }, { PhantomWalletAdapter }, { SolflareWalletAdapter }] = await Promise.all([
          import('@solana/web3.js'),
          import('@solana/wallet-adapter-react'),
          import('@solana/wallet-adapter-react-ui'),
          import('@solana/wallet-adapter-phantom'),
          import('@solana/wallet-adapter-solflare'),
        ]);

        console.log('[WalletProvider] All imports loaded');

        // Create endpoint
        const endpoint = clusterApiUrl('mainnet-beta');
        console.log('[WalletProvider] Endpoint:', endpoint);

        // Create wallets
        const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
        console.log('[WalletProvider] Wallets created:', wallets.length);

        // Store in window for the render to access
        (window as any).__walletContext = {
          endpoint,
          wallets,
          ConnectionProvider,
          SolanaWalletProvider,
          WalletModalProvider,
        };

        console.log('[WalletProvider] Context stored, setting ready');
        setIsReady(true);
      } catch (err: any) {
        console.error('[WalletProvider] Initialization error:', err);
        setError(err.message || 'Failed to initialize wallet');
      }
    };

    initWallet();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-400 mb-2">Wallet Error</p>
          <p className="text-[#94a3b8] text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-[#94a3b8] animate-pulse">Loading wallet...</div>
      </div>
    );
  }

  // Get context from window
  const ctx = (window as any).__walletContext;
  if (!ctx) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-red-400">Wallet context not found</div>
      </div>
    );
  }

  const { ConnectionProvider, SolanaWalletProvider, WalletModalProvider, endpoint, wallets } = ctx;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
