import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-sonnet-4-6';
export const MAX_TOKENS = 2000;

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export function extractJSON(message: Anthropic.Messages.Message): unknown {
  const text = extractText(message);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object in model response');
  }
  return JSON.parse(text.slice(start, end + 1));
}
