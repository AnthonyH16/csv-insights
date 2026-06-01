import type { Insight } from '@/lib/schemas';

type Props = {
  insight: Insight;
  index: number;
};

export function InsightCard({ insight, index }: Props) {
  return (
    <article
      className="fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <h3 className="text-lg font-semibold">{insight.title}</h3>
      <p className="mt-3 text-[var(--color-fg-muted)]">{insight.description}</p>
      <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-sm uppercase tracking-wide text-[var(--color-accent)]">
        Why it matters
      </p>
      <p className="mt-1 text-sm">{insight.why_it_matters}</p>
    </article>
  );
}
