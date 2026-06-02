type Item = { q: string; a: string };

const items: Item[] = [
  {
    q: 'How does this actually work?',
    a: 'Your CSV is parsed in your browser. A compact summary — columns, types, summary stats, and a small sample of rows — is sent to Claude (an AI model from Anthropic). Claude returns insights and chart suggestions, and the page renders them. The raw file never leaves your machine.',
  },
  {
    q: 'Is my data private?',
    a: 'The file itself never uploads anywhere. Only the digest goes to the AI, and that traffic is not used to train models. For sensitive data (PII, health, finance) I can set up a deployment that uses zero-retention endpoints or self-hosted models.',
  },
  {
    q: 'How would this work for my business?',
    a: 'Three common patterns: a one-time setup tailored to your data, with a private URL your team can use; a recurring report connected to where your data already lives (Google Sheets, your CRM, a database) and posted to Slack or email; or embedded into a tool you already use, like a Notion page or a Slack bot. Tell me what you have and I will recommend.',
  },
  {
    q: 'What does it cost?',
    a: 'A custom deployment with one of the integration patterns above runs roughly $2-5k for setup and $300-800/month to keep running. Specifics depend on data volume, how often it runs, and where it lives. The AI cost itself is small — usually pennies per report.',
  },
  {
    q: 'What if the AI gets something wrong?',
    a: 'Two safeguards. The prompt forces the AI to cite specific columns and values from your data, which makes hallucinations rare and easy to spot. For high-stakes use cases — anything customer-facing or financial — I add a human-in-the-loop step where someone on your team reviews and approves the AI output before it ships. Your data stays on your side; I am not the reviewer.',
  },
  {
    q: 'Can it handle our messy data?',
    a: 'Standard tabular data — clean header row, consistent columns — works great. Multi-tab Excel exports, reports with title rows and footers, or freeform notes need a preprocessing step. Send me a sample file and I will tell you straight whether it is in scope.',
  },
  {
    q: 'Who else uses this?',
    a: 'You would be among the first. The demo on this page shows the capability; deployments are bespoke. If that is a risk concern, I am open to a short paid pilot — small scope, refundable if it does not deliver.',
  },
];

export function FAQ() {
  return (
    <section className="mt-16">
      <h2 className="mb-6 text-sm uppercase tracking-widest text-[var(--color-fg-muted)]">
        Frequently asked
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-4 transition hover:border-[var(--color-accent)]"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <span className="text-[var(--color-accent)] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
