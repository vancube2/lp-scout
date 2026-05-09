import { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'LP Scout - AI-Powered Meteora LP Agent',
  description: 'Discover the best liquidity pools and manage positions with AI assistance',
};

// Dynamic import with SSR disabled to prevent hydration issues with wallet adapters
const ClientPage = dynamic(
  () => import('./ClientPage').then((mod) => mod.ClientPage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-[#94a3b8] animate-pulse">Loading LP Scout...</div>
      </div>
    )
  }
);

export default function Home() {
  return <ClientPage />;
}
