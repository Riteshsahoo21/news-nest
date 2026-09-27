import React from 'react';
import { History } from 'lucide-react';

export default function BackstoryCard({ backstory, className = '' }) {
  if (!backstory || !String(backstory).trim()) return null;

  const text = String(backstory)
    .replace(/^\s*(?:📌\s*)?the backstory\s*:\s*/i, '')
    .trim();

  if (!text) return null;

  return (
    <aside
      className={`not-prose rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm ${className}`}
      aria-label="The Backstory"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
        <History className="h-4 w-4" />
        The Backstory
      </div>
      <p className="m-0 text-sm leading-7 text-foreground/85 sm:text-base">{text}</p>
    </aside>
  );
}

