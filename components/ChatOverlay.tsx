'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';

interface ChatOverlayProps {
  walletAddress: string | null;
  onClose: () => void;
  onAction: (action: any) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: any[];
}

interface ToolCall {
  id: string;
  tool: string;
  status: 'pending' | 'completed' | 'error';
}

// Tool call indicator icons and labels
const TOOL_CONFIG: Record<string, { icon: string; label: string }> = {
  discover_pools: { icon: '🔍', label: 'Scanning pools...' },
  get_positions: { icon: '📊', label: 'Loading positions...' },
  get_portfolio_overview: { icon: '📈', label: 'Loading portfolio...' },
  execute_zap_in: { icon: '⚡', label: 'Executing Zap-In...' },
  execute_zap_out: { icon: '↗️', label: 'Executing Zap-Out...' },
  execute_rebalance: { icon: '🔄', label: 'Submitting Jito bundle...' },
  enable_auto_manage: { icon: '🤖', label: 'Configuring engine...' },
  recommend_pool: { icon: '🎯', label: 'Analyzing pools...' },
  create_chore: { icon: '📋', label: 'Setting up chore...' },
  start_copy_lp: { icon: '👥', label: 'Starting copy LP...' },
  preview_zap_in: { icon: '👁', label: 'Previewing Zap-In...' },
  preview_zap_out: { icon: '👁', label: 'Previewing Zap-Out...' },
  preview_rebalance: { icon: '👁', label: 'Previewing rebalance...' },
  get_pool_detail: { icon: '🔎', label: 'Loading pool details...' },
  get_top_lpers: { icon: '🏆', label: 'Loading top LPs...' },
  get_engine_status: { icon: '⚙️', label: 'Checking engine...' },
  get_chores: { icon: '📝', label: 'Loading chores...' },
  get_jito_status: { icon: '⚡', label: 'Checking Jito status...' },
  get_fee_estimate: { icon: '💰', label: 'Calculating fees...' },
};

// Tool call indicator component
function ToolCallIndicator({ toolCall }: { toolCall: ToolCall }) {
  const config = TOOL_CONFIG[toolCall.tool] || { icon: '⚙️', label: `Running ${toolCall.tool}...` };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-3 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg"
    >
      <span className="text-sm">{config.icon}</span>
      <span className="text-xs text-[#94a3b8]">{config.label}</span>
      {toolCall.status === 'pending' && (
        <Loader2 className="w-3 h-3 text-green-400 animate-spin ml-2" />
      )}
      {toolCall.status === 'completed' && (
        <span className="text-green-400 text-xs ml-2">✓</span>
      )}
      {toolCall.status === 'error' && (
        <span className="text-red-400 text-xs ml-2">✗</span>
      )}
    </motion.div>
  );
}

export function ChatOverlay({ walletAddress, onClose, onAction }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: walletAddress
        ? "Yo. What's the move today?"
        : 'Yo. Connect your wallet for personalized alpha.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeToolCalls]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setActiveToolCalls([]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          walletAddress,
          context: {
            hasWallet: !!walletAddress,
          },
          autoExecute: false, // Require confirmation for execution tools
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage = '';
      const messageId = `assistant-${Date.now()}`;

      // Add placeholder for streaming message
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          content: '',
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text' && data.content) {
              assistantMessage += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, content: assistantMessage } : m
                )
              );
            }

            if (data.type === 'tool_call') {
              // Add tool call to active list
              setActiveToolCalls((prev) => [
                ...prev,
                { id: data.id, tool: data.tool, status: 'pending' },
              ]);
            }

            if (data.type === 'tool_result') {
              // Update tool call status
              setActiveToolCalls((prev) =>
                prev.map((tc) =>
                  tc.id === data.toolUseId
                    ? { ...tc, status: data.isError ? 'error' : 'completed' }
                    : tc
                )
              );
            }

            if (data.type === 'action') {
              // Handle action (backward compatibility)
              console.log('Action received:', data.action);
              onAction(data.action);
            }

            if (data.type === 'error') {
              console.error('Chat error:', data.message);
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  role: 'assistant',
                  content: `Error: ${data.message}`,
                },
              ]);
            }

            if (data.type === 'done') {
              break;
            }
          } catch (e) {
            // Ignore parse errors from streaming
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Try again?',
        },
      ]);
    } finally {
      setLoading(false);
      // Clear tool calls after a delay
      setTimeout(() => setActiveToolCalls([]), 3000);
    }
  };

  const quickActions = [
    { label: 'Best pools today', value: 'What are the best pools today?' },
    { label: 'My positions', value: 'How are my positions doing?' },
    { label: 'Rebalance help', value: 'Should I rebalance any positions?' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#030712]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">LP Scout Agent</h2>
            <p className="text-xs text-green-400">Online</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-[#94a3b8] hover:text-white"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, i) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i === messages.length - 1 ? 0 : 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                max-w-[85%] rounded-2xl px-4 py-3
                ${message.role === 'user'
                  ? 'bg-green-500 text-white'
                  : 'bg-[#0f172a] border border-[#1e293b] text-white'
                }
              `}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Tool call indicators */}
        <AnimatePresence>
          {activeToolCalls.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-2"
            >
              {activeToolCalls.map((tc) => (
                <ToolCallIndicator key={tc.id} toolCall={tc} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && activeToolCalls.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-[#94a3b8] rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setInput(action.value);
              }}
              className="flex-shrink-0 px-4 py-2 bg-[#0f172a] border border-[#1e293b] hover:border-green-500/50 rounded-full text-sm text-[#94a3b8] hover:text-white transition-colors flex items-center gap-2"
            >
              {action.label}
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#1e293b] safe-bottom">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about pools, positions, or strategy..."
            className="flex-1 px-4 py-3 bg-[#0f172a] border border-[#1e293b] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-green-500"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center text-white"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
