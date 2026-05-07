'use client';

import { useState, useEffect } from 'react';
import { WalletProvider } from '../components/WalletProvider';
import { WalletConnect } from '../components/WalletConnect';
import { Chat } from '../components/Chat';
import { PoolDiscovery } from '../components/PoolDiscovery';
import { PositionPanel } from '../components/PositionPanel';
import { EnginePanel } from '../components/EnginePanel';
import { CopyLP } from '../components/CopyLP';
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
  const [activeRightPanel, setActiveRightPanel] = useState<'pools' | 'copy'>('pools');

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
      const pool = chatContext.topPools.find((p) => p.address === action.poolId);
      if (pool) {
        setSelectedPool(pool);
        setZapMode('in');
        setIsZapModalOpen(true);
      }
    } else if (action.type === 'ZAP_OUT') {
      const position = chatContext.openPositions.find((p) => p.id === action.positionId);
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

      {/* Main Layout - 4 Panels */}
      <main className="flex h-[calc(100vh-73px)] overflow-hidden">
        {/* Left Panel - Positions (25%) */}
        <div className="w-[25%] border-r border-gray-800 overflow-hidden">
          <PositionPanel
            walletAddress={walletAddress}
            onZapOut={handleZapOut}
            onPositionsUpdate={(positions) =>
              setChatContext((prev) => ({ ...prev, openPositions: positions }))
            }
            onOverviewUpdate={(overview) =>
              setChatContext((prev) => ({ ...prev, portfolioOverview: overview }))
            }
          />
        </div>

        {/* Center Panel - Chat (35%) */}
        <div className="w-[35%] border-r border-gray-800 overflow-hidden">
          <Chat
            walletAddress={walletAddress}
            context={chatContext}
            onAction={handleAction}
          />
        </div>

        {/* Right Side - Split into Engine (20%) and Pools/Copy LP (20%) */}
        <div className="w-[40%] flex flex-col">
          {/* Top Right - Engine Panel (50%) */}
          <div className="h-[50%] border-b border-gray-800 overflow-hidden">
            <EnginePanel />
          </div>

          {/* Bottom Right - Pools/Copy LP Tabs (50%) */}
          <div className="h-[50%] flex flex-col">
            {/* Tab Switcher */}
            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveRightPanel('pools')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeRightPanel === 'pools'
                    ? 'text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Pool Discovery
              </button>
              <button
                onClick={() => setActiveRightPanel('copy')}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  activeRightPanel === 'copy'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Copy LP
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeRightPanel === 'pools' ? (
                <PoolDiscovery
                  onZapIn={handleZapIn}
                  onPoolsUpdate={(pools) =>
                    setChatContext((prev) => ({ ...prev, topPools: pools }))
                  }
                />
              ) : (
                <CopyLP />
              )}
            </div>
          </div>
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
