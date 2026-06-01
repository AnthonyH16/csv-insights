import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, MODEL, MAX_TOKENS, extractJSON } from '@/lib/anthropic';
import { AnalyzeResponseSchema } from '@/lib/schemas';
import { ANALYZE_USER, SYSTEM, digestBlock } from '@/lib/prompts';
import demoResult from '../../../public/demo-result.json';

const RequestSchema = z.object({
  digest: z.object({
    rowCount: z.number(),
    columns: z.array(z.any()),
    sampleRows: z.array(z.any()),
  }),
  demo: z.boolean().optional(),
});

const DEMO_PERCEIVED_DELAY_MS = 2500;

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  if (parsed.demo) {
    try {
      await new Promise((r) => setTimeout(r, DEMO_PERCEIVED_DELAY_MS));
      return NextResponse.json(AnalyzeResponseSchema.parse(demoResult));
    } catch (err) {
      console.error('demo cache miss', err);
      // fall through to live call
    }
  }

  const client = getClient();
  const digestText = digestBlock(parsed.digest as never);

  const callOnce = async (stricter: boolean) => {
    const userText = stricter
      ? ANALYZE_USER + '\n\nReturn ONLY the JSON object, no other text.'
      : ANALYZE_USER;
    return client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: digestText,
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
    });
  };

  const tryParse = (raw: unknown) => AnalyzeResponseSchema.parse(raw);

  try {
    const first = await callOnce(false);
    try {
      const json = extractJSON(first);
      return NextResponse.json(tryParse(json));
    } catch {
      const second = await callOnce(true);
      const json = extractJSON(second);
      return NextResponse.json(tryParse(json));
    }
  } catch (err) {
    console.error('analyze error', err);
    return NextResponse.json({ error: 'analysis failed' }, { status: 502 });
  }
}
