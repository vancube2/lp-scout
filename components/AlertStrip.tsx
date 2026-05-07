'use client';

import { useState, useEffect } from 'react';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  action?: {
    type: 'ZAP_IN' | 'ZAP_OUT' | 'REBALANCE' | 'COMPOUND' | 'DISMISS';
    label: string;
    data?: Record<string, any>;
  };
}

interface AlertStripProps {
  walletAddress: string | null;
  onAction?: (action: Alert['action'], alertId: string) => void;
}

export function AlertStrip({ walletAddress, onAction }: AlertStripProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress) {
      setAlerts([]);
      return;
    }

    // Simulate fetching alerts - in production, this would poll from backend
    const mockAlerts: Alert[] = [
      {
        id: '1',
        severity: 'critical',
        message: 'Position SOL-USDC is out of range and not earning fees',
        timestamp: new Date().toISOString(),
        action: {
          type: 'REBALANCE',
          label: 'Rebalance Now',
          data: { positionId: 'pos1', reason: 'out_of_range' },
        },
      },
      {
        id: '2',
        severity: 'warning',
        message: 'Uncollected fees: $45.20 across 3 positions',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: {
          type: 'COMPOUND',
          label: 'Compound',
          data: { totalFees: 45.20 },
        },
      },
    ];

    setAlerts(mockAlerts);

    // Poll for new alerts every 30 seconds
    const interval = setInterval(() => {
      // In production: fetch from /api/agent/alerts
    }, 30000);

    return () => clearInterval(interval);
  }, [walletAddress]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleAction = (alert: Alert) => {
    if (alert.action) {
      onAction?.(alert.action, alert.id);
      handleDismiss(alert.id);
    }
  };

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            alert.severity === 'critical'
              ? 'border-red-500/50 bg-red-500/10'
              : alert.severity === 'warning'
              ? 'border-yellow-500/50 bg-yellow-500/10'
              : 'border-blue-500/50 bg-blue-500/10'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Severity Icon */}
            {alert.severity === 'critical' ? (
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : alert.severity === 'warning' ? (
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}

            <span className={`text-xs truncate ${
              alert.severity === 'critical'
                ? 'text-red-300'
                : alert.severity === 'warning'
                ? 'text-yellow-300'
                : 'text-blue-300'
            }`}>
              {alert.message}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {alert.action && (
              <button
                onClick={() => handleAction(alert)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  alert.severity === 'critical'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {alert.action.label}
              </button>
            )}

            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
