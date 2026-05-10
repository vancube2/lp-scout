'use client';

import { useState, useEffect } from 'react';
import { ClientPage } from './ClientPage';

// Simple loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="text-[#94a3b8] animate-pulse">Loading LP Scout...</div>
    </div>
  );
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch - don't render app until client-side
  if (!isClient) {
    return <LoadingScreen />;
  }

  return <ClientPage />;
}
