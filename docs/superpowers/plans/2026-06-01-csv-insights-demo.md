# CSV Insights Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a polished public web demo that takes a CSV upload and returns AI-generated insights and charts, optimized to convert non-technical SMB buyers into discovery calls.

**Architecture:** Single Next.js 15 (App Router) app on Vercel. Client parses CSV with PapaParse, builds a compact digest (columns, types, summary stats, 20 sample rows), POSTs digest to `/api/analyze`. Server calls Claude (`claude-sonnet-4-6`) with prompt caching, validates response with Zod, returns insights + chart specs + follow-up question seeds. Follow-up chat hits `/api/followup` reusing the cached digest.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind v4, Anthropic SDK (`@anthropic-ai/sdk`), PapaParse, Recharts, Zod, Vitest.

---

## File map

**Created:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.local.example`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/api/analyze/route.ts`, `app/api/followup/route.ts`
- `lib/digest.ts`, `lib/schemas.ts`, `lib/anthropic.ts`, `lib/prompts.ts`
- `components/Dropzone.tsx`, `components/InsightCard.tsx`, `components/Chart.tsx`, `components/FollowupChat.tsx`, `components/Skeleton.tsx`
- `public/demo-data.csv`
- `tests/digest.test.ts`, `tests/api-analyze.test.ts`, `tests/api-followup.test.ts`
- `scripts/generate-demo-csv.ts`
- `README.md`

---

## Task 1: Project bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js app**

Run from `/home/anthony/Projects/csv-insights`:

```bash
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm --no-eslint --turbopack --yes
```

Expected: a working Next.js 15 app in the current directory. If pnpm isn't installed, use `npm create next-app@latest .` with the same flags.

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add @anthropic-ai/sdk papaparse recharts zod
pnpm add -D @types/papaparse vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to the `scripts` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 6: Confirm dev server boots**

```bash
pnpm dev
```

Expected: server starts on http://localhost:3000 with the default Next.js page. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app with deps and vitest"
```

---

## Task 2: Generate the demo CSV

**Files:**
- Create: `scripts/generate-demo-csv.ts`
- Create: `public/demo-data.csv`

- [ ] **Step 1: Write the generator script**

Create `scripts/generate-demo-csv.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Row = {
  date: string;
  region: string;
  category: string;
  customer_segment: string;
  units: number;
  revenue: number;
};

const regions = ['Northeast', 'Southeast', 'Midwest', 'West'];
const categories = ['Apparel', 'Electronics', 'Home', 'Outdoor', 'Beauty'];
const segments = ['New', 'Returning', 'Loyalty'];

function seasonality(month: number): number {
  // Higher Q4, lower Q1
  return 1 + 0.4 * Math.sin(((month - 9) / 12) * Math.PI * 2);
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generate(): Row[] {
  const rows: Row[] = [];
  const start = new Date('2025-06-01');
  for (let d = 0; d < 365; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const month = date.getMonth() + 1;
    for (const region of regions) {
      for (const category of categories) {
        // Deliberate anomaly: Northeast Outdoor spikes in August 2025
        const anomaly =
          region === 'Northeast' &&
          category === 'Outdoor' &&
          date.getFullYear() === 2025 &&
          date.getMonth() === 7
            ? 3.5
            : 1;
        const segment = segments[Math.floor(Math.random() * segments.length)];
        const units = Math.round(rand(5, 40) * seasonality(month) * anomaly);
        const unitPrice = rand(15, 120);
        const revenue = Math.round(units * unitPrice * 100) / 100;
        rows.push({
          date: date.toISOString().slice(0, 10),
          region,
          category,
          customer_segment: segment,
          units,
          revenue,
        });
      }
    }
  }
  return rows;
}

function toCSV(rows: Row[]): string {
  const headers = ['date', 'region', 'category', 'customer_segment', 'units', 'revenue'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [r.date, r.region, r.category, r.customer_segment, r.units, r.revenue].join(','),
    );
  }
  return lines.join('\n');
}

