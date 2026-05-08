'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Zap, Wallet } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, ChatContext, ActionData } from '../lib/types';
import { AlertStrip, Alert } from './AlertStrip';
import { ActionCard, ActionCardData } from './ActionCard';

interface ChatProps {
  walletAddress: string | null;
  context: ChatContext;
  onAction: (action: ActionData) => void;
  onConnectWallet: () => void;
}

export function Chat({ walletAddress, context, onAction, onConnectWallet }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `**Welcome to LP Scout!** 🤖

I'm your AI liquidity pool strategist for Meteora on Solana. I can help you:

• **Discover top pools** ranked by real yield and quality metrics
• **Analyze market conditions** and recommend strategies (Spot/Curve/BidAsk)
• **Answer LP questions** about impermanent loss, fees, and positioning
• **Manage your positions** (when you connect your wallet)

Try asking me:
- "What are the best pools right now?"
- "Explain the difference between Spot and Curve strategies"
- "Which pool has the best risk-adjusted returns?"

Connect your wallet anytime to get personalized recommendations based on your holdings!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<ActionCardData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send welcome analysis when wallet connects
  useEffect(() => {
    if (walletAddress && context.openPositions.length > 0) {
      const hasAnalyzed = messages.some(
        (m) => m.role === 'assistant' && m.content.includes('Your Portfolio Analysis')
      );

      if (!hasAnalyzed) {
        handleSendMessage('Analyze my portfolio and positions', true);
      }
    }
  }, [walletAddress]);

  const handleSendMessage = useCallback(
    async (content: string, isAuto: boolean = false) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = { role: 'user', content };
      if (!isAuto) {
        setMessages((prev) => [...prev, userMessage]);
      }
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: isAuto ? [{ role: 'user', content }] : [...messages, userMessage],
              walletAddress,
              context,
              hasWallet: !!walletAddress,
            }),
          }
        );

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let currentAction: ActionData | null = null;

        // Add placeholder for assistant message
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    action: currentAction || undefined,
                  };
                  return newMessages;
                });
              }

              if (data.action) {
                currentAction = data.action;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    action: currentAction || undefined,
                  };
                  return newMessages;
                });

                // Also add to pending actions as a card
                const newAction: ActionCardData = {
                  id: `action-${Date.now()}`,
                  type: data.action.type,
                  status: 'pending',
                  title: `${data.action.type === 'ZAP_IN' ? 'Zap In' : 'Zap Out'} Recommended`,
                  description: data.action.reason || 'Action recommended by LP Scout',
                  data: data.action,
                  createdAt: new Date().toISOString(),
                };
                setPendingActions((prev) => [newAction, ...prev]);
              }
            } catch (e) {
              // Skip malformed lines
            }
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I had trouble processing that. Try again?',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, walletAddress, context]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleAlertAction = (action: Alert['action'], alertId: string) => {
    if (action?.type === 'ZAP_IN' || action?.type === 'ZAP_OUT') {
      onAction(action.data as ActionData);
    }
  };

  const handleExecuteAction = (action: ActionCardData) => {
    if (!walletAddress) {
      onConnectWallet();
      return;
    }
    if (action.data.type === 'ZAP_IN' || action.data.type === 'ZAP_OUT') {
      onAction(action.data as ActionData);
      setPendingActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, status: 'executing' } : a))
      );
    }
  };

  const handleCancelAction = (action: ActionCardData) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== action.id));
  };

  const handleDismissAction = (action: ActionCardData) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== action.id));
  };

  const parseActionFromContent = (content: string): ActionData | null => {
    const match = content.match(/<action>([\s\S]*?)<\/action>/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  };

  const cleanContent = (content: string): string => {
    return content.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
  };

  // Quick suggestion chips
  const suggestions = walletAddress
    ? ['Analyze my portfolio', 'Best pools for my holdings', 'Should I rebalance?']
    : ['Top pools right now', 'Spot vs Curve vs BidAsk?', 'What is agentScore?'];

  return (
    <div className="h-full flex flex-col bg-[#030712]">
      {/* Alerts Strip - only when wallet connected */}
      {walletAddress && (
        <div className="px-4 pt-4">
          <AlertStrip
            walletAddress={walletAddress}
            onAction={handleAlertAction}
          />
        </div>
      )}

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">
              Pending Actions ({pendingActions.length})
            </span>
            <button
              onClick={() => setPendingActions([])}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {pendingActions.slice(0, 3).map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onExecute={handleExecuteAction}
                onCancel={handleCancelAction}
                onDismiss={handleDismissAction}
              />
            ))}
            {pendingActions.length > 3 && (
              <div className="text-center text-xs text-gray-500">
                +{pendingActions.length - 3} more actions
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!walletAddress && (
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Preview Mode
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  You're browsing in demo mode. Connect your wallet to execute trades and see your actual positions.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const action = message.action || parseActionFromContent(message.content);
          const cleanText = cleanContent(message.content);

          return (
            <div key={index} className="space-y-2">
              <div
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'ml-12 bg-green-900/20 text-white'
                    : 'mr-12 bg-gray-900 text-white'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{cleanText}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{cleanText}</p>
                )}
              </div>

              {/* Action Card in Chat */}
              {action && (
                <div className="mr-12 bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-green-400">
                      {action.type === 'ZAP_IN' ? 'ZAP IN RECOMMENDED' : 'ZAP OUT RECOMMENDED'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {action.type === 'ZAP_IN' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Input:</span>
                          <span>{action.inputSOL} SOL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Strategy:</span>
                          <span className="text-green-400">{action.strategy}</span>
                        </div>
                      </>
                    )}
                    {action.type === 'ZAP_OUT' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Withdraw:</span>
                        <span>{action.bps ? (action.bps / 100).toFixed(0) : 0}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reason:</span>
                      <span className="text-right max-w-[70%]">{action.reason}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(action)}
                      className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {walletAddress ? 'Execute' : 'Connect to Execute'}
                    </button>
                    <button
                      onClick={() => {
                        setMessages((prev) =>
                          prev.map((m, i) =>
                            i === index ? { ...m, action: undefined } : m
                          )
                        );
                      }}
                      className="flex-1 py-2 border border-gray-600 text-gray-400 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Suggestion Chips */}
        {!isLoading && messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-full transition-colors border border-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="mr-12 bg-gray-900 rounded-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              walletAddress
                ? "Ask about your portfolio or request recommendations..."
                : "Ask about pools, strategies, or market conditions..."
            }
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
