'use client';

import { ReactNode, useMemo, useState, useEffect } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [WalletComponents, setWalletComponents] = useState<{
    ConnectionProvider: any;
    SolanaWalletProvider: any;
    WalletModalProvider: any;
    wallets: any[];
    endpoint: string;
  } | null>(null);

  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  useEffect(() => {
    setMounted(true);

    // Dynamically import wallet adapters only on client-side
    const loadWalletAdapters = async () => {
      try {
        const [
          { ConnectionProvider },
          { WalletProvider: SolanaWalletProvider },
          { WalletModalProvider },
          { PhantomWalletAdapter },
          { SolflareWalletAdapter },
        ] = await Promise.all([
          import('@solana/wallet-adapter-react'),
          import('@solana/wallet-adapter-react'),
          import('@solana/wallet-adapter-react-ui'),
          import('@solana/wallet-adapter-phantom'),
          import('@solana/wallet-adapter-solflare'),
        ]);

        const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

        setWalletComponents({
          ConnectionProvider,
          SolanaWalletProvider,
          WalletModalProvider,
          wallets,
          endpoint,
        });
      } catch (err) {
        console.error('Failed to load wallet adapters:', err);
      }
    };

    loadWalletAdapters();
  }, [endpoint]);

  // Prevent hydration mismatch - don't render wallet providers until client-side
  if (!mounted || !WalletComponents) {
    return (
      <div className="min-h-screen bg-[#030712]">
        {children}
      </div>
    );
  }

  const { ConnectionProvider, SolanaWalletProvider, WalletModalProvider, wallets } = WalletComponents;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
