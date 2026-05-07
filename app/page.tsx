'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WalletProvider } from '../components/WalletProvider';
import { WalletConnect } from '../components/WalletConnect';
import { Chat } from '../components/Chat';
import { PoolDiscovery } from '../components/PoolDiscovery';
import { PositionPanel } from '../components/PositionPanel';
import { ZapModal } from '../components/ZapModal';
import { Pool, Position, ChatContext, ActionData } from '../lib/types';

function AppContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [zapMode, setZapMode] = useState<'in' | 'out'>('in');
  const [pendingAction, setPendingAction] = useState<ActionData | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext>({
    topPools: [],
    openPositions: [],
    portfolioOverview: null,
  });

  const handleZapIn = (pool: Pool) => {
    setSelectedPool(pool);
    setZapMode('in');
    setIsZapModalOpen(true);
  };

  const handleZapOut = (position: Position) => {
    setSelectedPosition(position);
    setZapMode('out');
    setIsZapModalOpen(true);
  };

  const handleAction = (action: ActionData) => {
    setPendingAction(action);
    if (action.type === 'ZAP_IN') {
      const pool = chatContext.topPools.find(p => p.address === action.poolId);
      if (pool) {
        setSelectedPool(pool);
        setZapMode('in');
        setIsZapModalOpen(true);
      }
    } else if (action.type === 'ZAP_OUT') {
      const position = chatContext.openPositions.find(p => p.id === action.positionId);
      if (position) {
        setSelectedPosition(position);
        setZapMode('out');
        setIsZapModalOpen(true);
      }
    }
  };

  const closeZapModal = () => {
    setIsZapModalOpen(false);
    setSelectedPool(null);
    setSelectedPosition(null);
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">LP</span>
            </div>
            <h1 className="text-xl font-bold">LP Scout</h1>
          </div>
          <WalletConnect onConnect={setWalletAddress} />
        </div>
      </header>

      {/* Main Layout - Three Panels */}
      <main className="flex h-[calc(100vh-73px)] overflow-hidden">
        {/* Left Panel - Positions (30%) */}
        <div className="w-[30%] border-r border-gray-800 overflow-hidden">
          <PositionPanel
            walletAddress={walletAddress}
            onZapOut={handleZapOut}
            onPositionsUpdate={(positions) =>
              setChatContext(prev => ({ ...prev, openPositions: positions }))
            }
            onOverviewUpdate={(overview) =>
              setChatContext(prev => ({ ...prev, portfolioOverview: overview }))
            }
          />
        </div>

        {/* Center Panel - Chat (40%) */}
        <div className="w-[40%] border-r border-gray-800 overflow-hidden">
          <Chat
            walletAddress={walletAddress}
            context={chatContext}
            onAction={handleAction}
          />
        </div>

        {/* Right Panel - Pool Discovery (30%) */}
        <div className="w-[30%] overflow-hidden">
          <PoolDiscovery
            onZapIn={handleZapIn}
            onPoolsUpdate={(pools) =>
              setChatContext(prev => ({ ...prev, topPools: pools }))
            }
          />
        </div>
      </main>

      {/* Zap Modal */}
      {isZapModalOpen && (
        <ZapModal
          mode={zapMode}
          pool={selectedPool}
          position={selectedPosition}
          pendingAction={pendingAction}
          walletAddress={walletAddress}
          onClose={closeZapModal}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
