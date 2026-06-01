# CSV Insights Demo — Design

**Purpose:** A polished, public web demo that converts non-technical SMB buyers into discovery calls. Drop a CSV, get instant AI-generated insights and charts. The product is a *sales asset*, not a product to scale — its success metric is "% of visitors who book a call," not retention or revenue.

**Ship target:** 2 working days.

---

## Architecture

Single Next.js 15 (App Router) app deployed on Vercel.

**Data flow:**

1. User drops a CSV → parsed client-side with PapaParse.
2. Frontend builds a *digest*: column names, inferred types, per-column summary stats (min/max/mean/distinct count/null count), and 20 sample rows.
3. Frontend POSTs the digest (not the full file) to `/api/analyze`.
4. API route calls Claude (`claude-sonnet-4-6`) with a prompt that specifies the exact JSON shape to return. Anthropic prompt caching is applied to the digest so follow-up turns reuse it.
5. Server validates response with Zod, returns `{insights, suggested_charts, followup_questions}`.
6. Frontend renders insights cards + Recharts charts + a follow-up chat with three suggested questions.
7. Follow-up chat hits `/api/followup` which reuses the cached digest.

**Why digest-not-full-file:** keeps token usage bounded regardless of file size, lets the demo handle 10k-row files without latency or cost spikes, and the buyer cannot tell the difference.

---

## Components

- `app/page.tsx` — landing + upload state, results state, follow-up chat
- `app/api/analyze/route.ts` — first-pass insight generation
- `app/api/followup/route.ts` — follow-up Q&A using cached digest
- `lib/digest.ts` — builds the digest object from parsed rows
- `lib/anthropic.ts` — thin wrapper around the SDK, configures caching
- `lib/schemas.ts` — Zod schemas for API responses
- `components/Dropzone.tsx`
- `components/InsightCard.tsx`
- `components/Chart.tsx` — switches on chart type (bar/line/pie)
- `components/FollowupChat.tsx`
- `components/CTA.tsx` — Cal.com link
- `public/demo-data.csv` — bundled synthetic dataset

---

## Demo dataset

Synthetic 12-month e-commerce sales data with: date, region (4 US regions), product category (5), units, revenue, customer_segment. Includes one deliberate anomaly (e.g., Q3 spike in the Northeast for one category) so Claude produces a "wow" insight on first run. Bundled at `/public/demo-data.csv` with a "Try a demo file" button on the empty state.

---

## v1 features

1. Drag-and-drop CSV upload, with "Try a demo file" button
2. Skeleton loading state while Claude thinks (no spinner)
3. 3-5 plain-English insights, each with a one-line "why this matters"
4. 2-3 auto-generated charts, type chosen by Claude based on data shape
5. Follow-up chat with three suggested seed questions
6. Soft CTA below results linking to Cal.com booking page

## Out of scope for v1

- Auth, accounts, persistence (ephemeral session only)
- Excel/JSON file support (CSV only)
- Files > 5MB / 10k rows (show clear "demo limited" message before upload)
- Saved analyses, sharing, history
- Mobile layouts (desktop-only — buyers demo on laptops)
- Server-side rate limiting or abuse protection beyond Vercel defaults

## Polish (non-negotiable for conversion)

- Warm off-black background with a single bright accent (Linear/Vercel aesthetic), not default Tailwind blue
- Inter Display or comparable typeface, deliberate sizing rhythm
- Charts animate in on render
- Insight cards subtle hover lift
- Single tagline above upload: "Drop a CSV. Get insights in seconds."

---

## Error handling

- File > 5MB: blocked client-side before parse (file.size check), with a friendly message
- File > 10k rows: detected after parse, blocked before sending to API, with a friendly message
- Non-CSV or malformed CSV: friendly error, prompt to try again or use demo file
- Anthropic API error: friendly retry button, log to server for triage
- Zod validation failure on Claude's response: retry once with a stricter prompt; on second failure show generic error

No edge-case handling beyond the above. This is a demo, not infrastructure.

---

## Tech specifics

- **Framework:** Next.js 15 (App Router), TypeScript strict mode
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **CSV parsing:** PapaParse (client-side)
- **LLM:** Anthropic SDK (`@anthropic-ai/sdk`), model `claude-sonnet-4-6`, with prompt caching on the digest
- **Validation:** Zod for API response shapes
- **Deployment:** Vercel free tier, `.vercel.app` subdomain for v1 (custom domain later)
- **Secrets:** `ANTHROPIC_API_KEY` only

Estimated per-analysis cost: $0.02-0.10. Budget to demo to 100 prospects: under $10.

---

## Success criteria

- Demo loads in < 1s on a cold visit
- First insight render in < 8s after CSV upload
- Follow-up question response in < 4s
- Bundled demo CSV produces at least one non-obvious insight on every run
- Buyer can go from landing → seeing insights → clicking "book a call" in under 60 seconds