const out = join(process.cwd(), 'public', 'demo-data.csv');
writeFileSync(out, toCSV(generate()));
console.log(`Wrote ${out}`);
```

- [ ] **Step 2: Run the generator**

```bash
pnpm tsx scripts/generate-demo-csv.ts
```

If `tsx` is not available, install it: `pnpm add -D tsx`, then re-run.

Expected: writes `public/demo-data.csv` with ~7300 rows. Spot check:

```bash
head -5 public/demo-data.csv && wc -l public/demo-data.csv
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-demo-csv.ts public/demo-data.csv package.json
git commit -m "feat: add synthetic demo CSV with seasonality and anomaly"
```

---

## Task 3: Digest builder

**Files:**
- Create: `lib/digest.ts`
- Test: `tests/digest.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/digest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDigest, type Digest } from '@/lib/digest';

const numericRows = [
  { a: '1', b: 'x' },
  { a: '2', b: 'y' },
  { a: '3', b: 'x' },
  { a: '', b: 'z' },
];

describe('buildDigest', () => {
  it('infers numeric vs string types', () => {
    const d = buildDigest(numericRows);
    expect(d.columns.find((c) => c.name === 'a')?.type).toBe('number');
    expect(d.columns.find((c) => c.name === 'b')?.type).toBe('string');
  });

  it('computes summary stats for numeric columns', () => {
    const d = buildDigest(numericRows);
    const a = d.columns.find((c) => c.name === 'a')!;
    expect(a.min).toBe(1);
    expect(a.max).toBe(3);
    expect(a.mean).toBeCloseTo(2);
    expect(a.nullCount).toBe(1);
  });

  it('computes distinct count for string columns', () => {
    const d = buildDigest(numericRows);
    const b = d.columns.find((c) => c.name === 'b')!;
    expect(b.distinctCount).toBe(3);
  });

  it('caps sample rows at 20', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ a: String(i) }));
    const d = buildDigest(rows);
    expect(d.sampleRows.length).toBe(20);
  });

  it('reports total row count', () => {
    const rows = Array.from({ length: 57 }, () => ({ a: '1' }));
    const d = buildDigest(rows);
    expect(d.rowCount).toBe(57);
  });

  it('detects date-shaped columns as type "date"', () => {
    const rows = [{ d: '2025-06-01' }, { d: '2025-06-02' }];
    const digest = buildDigest(rows);
    expect(digest.columns.find((c) => c.name === 'd')?.type).toBe('date');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm test tests/digest.test.ts
```

Expected: FAIL — `buildDigest` not defined.

- [ ] **Step 3: Implement digest builder**

Create `lib/digest.ts`:

```ts
export type ColumnType = 'number' | 'string' | 'date' | 'boolean';

export type ColumnSummary = {
  name: string;
  type: ColumnType;
  nullCount: number;
  distinctCount?: number;
  min?: number;
  max?: number;
  mean?: number;
};

export type Digest = {
  rowCount: number;
  columns: ColumnSummary[];
  sampleRows: Record<string, unknown>[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function inferType(values: unknown[]): ColumnType {
  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let total = 0;
  for (const v of values) {
    if (isEmpty(v)) continue;
    total++;
    const s = String(v).trim();
    if (s === 'true' || s === 'false') boolCount++;
    if (!Number.isNaN(Number(s)) && s !== '') numCount++;
    if (DATE_RE.test(s)) dateCount++;
  }
  if (total === 0) return 'string';
  if (dateCount / total > 0.8) return 'date';
  if (boolCount / total > 0.8) return 'boolean';
  if (numCount / total > 0.8) return 'number';
  return 'string';
}

function summarizeColumn(name: string, values: unknown[]): ColumnSummary {
  const type = inferType(values);
  const nullCount = values.filter(isEmpty).length;
  const nonNull = values.filter((v) => !isEmpty(v));
  const base: ColumnSummary = { name, type, nullCount };

  if (type === 'number') {
    const nums = nonNull.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (nums.length > 0) {
      base.min = Math.min(...nums);
      base.max = Math.max(...nums);
      base.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
  } else {
    base.distinctCount = new Set(nonNull.map(String)).size;
  }

  return base;
}

export function buildDigest(rows: Record<string, unknown>[]): Digest {
  if (rows.length === 0) {
    return { rowCount: 0, columns: [], sampleRows: [] };
  }
  const columnNames = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r))),
  );
  const columns = columnNames.map((name) =>
    summarizeColumn(name, rows.map((r) => r[name])),
  );
  const sampleRows = rows.slice(0, 20);
  return { rowCount: rows.length, columns, sampleRows };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test tests/digest.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/digest.ts tests/digest.test.ts
git commit -m "feat: add digest builder with type inference and summary stats"
```

---

## Task 4: Zod schemas

**Files:**
- Create: `lib/schemas.ts`

- [ ] **Step 1: Create the schema file**

Create `lib/schemas.ts`:

```ts
import { z } from 'zod';

export const InsightSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  why_it_matters: z.string().min(1).max(200),
});

