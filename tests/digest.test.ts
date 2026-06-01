import { describe, it, expect } from 'vitest';
import { buildDigest } from '@/lib/digest';

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

  it('caps sample rows at 30', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ a: String(i) }));
    const d = buildDigest(rows);
    expect(d.sampleRows.length).toBe(30);
  });

  it('returns top rows sorted by the largest numeric column', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      label: `r${i}`,
      score: String(i),
    }));
    const d = buildDigest(rows);
    expect(d.topRowsSortKey).toBe('score');
    expect(d.topRows.length).toBe(15);
    expect(Number(d.topRows[0].score)).toBe(49);
    expect(Number(d.topRows[14].score)).toBe(35);
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
