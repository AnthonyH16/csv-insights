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