export const ChartSpecSchema = z.object({
  type: z.enum(['bar', 'line', 'pie']),
  title: z.string().min(1).max(120),
  x_column: z.string().min(1),
  y_column: z.string().min(1),
  group_by: z.string().nullable().optional(),
});

export const AnalyzeResponseSchema = z.object({
  insights: z.array(InsightSchema).min(3).max(5),
  suggested_charts: z.array(ChartSpecSchema).min(2).max(3),
  followup_questions: z.array(z.string().min(1).max(160)).length(3),
});

export const FollowupResponseSchema = z.object({
  answer: z.string().min(1).max(1200),
});

export type Insight = z.infer<typeof InsightSchema>;
export type ChartSpec = z.infer<typeof ChartSpecSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type FollowupResponse = z.infer<typeof FollowupResponseSchema>;
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/schemas.ts
git commit -m "feat: add zod schemas for analyze and followup responses"
```

---

## Task 5: Anthropic wrapper and prompts

**Files:**
- Create: `lib/anthropic.ts`
- Create: `lib/prompts.ts`

- [ ] **Step 1: Create the SDK wrapper**

Create `lib/anthropic.ts`:

```ts
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
```

- [ ] **Step 2: Create the prompts module**

Create `lib/prompts.ts`:

```ts
import type { Digest } from './digest';

export const SYSTEM = `You are a senior data analyst. Given a digest of a CSV file (columns, types, summary stats, and sample rows), you return concise, non-obvious insights that a business owner would find immediately valuable. Always return valid JSON matching the requested schema. Never include preamble or trailing commentary outside the JSON.`;

export function digestBlock(digest: Digest): string {
  return `CSV DIGEST
Total rows: ${digest.rowCount}

Columns:
${digest.columns
  .map((c) => {
    const parts = [`- ${c.name} (${c.type})`];
    if (c.type === 'number' && c.min !== undefined) {
      parts.push(`min=${c.min}`, `max=${c.max}`, `mean=${c.mean?.toFixed(2)}`);
    }
    if (c.distinctCount !== undefined) parts.push(`distinct=${c.distinctCount}`);
    parts.push(`nulls=${c.nullCount}`);
    return parts.join(' ');
  })
  .join('\n')}

Sample rows (first 20):
${JSON.stringify(digest.sampleRows, null, 2)}`;
}

export const ANALYZE_USER = `Return a JSON object with this exact shape:
{
  "insights": [ // 3 to 5 items
    {
      "title": "short headline",
      "description": "2-3 sentences explaining the insight in plain English",
      "why_it_matters": "one sentence on the business implication"
    }
  ],
  "suggested_charts": [ // 2 or 3 items
    {
      "type": "bar" | "line" | "pie",
      "title": "chart title",
      "x_column": "column name",
      "y_column": "column name",
      "group_by": "optional column name or null"
    }
  ],
  "followup_questions": [ // exactly 3
    "question text"
  ]
}

Prioritize insights that are non-obvious, quantitative where possible, and concrete (cite columns and values). Pick charts that match the data shape — line for time series, bar for categorical comparisons, pie only for parts-of-whole with <8 categories.`;

