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
