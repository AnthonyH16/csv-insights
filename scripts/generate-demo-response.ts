import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import { buildDigest } from '../lib/digest';
import {
  getClient,
  MODEL,
  MAX_TOKENS,
  extractJSON,
} from '../lib/anthropic';
import { AnalyzeResponseSchema } from '../lib/schemas';
import { ANALYZE_USER, SYSTEM, digestBlock } from '../lib/prompts';

async function main() {
  const csvPath = join(process.cwd(), 'public', 'demo-data.csv');
  const csv = readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const digest = buildDigest(parsed.data);

  console.log(`Built digest: ${digest.rowCount} rows, ${digest.columns.length} columns, ${digest.sampleRows.length} sample rows, ${digest.topRows.length} top rows.`);
  console.log(`Calling Claude (${MODEL})...`);

  const client = getClient();
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
            text: digestBlock(digest),
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: ANALYZE_USER },
        ],
      },
    ],
  });

  const json = extractJSON(message);
  const result = AnalyzeResponseSchema.parse(json);

  writeFileSync(
    join(process.cwd(), 'public', 'demo-digest.json'),
    JSON.stringify(digest, null, 2),
  );
  writeFileSync(
    join(process.cwd(), 'public', 'demo-result.json'),
    JSON.stringify(result, null, 2),
  );

  console.log('Saved public/demo-digest.json and public/demo-result.json');
  console.log(`Cached ${result.insights.length} insights, ${result.suggested_charts.length} charts, ${result.followup_questions.length} questions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
