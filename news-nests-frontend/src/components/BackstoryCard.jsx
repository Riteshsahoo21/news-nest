import React, { useState } from 'react';
import { History, Sparkles, ChevronDown, ChevronUp, Loader2, Clock, HelpCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function BackstoryCard({
  articleId,
  initialBackstoryData = null,
  initialBackstory = '',
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backstoryData, setBackstoryData] = useState(() => {
    if (initialBackstoryData && initialBackstoryData.narrative) {
      return initialBackstoryData;
    }
    return null;
  });
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    // If we already have the deep story, just expand
    if (backstoryData) {
      setIsExpanded(true);
      return;
    }

    // Trigger on-demand generation with active spinner
    setIsLoading(true);
    setIsExpanded(true);
    setError(null);

    try {
      const targetId = articleId;
      const res = await api.post(`/news/article/${targetId}/backstory`);
      if (res.data?.success && res.data?.backstoryData) {
        setBackstoryData(res.data.backstoryData);
      } else {
        setError('Unable to synthesize detailed backstory at this moment.');
      }
    } catch (err) {
      console.error('Failed to generate backstory on-demand:', err);
      // Fallback to legacy string if present
      if (initialBackstory) {
        setBackstoryData({
          summary: initialBackstory.replace(/^\s*(?:📌\s*)?the backstory\s*:\s*/i, ''),
          narrative: initialBackstory.replace(/^\s*(?:📌\s*)?the backstory\s*:\s*/i, ''),
          keyMilestones: [],
          whyItMatters: ''
        });
      } else {
        setError('Failed to connect to timeline generator. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card/90 to-background p-4 sm:p-5 shadow-sm transition-all duration-300 ${className}`}
      aria-label="The Backstory & Historical Timeline"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-serif text-sm sm:text-base text-foreground tracking-tight">
                Historical Backstory & Timeline
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Sparkles className="w-2.5 h-2.5" /> Deep Context
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Uncover historical precedents, prior clashes, and how this event developed
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 disabled:opacity-70 cursor-pointer shadow-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Analyzing...</span>
            </>
          ) : isExpanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Uncover Past Story</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Initial Teaser when collapsed */}
      {!isExpanded && (
        <div 
          onClick={handleToggle}
          className="mt-3 pt-2.5 border-t border-border/40 text-xs sm:text-sm text-muted-foreground flex items-center justify-between cursor-pointer hover:text-foreground transition-colors group"
        >
          <span>
            {backstoryData?.summary 
              ? backstoryData.summary.slice(0, 110) + '...'
              : 'Want to know what happened in the past? Click to expand the full historical backstory and key milestones.'}
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0 ml-2 group-hover:underline flex items-center gap-0.5">
            View Story &rarr;
          </span>
        </div>
      )}

      {/* Loading Spinner State */}
      {isLoading && isExpanded && (
        <div className="mt-4 pt-4 border-t border-border/40 flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 mb-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Synthesizing Deep Historical Backstory...
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Retrieving historical archive precedents, analyzing timeline developments, and assembling milestones on this instance.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && isExpanded && !isLoading && (
        <div className="mt-4 pt-4 border-t border-border/40 text-xs text-red-500">
          {error}
        </div>
      )}

      {/* Expanded Deep Backstory Content */}
      {isExpanded && !isLoading && backstoryData && (
        <div className="mt-4 pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-300">
          {/* 1. High-Level Summary Overview */}
          {backstoryData.summary && (
            <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl p-3 text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1 uppercase tracking-wider text-[11px]">
                Historical Overview:
              </span>
              {backstoryData.summary}
            </div>
          )}

          {/* 2. Detailed Backstory Narrative */}
          {backstoryData.narrative && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                The Deep Past Story:
              </h4>
              <div className="space-y-2.5 text-xs sm:text-sm text-foreground/85 leading-relaxed bg-card/60 p-3.5 rounded-xl border border-border/50">
                {backstoryData.narrative.split(/\n\n+/).map((para, idx) => (
                  <p key={idx} className="m-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 3. Chronological Key Milestones Stepper */}
          {Array.isArray(backstoryData.keyMilestones) && backstoryData.keyMilestones.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                Key Historical Milestones:
              </h4>
              <div className="grid gap-2">
                {backstoryData.keyMilestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-background/80 rounded-xl p-2.5 border border-border/40 text-xs sm:text-sm"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] font-mono shrink-0 mt-0.5">
                      {m.phase || `Milestone ${idx + 1}`}
                    </span>
                    <span className="flex-1 text-foreground/85 leading-relaxed">
                      {m.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Why It Matters Today */}
          {backstoryData.whyItMatters && (
            <div className="bg-card/70 rounded-xl p-3 border border-border/40 text-xs sm:text-sm text-muted-foreground">
              <span className="font-bold text-foreground block mb-0.5 text-xs">
                💡 Why It Matters Today:
              </span>
              {backstoryData.whyItMatters}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
