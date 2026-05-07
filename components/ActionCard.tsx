'use client';

import { useState } from 'react';

export interface ActionCardData {
  id: string;
  type: 'ZAP_IN' | 'ZAP_OUT' | 'REBALANCE' | 'COMPOUND' | 'COPY_LP';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  title: string;
  description: string;
  data: Record<string, any>;
  createdAt: string;
}

interface ActionCardProps {
  action: ActionCardData;
  onExecute?: (action: ActionCardData) => void;
  onCancel?: (action: ActionCardData) => void;
  onDismiss?: (action: ActionCardData) => void;
}

export function ActionCard({ action, onExecute, onCancel, onDismiss }: ActionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeIcon = () => {
    switch (action.type) {
      case 'ZAP_IN':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        );
      case 'ZAP_OUT':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        );
      case 'REBALANCE':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'COMPOUND':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'COPY_LP':
        return (
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
    }
  };

  const getStatusBadge = () => {
    switch (action.status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Pending
          </span>
        );
      case 'executing':
        return (
          <span className="flex items-center gap-1 text-xs text-blue-400">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Executing...
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed
          </span>
        );
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-lg border p-3 transition-all ${
        action.status === 'pending'
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : action.status === 'executing'
          ? 'border-blue-500/30 bg-blue-500/5'
          : action.status === 'completed'
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5'
      } ${isHovered ? 'border-opacity-100' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon()}
          <span className="text-sm font-medium text-white">{action.title}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 mb-3">{action.description}</p>

      {/* Data Summary */}
      {Object.keys(action.data).length > 0 && (
        <div className="mb-3 rounded bg-gray-800/50 p-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(action.data).slice(0, 3).map(([key, value]) => (
              <span key={key} className="text-xs text-gray-500">
                {key}: <span className="text-gray-300">{String(value).slice(0, 20)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {action.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onExecute?.(action)}
            className="flex-1 rounded bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-colors"
          >
            Execute
          </button>
          <button
            onClick={() => onCancel?.(action)}
            className="flex-1 rounded bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {(action.status === 'completed' || action.status === 'failed') && (
        <button
          onClick={() => onDismiss?.(action)}
          className="w-full rounded bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600 transition-colors"
        >
          Dismiss
        </button>
      )}

      {action.status === 'executing' && (
        <div className="w-full rounded bg-gray-700 px-3 py-1.5 text-xs text-center text-gray-400">
          Processing...
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-2 text-right text-xs text-gray-500">
        {new Date(action.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface ActionCardListProps {
  actions: ActionCardData[];
  onExecute?: (action: ActionCardData) => void;
  onCancel?: (action: ActionCardData) => void;
  onDismiss?: (action: ActionCardData) => void;
  maxHeight?: string;
}

export function ActionCardList({
  actions,
  onExecute,
  onCancel,
  onDismiss,
  maxHeight = '300px',
}: ActionCardListProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No pending actions
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto" style={{ maxHeight }}>
      {actions.map((action) => (
        <ActionCard
          key={action.id}
          action={action}
          onExecute={onExecute}
          onCancel={onCancel}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
