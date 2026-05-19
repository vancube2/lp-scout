import type { Metadata } from 'next';
import './globals.css';
import { SolanaProviders } from './providers';

export const metadata: Metadata = {
  title: 'Orca LP Agent - AI-Powered Liquidity Management',
  description: 'Discover top Orca Whirlpools, manage positions, and earn fees with AI assistance. Fee-only revenue. No subscriptions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark'>
      <body className='font-sans bg-[#030712]'>
        <SolanaProviders>
          {children}
        </SolanaProviders>
      </body>
    </html>
  );
}