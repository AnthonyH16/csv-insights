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
