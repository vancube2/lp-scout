'use client';

import { useState, useEffect } from 'react';

// Simple loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="text-[#94a3b8] animate-pulse">Loading LP Scout...</div>
    </div>
  );
}

// Main app component - only rendered client-side
function AppContent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingScreen />;
  }

  // Dynamically import the actual app to avoid SSR issues
  const { ClientPage } = require('./ClientPage');
  return <ClientPage />;
}

export default function Home() {
  return <AppContent />;
}
