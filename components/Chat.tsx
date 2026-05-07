'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chat } from '../lib/lpAgent';
import { Message, ChatContext, ActionData } from '../lib/types';

interface ChatProps {
  walletAddress: string | null;
  context: ChatContext;
  onAction: (action: ActionData) => void;
}

export function Chat({ walletAddress, context, onAction }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Connect your wallet and I\'ll analyze your positions and find the best pools for you right now.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send context when wallet connects or data updates
  useEffect(() => {
    if (walletAddress && context.topPools.length > 0) {
      const hasSentContext = messages.some(
        (m) => m.role === 'user' && m.content.includes('Analyze my portfolio')
      );

      if (!hasSentContext) {
        handleSendMessage('Analyze my portfolio and current positions');
      }
    }
  }, [walletAddress]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...messages, userMessage],
              walletAddress,
              context,
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

  return (
    <div className="h-full flex flex-col bg-[#030712]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

              {/* Action Card */}
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
                      Execute
                    </button>
                    <button
                      onClick={() => {
                        // Remove action from message
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
            placeholder="Ask LP Scout about pools, positions, or strategies..."
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
