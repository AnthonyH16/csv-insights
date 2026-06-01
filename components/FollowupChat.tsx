'use client';

import { useState } from 'react';
import type { Digest } from '@/lib/digest';

type Turn = { role: 'user' | 'assistant'; text: string };

type Props = {
  digest: Digest;
  seedQuestions: string[];
};

export function FollowupChat({ digest, seedQuestions }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    setTurns((t) => [...t, { role: 'user', text: question }]);
    setInput('');
    setPending(true);
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ digest, question }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = (await res.json()) as { answer: string };
      setTurns((t) => [...t, { role: 'assistant', text: data.answer }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: 'Something went wrong. Try again?' },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6">
      <h3 className="text-lg font-semibold">Ask anything about this data</h3>

      {turns.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {seedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              t.role === 'user'
                ? 'ml-auto max-w-[80%] bg-[var(--color-accent-dim)] text-black'
                : 'mr-auto max-w-[80%] border border-[var(--color-border)]'
            }`}
          >
            {t.text}
          </div>
        ))}
        {pending && (
          <div className="mr-auto max-w-[80%] rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-fg-muted)]">
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
