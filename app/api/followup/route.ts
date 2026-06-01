import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, MODEL, MAX_TOKENS, extractJSON } from '@/lib/anthropic';
import { FollowupResponseSchema } from '@/lib/schemas';
import { SYSTEM, digestBlock, followupUser } from '@/lib/prompts';

const RequestSchema = z.object({
  digest: z.object({
    rowCount: z.number(),
    columns: z.array(z.any()),
    sampleRows: z.array(z.any()),
  }),
  question: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const client = getClient();
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: digestBlock(parsed.digest as never),
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: followupUser(parsed.question) },
          ],
        },
      ],
    });
    const json = extractJSON(message);
    return NextResponse.json(FollowupResponseSchema.parse(json));
  } catch (err) {
    console.error('followup error', err);
    return NextResponse.json({ error: 'follow-up failed' }, { status: 502 });
  }
}
