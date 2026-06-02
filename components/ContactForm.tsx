'use client';

import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          message,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-bg-elev)] p-6 text-center">
        <p className="text-lg font-medium">Thanks — message received.</p>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          I&apos;ll get back to you within a business day.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full flex-col rounded-2xl border border-[var(--color-accent)] bg-[var(--color-bg-elev)] p-6"
    >
      <p className="mb-1 text-lg font-medium">Prefer to send a message?</p>
      <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
        Tell me what you&apos;re trying to solve. I&apos;ll reply within a business day.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <input
        type="text"
        placeholder="Company (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="mt-3 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />

      <textarea
        required
        rows={4}
        placeholder="What kind of data are you working with, and what would you like to know about it?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="mt-3 flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        {status === 'error' && (
          <p className="text-sm text-[var(--color-accent)]">
            Something went wrong. Try again or use the booking link.
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'sending' || !name || !email || !message}
          className="ml-auto rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-black transition hover:bg-[var(--color-accent-dim)] disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
