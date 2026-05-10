import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LP Scout - AI-Powered Meteora LP Agent",
  description: "Discover the best liquidity pools and manage positions with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window._debugLogs = [];
              window._debug = function(msg) {
                console.log('[DEBUG]', msg);
                window._debugLogs.push(msg);
              };
              window._debug('Layout loaded');

              // Capture errors
              window.addEventListener('error', function(e) {
                window._debug('ERROR: ' + e.message);
                console.error('[DEBUG] Global error:', e);
              });

              // Check for wallet extensions
              window._debug('Checking wallet extensions...');
              if (window.solana) window._debug('Found window.solana');
              if (window.phantom) window._debug('Found window.phantom');
              if (window.solflare) window._debug('Found window.solflare');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#030712]`}>{children}</body>
    </html>
  );
}
