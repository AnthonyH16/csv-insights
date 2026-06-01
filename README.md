# CSV Insights Demo

Drop a CSV, get AI-generated insights and charts. Built as a sales asset to convert SMB buyers into discovery calls.

## Local development

1. Copy `.env.local.example` to `.env.local` and add your `ANTHROPIC_API_KEY`.
2. `pnpm install`
3. `pnpm dev` and open http://localhost:3000

## Tests

```bash
pnpm test
```

## Regenerating the cached demo response

The "Try a demo file" button serves a precomputed response from `public/demo-result.json` to keep cost and latency deterministic. To regenerate it (e.g., after editing the prompts or the demo CSV):

```bash
pnpm tsx --env-file=.env.local scripts/generate-demo-response.ts
```

## Deploy

Standard Next.js app. On Vercel:

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add `ANTHROPIC_API_KEY` as an environment variable in project settings.
4. Deploy.

## Notes

- Desktop-first. Mobile layouts deliberately not optimized.
- Upload cap: 5MB / 10,000 rows. Files never persist.
- Demo file path is cached; live uploads hit Claude.
