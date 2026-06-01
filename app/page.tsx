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

  async function analyze(
    digest: Digest,
    rawRows: Record<string, unknown>[],
    isDemo?: boolean,
  ) {
    setState({ kind: 'loading', digest });
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ digest, demo: isDemo }),
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <p className="text-sm uppercase tracking-widest text-[var(--color-accent)]">
          Demo
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Turn a CSV into a board-ready brief in seconds.
        </h1>
      </header>

      {state.kind === 'idle' && (
        <Dropzone
          onDigestAction={analyze}
          onErrorAction={(message) => setState({ kind: 'error', message })}
        />
      )}

      {state.kind === 'loading' && (
        <div className="space-y-6">
          <InsightsSkeleton />
          <ChartsSkeleton />
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-center">
          <p className="text-lg">{state.message}</p>
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black"
          >
            Try again
          </button>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-widest text-[var(--color-fg-muted)]">
              Insights
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {state.result.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm uppercase tracking-widest text-[var(--color-fg-muted)]">
              Charts
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {state.result.suggested_charts.map((spec, i) => (
                <div key={i} className={i === 0 ? 'md:col-span-2' : ''}>
                  <Chart spec={spec} rows={state.rawRows} />
                </div>
              ))}
            </div>
          </section>

          <FollowupChat
            digest={state.digest}
            seedQuestions={state.result.followup_questions}
          />

          <div className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-bg-elev)] p-6 text-center">
            <p className="text-lg">
              Want this on your data, automated, in your stack?
            </p>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-3 font-medium text-black hover:bg-[var(--color-accent-dim)]"
            >
              Book a 15-min call →
            </a>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Analyze another file
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
