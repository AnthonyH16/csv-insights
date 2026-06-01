import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('@/lib/anthropic', async () => {
  const actual = await vi.importActual<typeof import('@/lib/anthropic')>('@/lib/anthropic');
  return {
    ...actual,
    getClient: () => ({ messages: { create: createMock } }),
  };
});

import { POST } from '@/app/api/analyze/route';

const validResponse = {
  insights: [
    { title: 'A', description: 'desc', why_it_matters: 'why' },
    { title: 'B', description: 'desc', why_it_matters: 'why' },
    { title: 'C', description: 'desc', why_it_matters: 'why' },
  ],
  suggested_charts: [
    { type: 'bar', title: 'T', x_column: 'a', y_column: 'b', group_by: null },
    { type: 'line', title: 'T', x_column: 'a', y_column: 'b', group_by: null },
  ],
  followup_questions: ['q1', 'q2', 'q3'],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validDigest = {
  rowCount: 10,
  columns: [{ name: 'a', type: 'number', nullCount: 0, min: 1, max: 10, mean: 5 }],
  sampleRows: [{ a: 1 }],
};

beforeEach(() => {
  createMock.mockReset();
});

describe('POST /api/analyze', () => {
  it('returns parsed insights on valid response', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validResponse) }],
    });
    const res = await POST(makeRequest({ digest: validDigest }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.insights.length).toBe(3);
  });

  it('retries once on invalid JSON, then succeeds', async () => {
    createMock
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json' }] })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(validResponse) }],
      });
    const res = await POST(makeRequest({ digest: validDigest }));
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('returns 502 after two invalid responses', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'still not json' }] });
    const res = await POST(makeRequest({ digest: validDigest }));
    expect(res.status).toBe(502);
  });

  it('returns 400 on missing digest', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
