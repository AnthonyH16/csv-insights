'use client';

import { useCallback, useRef, useState } from 'react';
import Papa from 'papaparse';
import { buildDigest, type Digest } from '@/lib/digest';

type Props = {
  onDigestAction: (digest: Digest, rawRows: Record<string, unknown>[]) => void;
  onErrorAction: (message: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

export function Dropzone({ onDigestAction, onErrorAction }: Props) {
  const [hover, setHover] = useState(false);
  const [working, setWorking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_BYTES) {
        onErrorAction('File is over 5MB. This demo is limited to smaller files.');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onErrorAction('Please upload a .csv file.');
        return;
      }
      setWorking(true);
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setWorking(false);
          if (results.errors.length > 0) {
            onErrorAction('Could not parse that CSV. Try the demo file?');
            return;
          }
          if (results.data.length > MAX_ROWS) {
            onErrorAction('File has over 10,000 rows. This demo is capped lower.');
            return;
          }
          onDigestAction(buildDigest(results.data), results.data);
        },
        error: () => {
          setWorking(false);
          onErrorAction('Could not read that file.');
        },
      });
    },
    [onDigestAction, onErrorAction],
  );

  const useDemoFile = useCallback(async () => {
    setWorking(true);
    try {
      const res = await fetch('/demo-data.csv');
      const text = await res.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      setWorking(false);
      onDigestAction(buildDigest(parsed.data), parsed.data);
    } catch {
      setWorking(false);
      onErrorAction('Could not load demo file.');
    }
  }, [onDigestAction, onErrorAction]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition ${
        hover ? 'border-[var(--color-accent)] bg-[var(--color-bg-elev)]' : 'border-[var(--color-border)]'
      }`}
    >
      <p className="text-2xl font-medium">Drop a CSV. Get insights in seconds.</p>
      <p className="mt-2 text-[var(--color-fg-muted)]">
        Up to 5MB / 10,000 rows. Your file never leaves the browser unparsed.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={working}
          className="rounded-lg bg-[var(--color-accent)] px-5 py-3 font-medium text-black transition hover:bg-[var(--color-accent-dim)] disabled:opacity-50"
        >
          {working ? 'Working…' : 'Choose CSV file'}
        </button>
        <button
          type="button"
          onClick={useDemoFile}
          disabled={working}
          className="rounded-lg border border-[var(--color-border)] px-5 py-3 font-medium hover:border-[var(--color-accent)] disabled:opacity-50"
        >
          Try a demo file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
