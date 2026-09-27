import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, Zap } from 'lucide-react';

export default function AiSummaryCard({ aiSummary, keyTakeaways = [], className = '' }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!aiSummary && (!keyTakeaways || keyTakeaways.length === 0)) {
    return null;
  }

  return (
    <div className={`rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-4 sm:p-5 shadow-sm transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-xs">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-serif text-sm sm:text-base text-foreground tracking-tight">
                AI Executive Briefing
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/15 text-primary">
                <Zap className="w-2.5 h-2.5" /> 30s Read
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Synthesized key takeaways and core reporting highlights
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={isExpanded ? 'Collapse AI Summary' : 'Expand AI Summary'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="mt-3.5 space-y-3.5 animate-in fade-in duration-200">
          {aiSummary && (
            <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-sans bg-card/60 rounded-xl p-3 border border-border/40">
              {aiSummary}
            </p>
          )}

          {keyTakeaways && keyTakeaways.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Key Facts & Highlights:
              </h4>
              <div className="grid gap-2">
                {keyTakeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 bg-background/80 rounded-xl p-2.5 border border-border/40 text-xs sm:text-sm text-foreground/85 leading-normal"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
