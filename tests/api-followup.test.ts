import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();
vi.mock('@/lib/anthropic', async () => {
  const actual = await vi.importActual<typeof import('@/lib/anthropic')>('@/lib/anthropic');
  return {
    ...actual,
    getClient: () => ({ messages: { create: createMock } }),
  };
});

import { POST } from '@/app/api/followup/route';

const digest = {
  rowCount: 10,
  columns: [{ name: 'a', type: 'number', nullCount: 0 }],
  sampleRows: [{ a: 1 }],
};

function req(body: unknown) {
  return new Request('http://localhost/api/followup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => createMock.mockReset());

describe('POST /api/followup', () => {
  it('returns the model answer', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"answer":"because revenue grew 12%"}' }],
    });
    const res = await POST(req({ digest, question: 'why?' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toMatch(/12%/);
  });

  it('returns 400 on missing question', async () => {
    const res = await POST(req({ digest }));
    expect(res.status).toBe(400);
  });
});
