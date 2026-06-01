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

const PALETTE = ['#ff7a45', '#f5a623', '#d4d8c5', '#7fb069', '#5d737e'];

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
}

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

  const barChart = (
    <BarChart data={data}>
      <CartesianGrid stroke="#2a241d" strokeDasharray="3 3" />
      <XAxis dataKey={spec.x_column} stroke="#a39e94" tick={{ fontSize: 11 }} />
      <YAxis stroke="#a39e94" tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={50} />
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
  );

  const lineChart = (
    <LineChart data={data}>
      <CartesianGrid stroke="#2a241d" strokeDasharray="3 3" />
      <XAxis dataKey={spec.x_column} stroke="#a39e94" tick={{ fontSize: 11 }} />
      <YAxis stroke="#a39e94" tick={{ fontSize: 11 }} tickFormatter={compactNumber} width={50} />
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
  );

  const pieChart = (
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
  );

  const chart =
    spec.type === 'bar' ? barChart : spec.type === 'line' ? lineChart : pieChart;

  return (
    <div className="fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
      <h3 className="mb-4 text-lg font-semibold">{spec.title}</h3>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>{chart}</ResponsiveContainer>
      </div>
    </div>
  );
}