export function followupUser(question: string): string {
  return `The user asked: "${question}"

Answer using the digest above. Be concise (2-4 sentences). Cite specific columns or values when relevant. If the digest is insufficient to answer, say so plainly.

Return JSON: { "answer": "..." }`;
}
```

- [ ] **Step 3: Verify compile**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/anthropic.ts lib/prompts.ts
git commit -m "feat: add anthropic client wrapper and prompts"
```

---

## Task 6: `/api/analyze` route

**Files:**
- Create: `app/api/analyze/route.ts`
- Test: `tests/api-analyze.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api-analyze.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm test tests/api-analyze.test.ts
```

Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `app/api/analyze/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClient, MODEL, MAX_TOKENS, extractJSON } from '@/lib/anthropic';
import { AnalyzeResponseSchema } from '@/lib/schemas';
import { ANALYZE_USER, SYSTEM, digestBlock } from '@/lib/prompts';

const RequestSchema = z.object({
  digest: z.object({
    rowCount: z.number(),
    columns: z.array(z.any()),
    sampleRows: z.array(z.any()),
  }),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
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
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test tests/api-analyze.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze/route.ts tests/api-analyze.test.ts
git commit -m "feat: add /api/analyze with zod validation and one-retry"
```

---

## Task 7: `/api/followup` route

**Files:**
- Create: `app/api/followup/route.ts`
- Test: `tests/api-followup.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/api-followup.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm test tests/api-followup.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the route**

Create `app/api/followup/route.ts`:

```ts
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
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test tests/api-followup.test.ts
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/followup/route.ts tests/api-followup.test.ts
git commit -m "feat: add /api/followup with prompt caching on digest"
```

---

## Task 8: Global theme and typography

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/globals.css` with the demo theme**

Overwrite `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f0d0a;
  --color-bg-elev: #1a1612;
  --color-fg: #f5f0e8;
  --color-fg-muted: #a39e94;
  --color-accent: #ff7a45;
  --color-accent-dim: #d35a2a;
  --color-border: #2a241d;

  --font-display: 'Inter', system-ui, sans-serif;
}

html, body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-display);
  font-feature-settings: 'cv11', 'ss01';
  letter-spacing: -0.01em;
}

* { border-color: var(--color-border); }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-up { animation: fade-up 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both; }
```

- [ ] **Step 2: Update `app/layout.tsx`**

Overwrite `app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Drop a CSV. Get insights in seconds.',
  description: 'AI-generated insights and charts from your CSV data, instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Boot dev server, eyeball the colors**

```bash
pnpm dev
```

Visit http://localhost:3000. The page is still the Next.js default — but on the warm off-black background. Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: warm off-black theme with inter and fade-up animation"
```

---

## Task 9: Dropzone component

**Files:**
- Create: `components/Dropzone.tsx`

- [ ] **Step 1: Implement the dropzone**

Create `components/Dropzone.tsx`:

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { buildDigest, type Digest } from '@/lib/digest';

