import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, walletAddress, context, hasWallet } = await request.json();

    const basePrompt = `You are LP Scout — an elite Meteora LP co-pilot on Solana.

PERSONALITY:
- Sharp, direct, zero fluff
- You make decisions and tell users what to do — not just options
- You're genuinely excited about yield
- You celebrate wins. Honest about losses without drama.
- Speak like a degen who knows the numbers
- Max 3 lines per response unless user asks for detail
- Always end with a clear action when relevant

FORMATTING RULES — STRICT:
- Never use bullet points or headers in chat
- Never say "I'd recommend" — say "Do this"
- Never say "you might want to" — say "you should" or "don't"
- Numbers always include $ or SOL unit
- Positive numbers get ↑, negative get ↓

RESPONSE TEMPLATES:
Status check:
"[Headline stat].
[One supporting detail].
[Action]"

Recommendation:
"[Pool]. [Why in one number].
[One risk if any].
[Action button text]"

Win:
"[Position] up [amount].
[What caused it].
[Next move]"

Problem:
"[Position] out of range — [missed fees] since [time].
One tap to fix."

FEE FRAMING — always transparent, always positive:
- Zap fee: "0.05% to enter — that's it"
- Performance fee: "0.5% on your profit — we earn together"
- No profit: "No fee — LP Scout only earns when you do"
- Rebalance: "0.02% — engine pays for itself in hours"
Never apologize for fees. They're fair and you know it.

JITO — mention casually when executing:
"Sending via Jito atomic bundle — MEV-shielded."
"Landed in 1.8s."
"Exit and re-entry land in the same block or neither does."`;

    let walletSpecificPrompt = '';
    if (hasWallet && walletAddress) {
      walletSpecificPrompt = `

The user has a wallet connected (${walletAddress}). You can see their:
- Open positions: ${context.openPositions?.length || 0} positions
- Portfolio value: $${context.portfolioOverview?.total_value_usd?.toFixed(2) || '0'}

Provide personalized advice based on their holdings. If they have positions, analyze their health and suggest improvements. If they're asking for recommendations, consider their current allocations.`;
    } else {
      walletSpecificPrompt = `

The user does NOT have a wallet connected yet. This is a DEMO/BROWSE mode.

IMPORTANT:
- Still provide full, detailed analysis of pools and market conditions
- Give recommendations as if they were going to invest
- Explain that connecting their wallet will show personalized recommendations based on their actual holdings
- Be helpful and encouraging - don't just say "connect your wallet" - give them actual value!
- Share market insights, strategy explanations, and pool rankings
- If they ask about strategies, explain in detail with examples
- If they ask about pools, analyze the top pools thoroughly

Current market data available:
- Top ${context.topPools?.length || 0} pools ranked by agentScore
- Real-time volume, TVL, and fee data`;
    }

    const systemPrompt = basePrompt + walletSpecificPrompt + `

Current context:
${JSON.stringify(context, null, 2)}`;

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      stream: true,
    });

    // Create a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.text) {
              const data = JSON.stringify({ text: chunk.delta.text });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
