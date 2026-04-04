"use client";

import { Sparkles, Clock, AlertCircle } from "lucide-react";

interface AiSummary {
  id: string;
  content: string;
  highlights: string[];
  createdAt: string;
}

interface AiSummaryDisplayProps {
  summary: AiSummary | null;
  date: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function AiSummaryDisplay({
  summary,
  date,
  loading,
  error,
  onRetry,
}: AiSummaryDisplayProps) {
  const isTodayOrYesterday = () => {
    const today = new Date();
    const targetDate = new Date(date);

    const todayNorm = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const targetNorm = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );

    const diffDays = Math.ceil(
      (todayNorm.getTime() - targetNorm.getTime()) / (1000 * 60 * 60 * 24),
    );

    return diffDays <= 1;
  };

  const generatedAtTime = summary?.createdAt
    ? new Date(summary.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="w-full font-mono">
      {/* LOADING */}
      {loading && (
        <div className="bg-surface border border-border-primary rounded-[18px] p-7">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 animate-shimmer" />
            <div className="h-2.5 w-[38%] bg-white/10 rounded animate-shimmer" />
            <div className="ml-auto h-2.5 w-16 bg-white/10 rounded animate-shimmer" />
          </div>

          <div className="flex flex-col gap-2.5 pl-0.5">
            <div className="h-2.5 w-full bg-white/10 rounded animate-shimmer" />
            <div className="h-2.5 w-[91%] bg-white/10 rounded animate-shimmer" />
            <div className="h-2.5 w-[82%] bg-white/10 rounded animate-shimmer" />
          </div>

          <div className="flex gap-2 mt-5">
            <div className="h-6 w-20 rounded-full bg-white/5 animate-shimmer" />
            <div className="h-6 w-16 rounded-full bg-white/5 animate-shimmer" />
            <div className="h-6 w-24 rounded-full bg-white/5 animate-shimmer" />
          </div>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="bg-surface border border-red-500/10 rounded-[18px] p-11 flex flex-col items-center text-center gap-2.5">
          <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertCircle size={20} />
          </div>

          <p className="text-[13.5px] text-red-400">
            Couldnt generate the summary
          </p>

          <button
            onClick={onRetry}
            className="mt-2 px-4 py-1.5 text-[10.5px] uppercase tracking-widest border border-border rounded-md text-text-muted hover:text-primary hover:border-border-primary hover:bg-primary-glow transition"
          >
            Try again
          </button>
        </div>
      )}

      {/* PENDING */}
      {!loading && !error && !summary && isTodayOrYesterday() && (
        <div className="bg-surface border border-border-primary rounded-[18px] p-12 flex flex-col items-center text-center relative">
          <div className="relative w-13 h-13 mb-5">
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ring-pulse" />
            <div className="absolute inset-0 rounded-full border border-primary/15 animate-ring-pulse delay-700" />

            <div className="absolute inset-0 rounded-full bg-primary-glow-md border border-border-primary flex items-center justify-center text-primary">
              <Sparkles size={18} />
            </div>
          </div>

          <h3 className="text-xl italic text-text-muted mb-2.5">
            Narrative in progress
          </h3>

          <p className="text-xs text-text-subtle leading-relaxed max-w-[270px]">
            Your days story is being written.
            <br />A full summary arrives at{" "}
            <span className="text-primary">midnight</span>.
          </p>
        </div>
      )}

      {/* SUMMARY */}
      {!loading && !error && summary && (
        <div className="bg-surface border border-border-primary rounded-[18px] p-7 hover:border-primary/30 hover:shadow-2xl transition relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-glow-md border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles size={13} />
              </div>
              <span className="text-[9px] uppercase tracking-[0.14em] text-primary/70">
                Daily Summary
              </span>
            </div>

            {generatedAtTime && (
              <div className="flex items-center gap-1 text-[9.5px] text-text-subtle bg-white/5 border border-border rounded-md px-2 py-1">
                <Clock size={10} />
                {generatedAtTime}
              </div>
            )}
          </div>

          <div className="h-px bg-border-primary mb-5" />

          <div className="text-[14.5px] leading-relaxed text-white/80 mb-6 relative pl-4">
            {summary.content}
          </div>

          {summary.highlights.length > 0 && (
            <div className="pt-5 border-t border-border flex flex-wrap gap-2">
              <div className="w-full text-[9px] uppercase tracking-widest text-text-subtle mb-1">
                Highlights
              </div>

              {summary.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-white/5 text-xs text-white/60 hover:bg-primary-glow hover:border-border-primary hover:text-white/85 transition"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