type Props = {
  onDigest: (digest: Digest) => void;
  onError: (message: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

export function Dropzone({ onDigest, onError }: Props) {
  const [hover, setHover] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_BYTES) {
        onError('File is over 5MB. This demo is limited to smaller files.');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onError('Please upload a .csv file.');
        return;
      }
      setWorking(true);
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setWorking(false);
          if (results.errors.length > 0) {
            onError('Could not parse that CSV. Try the demo file?');
            return;
          }
          if (results.data.length > MAX_ROWS) {
            onError('File has over 10,000 rows. This demo is capped lower.');
            return;
          }
          onDigest(buildDigest(results.data));
        },
        error: () => {
          setWorking(false);
          onError('Could not read that file.');
        },
      });
    },
    [onDigest, onError],
  );

  const useDemoFile = useCallback(async () => {
    setWorking(true);
    try {
      const res = await fetch('/demo-data.csv');
      const text = await res.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      setWorking(false);
      onDigest(buildDigest(parsed.data));
    } catch {
      setWorking(false);
      onError('Could not load demo file.');
    }
  }, [onDigest, onError]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition ${
        hover ? 'border-[--color-accent] bg-[--color-bg-elev]' : 'border-[--color-border]'
      }`}
    >
      <p className="text-2xl font-medium">Drop a CSV. Get insights in seconds.</p>
      <p className="mt-2 text-[--color-fg-muted]">
        Up to 5MB / 10,000 rows. Your file never leaves the browser unparsed.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className="rounded-lg bg-[--color-accent] px-5 py-3 font-medium text-black transition hover:bg-[--color-accent-dim] disabled:opacity-50"
        >
          {working ? 'Working…' : 'Choose CSV file'}
        </button>
        <button
          type="button"
          onClick={useDemoFile}
          disabled={working}
          className="rounded-lg border border-[--color-border] px-5 py-3 font-medium hover:border-[--color-accent] disabled:opacity-50"
        >
          Try a demo file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Dropzone.tsx
git commit -m "feat: add CSV dropzone with size and row guards"
```

---

## Task 10: Insight card component

**Files:**
- Create: `components/InsightCard.tsx`

- [ ] **Step 1: Implement the card**

Create `components/InsightCard.tsx`:

```tsx
import type { Insight } from '@/lib/schemas';

type Props = {
  insight: Insight;
  index: number;
};

export function InsightCard({ insight, index }: Props) {
  return (
    <article
      className="fade-up rounded-2xl border border-[--color-border] bg-[--color-bg-elev] p-6 transition hover:-translate-y-0.5 hover:border-[--color-accent]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <h3 className="text-lg font-semibold">{insight.title}</h3>
      <p className="mt-3 text-[--color-fg-muted]">{insight.description}</p>
      <p className="mt-4 border-t border-[--color-border] pt-3 text-sm uppercase tracking-wide text-[--color-accent]">
        Why it matters
      </p>
      <p className="mt-1 text-sm">{insight.why_it_matters}</p>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/InsightCard.tsx
git commit -m "feat: add insight card with hover lift and staggered fade"
```

---

## Task 11: Chart component

**Files:**
- Create: `components/Chart.tsx`

- [ ] **Step 1: Implement the chart switcher**

Create `components/Chart.tsx`:

```tsx
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartSpec } from '@/lib/schemas';

type Props = {
  spec: ChartSpec;
  rows: Record<string, unknown>[];
};

const ACCENT = '#ff7a45';
const PALETTE = ['#ff7a45', '#f5a623', '#d4d8c5', '#7fb069', '#5d737e'];

function aggregate(
  rows: Record<string, unknown>[],
  xKey: string,
  yKey: string,
  groupKey?: string | null,
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const x = String(r[xKey] ?? '');
    const y = Number(r[yKey] ?? 0);
    if (Number.isNaN(y)) continue;
    const bucket = map.get(x) ?? {};
    if (groupKey) {
      const g = String(r[groupKey] ?? 'other');
      bucket[g] = (bucket[g] ?? 0) + y;
    } else {
      bucket.value = (bucket.value ?? 0) + y;
    }
    map.set(x, bucket);
  }
  return Array.from(map.entries())
    .map(([x, vals]) => ({ [xKey]: x, ...vals }))
    .sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
}

export function Chart({ spec, rows }: Props) {
  const data = aggregate(rows, spec.x_column, spec.y_column, spec.group_by ?? null);
  const groupKeys =
    spec.group_by
      ? Array.from(
          new Set(rows.map((r) => String(r[spec.group_by as string] ?? 'other'))),
        )
      : ['value'];

  return (
    <div className="fade-up rounded-2xl border border-[--color-border] bg-[--color-bg-elev] p-6">
      <h3 className="mb-4 text-lg font-semibold">{spec.title}</h3>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          {spec.type === 'bar' && (
            <BarChart data={data}>
              <CartesianGrid stroke="#2a241d" strokeDasharray="3 3" />
              <XAxis dataKey={spec.x_column} stroke="#a39e94" tick={{ fontSize: 11 }} />
              <YAxis stroke="#a39e94" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1612', border: '1px solid #2a241d' }}
              />
              {groupKeys.length > 1 && <Legend />}
              {groupKeys.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="a"
                  fill={PALETTE[i % PALETTE.length]}
                  animationDuration={900}
                />
              ))}
            </BarChart>
          )}
          {spec.type === 'line' && (
            <LineChart data={data}>
              <CartesianGrid stroke="#2a241d" strokeDasharray="3 3" />
              <XAxis dataKey={spec.x_column} stroke="#a39e94" tick={{ fontSize: 11 }} />
              <YAxis stroke="#a39e94" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1612', border: '1px solid #2a241d' }}
              />
              {groupKeys.length > 1 && <Legend />}
              {groupKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={900}
                />
              ))}
            </LineChart>
          )}
          {spec.type === 'pie' && (
            <PieChart>
              <Tooltip
                contentStyle={{ background: '#1a1612', border: '1px solid #2a241d' }}
              />
              <Pie
                data={data}
                dataKey={groupKeys[0]}
                nameKey={spec.x_column}
                outerRadius={110}
                animationDuration={900}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Chart.tsx
git commit -m "feat: add chart component with bar/line/pie and animations"
```

---

## Task 12: Follow-up chat component

**Files:**
- Create: `components/FollowupChat.tsx`

- [ ] **Step 1: Implement the chat**

Create `components/FollowupChat.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { Digest } from '@/lib/digest';

type Turn = { role: 'user' | 'assistant'; text: string };

type Props = {
  digest: Digest;
  seedQuestions: string[];
};

export function FollowupChat({ digest, seedQuestions }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    setTurns((t) => [...t, { role: 'user', text: question }]);
    setInput('');
    setPending(true);
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ digest, question }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = (await res.json()) as { answer: string };
      setTurns((t) => [...t, { role: 'assistant', text: data.answer }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: 'Something went wrong. Try again?' },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="fade-up rounded-2xl border border-[--color-border] bg-[--color-bg-elev] p-6">
      <h3 className="text-lg font-semibold">Ask anything about this data</h3>

      {turns.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {seedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-[--color-border] px-3 py-1.5 text-sm text-[--color-fg-muted] hover:border-[--color-accent] hover:text-[--color-fg]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              t.role === 'user'
                ? 'ml-auto max-w-[80%] bg-[--color-accent-dim] text-black'
                : 'mr-auto max-w-[80%] border border-[--color-border]'
            }`}
          >
            {t.text}
          </div>
        ))}
        {pending && (
          <div className="mr-auto max-w-[80%] rounded-lg border border-[--color-border] px-3 py-2 text-sm text-[--color-fg-muted]">
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-[--color-border] bg-transparent px-3 py-2 text-sm outline-none focus:border-[--color-accent]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FollowupChat.tsx
git commit -m "feat: add followup chat with seed questions"
```

---

## Task 13: Skeleton component

**Files:**
- Create: `components/Skeleton.tsx`

- [ ] **Step 1: Implement skeletons**

Create `components/Skeleton.tsx`:

```tsx
export function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]"
        />
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-72 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]" />
      <div className="h-72 animate-pulse rounded-2xl border border-[--color-border] bg-[--color-bg-elev]" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Skeleton.tsx
