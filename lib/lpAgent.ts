import { Pool, Position, PortfolioOverview, ZapInParams, ZapResult, Message, ChatContext } from './types';

const API_URL = ''; // Use relative URLs for Vercel deployment

export async function discoverPools(params?: Record<string, string>): Promise<Pool[]> {
  const queryParams = new URLSearchParams(params || {});
  const response = await fetch(`${API_URL}/api/pools/discover?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch pools');
  return response.json();
}

export async function getPool(poolId: string): Promise<Pool> {
  const response = await fetch(`${API_URL}/api/pools/${poolId}`);
  if (!response.ok) throw new Error('Failed to fetch pool');
  return response.json();
}

export async function getPoolStats(poolId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/pools/${poolId}/stats`);
  if (!response.ok) throw new Error('Failed to fetch pool stats');
  return response.json();
}

export async function getPositions(owner: string): Promise<Position[]> {
  const response = await fetch(`${API_URL}/api/positions/opening?owner=${owner}`);
  if (!response.ok) throw new Error('Failed to fetch positions');
  return response.json();
}

export async function getPortfolioOverview(owner: string): Promise<PortfolioOverview> {
  const response = await fetch(`${API_URL}/api/positions/overview?owner=${owner}`);
  if (!response.ok) throw new Error('Failed to fetch overview');
  return response.json();
}

export async function zapIn(poolId: string, params: ZapInParams): Promise<ZapResult> {
  const response = await fetch(`${API_URL}/api/pools/${poolId}/zap-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error('Failed to zap in');
  return response.json();
}

export async function zapOut(positionId: string, bps: number): Promise<ZapResult> {
  const response = await fetch(`${API_URL}/api/positions/zap-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionId, bps }),
  });
  if (!response.ok) throw new Error('Failed to zap out');
  return response.json();
}

export function chat(
  messages: Message[],
  wallet: string,
  context: ChatContext
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, walletAddress: wallet, context }),
      }).then(async (response) => {
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }

        controller.close();
      }).catch((error) => {
        controller.error(error);
      });
    },
  });
}