git commit -m "feat: add loading skeletons"
```

---

## Task 14: Main page wiring

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Overwrite `app/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Dropzone } from '@/components/Dropzone';
import { InsightCard } from '@/components/InsightCard';
import { Chart } from '@/components/Chart';
import { FollowupChat } from '@/components/FollowupChat';
import { InsightsSkeleton, ChartsSkeleton } from '@/components/Skeleton';
import type { Digest } from '@/lib/digest';
import type { AnalyzeResponse } from '@/lib/schemas';

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; digest: Digest }
  | { kind: 'error'; message: string; digest?: Digest }
  | { kind: 'ready'; digest: Digest; result: AnalyzeResponse; rawRows: Record<string, unknown>[] };

const CAL_LINK = 'https://cal.com/your-handle/15min';

export default function Home() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function analyze(digest: Digest) {
    setState({ kind: 'loading', digest });
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ digest }),
      });
      if (!res.ok) throw new Error('request failed');
      const result = (await res.json()) as AnalyzeResponse;
      setState({
        kind: 'ready',
        digest,
        result,
        rawRows: digest.sampleRows,
      });
    } catch {
      setState({
        kind: 'error',
        message: 'We could not generate insights. Please try again.',
        digest,
      });
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <p className="text-sm uppercase tracking-widest text-[--color-accent]">
          Demo
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Turn a CSV into a board-ready brief in seconds.
        </h1>
      </header>

      {state.kind === 'idle' && (
        <Dropzone
          onDigest={analyze}
          onError={(message) => setState({ kind: 'error', message })}
        />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-6">
          <InsightsSkeleton />
          <ChartsSkeleton />
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-[--color-border] bg-[--color-bg-elev] p-6 text-center">
          <p className="text-lg">{state.message}</p>
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="mt-4 rounded-lg bg-[--color-accent] px-4 py-2 text-sm font-medium text-black"
          >
            Try again
          </button>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-widest text-[--color-fg-muted]">
              Insights
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {state.result.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm uppercase tracking-widest text-[--color-fg-muted]">
              Charts
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {state.result.suggested_charts.map((spec, i) => (
                <Chart key={i} spec={spec} rows={state.rawRows} />
              ))}
            </div>
          </section>

          <FollowupChat
            digest={state.digest}
            seedQuestions={state.result.followup_questions}
          />

          <div className="rounded-2xl border border-[--color-accent] bg-[--color-bg-elev] p-6 text-center">
            <p className="text-lg">
              Want this on your data, automated, in your stack?
            </p>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-[--color-accent] px-5 py-3 font-medium text-black hover:bg-[--color-accent-dim]"
            >
              Book a 15-min call →
            </a>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              className="text-sm text-[--color-fg-muted] hover:text-[--color-fg]"
            >
              Analyze another file
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Important — the rendered charts need the full row set, not just sample rows**

Sample rows in the digest are capped at 20. For the charts to look real, the page needs the full parsed CSV. Update the data flow:

In `components/Dropzone.tsx`, change the `Props` type and both call sites of `onDigest` to also pass `rawRows`:

```tsx
type Props = {
  onDigest: (digest: Digest, rawRows: Record<string, unknown>[]) => void;
  onError: (message: string) => void;
};
```

In the `Papa.parse` complete callback:

```tsx
onDigest(buildDigest(results.data), results.data);
```

In `useDemoFile`:

```tsx
onDigest(buildDigest(parsed.data), parsed.data);
```

In `app/page.tsx`, update `analyze` to accept and store the full rows:

```tsx
async function analyze(digest: Digest, rawRows: Record<string, unknown>[]) {
  setState({ kind: 'loading', digest });
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ digest }),
    });
    if (!res.ok) throw new Error('request failed');
    const result = (await res.json()) as AnalyzeResponse;
    setState({ kind: 'ready', digest, result, rawRows });
  } catch {
    setState({
      kind: 'error',
      message: 'We could not generate insights. Please try again.',
      digest,
    });
  }
}
```

And the Dropzone callsite:

```tsx
<Dropzone
  onDigest={analyze}
  onError={(message) => setState({ kind: 'error', message })}
/>
```

- [ ] **Step 3: Run the dev server and visit the page**

```bash
pnpm dev
```

Visit http://localhost:3000. Click "Try a demo file". You should see:
- Skeleton loaders briefly
- 3-5 insight cards fade in
- 2-3 charts render
- Follow-up chat with three suggested questions
- CTA section

If `ANTHROPIC_API_KEY` is not set yet, copy `.env.local.example` to `.env.local` and paste your key.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/Dropzone.tsx
git commit -m "feat: wire main page with idle/loading/error/ready states"
```

---

## Task 15: Polish pass

**Files:**
- Modify: `app/page.tsx` (tagline copy, spacing tweaks)
- Modify: any component that looks off after a real-data run

- [ ] **Step 1: Run a real end-to-end pass**

```bash
pnpm dev
```

Walk through the full flow using the demo CSV. Note any visual problems:

- Are insight titles wrapping awkwardly? Tighten font size or grid layout.
- Are charts squished on narrower viewports? Adjust `md:grid-cols-2` to `lg:grid-cols-2`.
- Is the loading state too fast to read? It's fine — leave it.
- Are colors too saturated in the accent? Adjust `--color-accent` in `globals.css`.
- Does the demo CSV produce a "wow" insight (Northeast Outdoor August spike)? If not, regenerate the CSV with a stronger anomaly multiplier in `scripts/generate-demo-csv.ts`.

- [ ] **Step 2: Fix what looks off**

Make small targeted edits. No new features. No new dependencies.

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "polish: tightened copy, spacing, and demo data anomaly"
```

---

## Task 16: README and deploy to Vercel

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# CSV Insights Demo

A polished public web demo: drop a CSV, get AI-generated insights and charts. Built to convert non-technical SMB buyers into discovery calls.

## Local development

1. Copy `.env.local.example` to `.env.local` and add your `ANTHROPIC_API_KEY`.
2. `pnpm install`
3. `pnpm dev` and open http://localhost:3000

## Tests

```bash
pnpm test
```

## Deploy

This is a standard Next.js app. To deploy on Vercel:

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add `ANTHROPIC_API_KEY` as an environment variable in project settings.
4. Deploy.

## Notes

- The demo is desktop-first. Mobile layouts are deliberately not optimized.
- The demo file is at `public/demo-data.csv` — synthetic e-commerce data with a built-in anomaly.
- Limits: 5MB / 10,000 rows per upload. Files never persist; everything is ephemeral.
```

- [ ] **Step 2: Push to GitHub**

```bash
git add README.md
git commit -m "docs: add README"
gh repo create csv-insights --public --source=. --push
```

If `gh` isn't installed, create the repo manually on GitHub and `git remote add origin ...` + `git push -u origin main`.

- [ ] **Step 3: Deploy on Vercel**

```bash
pnpm dlx vercel
```

Follow the prompts: link to the GitHub repo, accept defaults. Then add the env var in the dashboard (Project → Settings → Environment Variables → `ANTHROPIC_API_KEY`) and redeploy:

```bash
pnpm dlx vercel --prod
```

- [ ] **Step 4: Smoke test the deployed URL**

Visit the `.vercel.app` URL. Try the demo file. Confirm:

- Insights appear within ~10s
- Charts render and animate
- Follow-up question returns an answer
- Cal.com link is correct (or placeholder — replace before sending to prospects)

- [ ] **Step 5: Final commit**

If anything changed:

```bash
git add -A
git commit -m "chore: deployment tweaks"
git push
```

---

## Success criteria (verify before claiming done)

- [ ] Cold visit to deployed URL renders the landing in under 1 second.
- [ ] Demo CSV produces at least one non-obvious insight every run.
- [ ] First insights appear within 8 seconds of upload click.
- [ ] Follow-up question returns within 4 seconds.
- [ ] All Vitest tests pass.
- [ ] `tsc --noEmit` is clean.
- [ ] CTA link points to your real Cal.com page (not the placeholder).
- [ ] Site looks polished on a 1440px-wide desktop screen.
