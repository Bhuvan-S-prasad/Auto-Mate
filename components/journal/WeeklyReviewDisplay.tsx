"use client";

import { History, AlertCircle } from "lucide-react";
import { parseDateOnly } from "@/lib/date-utils";

interface WeeklyReview {
  id: string;
  content: string;
  createdAt: string;
}

interface WeeklyReviewDisplayProps {
  review: WeeklyReview | null;
  date: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function WeeklyReviewDisplay({
  review,
  date,
  loading,
  error,
  onRetry,
}: WeeklyReviewDisplayProps) {
  const dateObj = parseDateOnly(date);
  const isSunday = dateObj.getDay() === 0;
  if (!isSunday) return null;

  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const weekLabel = `${fmt(weekStart)} – ${fmt(dateObj)}`;

  const createdTime = review?.createdAt
    ? new Date(review.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  {
    /*  LOADING  */
  }
  if (loading) {
    return (
      <div className="bg-surface border border-border-primary rounded-[18px] p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 animate-shimmer" />
          <div className="h-2.5 w-[38%] bg-white/10 rounded animate-shimmer" />
          <div className="ml-auto h-2.5 w-[72px] bg-white/10 rounded animate-shimmer" />
        </div>

        <div className="mb-5">
          <div className="h-6 w-[60%] bg-white/10 rounded animate-shimmer mb-2" />
          <div className="h-2.5 w-[30%] bg-white/10 rounded animate-shimmer opacity-50" />
        </div>

        <div className="flex flex-col gap-2.5 pl-5">
          {[100, 94, 86, 78].map((w, i) => (
            <div
              key={i}
              className="h-2.5 bg-white/10 rounded animate-shimmer"
              style={{ width: `${w}%`, opacity: i === 3 ? 0.5 : 1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ───────── ERROR ───────── */
  if (!loading && error) {
    return (
      <div className="bg-surface border border-red-500/10 rounded-[18px] p-11 flex flex-col items-center text-center gap-2.5">
        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
          <AlertCircle size={20} />
        </div>

        <p className="text-[13.5px] text-red-400">
          Couldnt load the weekly reflection
        </p>

        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1.5 text-[10.5px] uppercase tracking-widest border border-border text-text-muted hover:text-primary hover:border-border-primary hover:bg-primary-glow rounded-md transition"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ───────── REVIEW ───────── */
  if (!review) return null;

  const paragraphs = review.content
    .split("\n\n")
    .filter((p: string) => p.trim() !== "");

  return (
    <div className="bg-surface border border-border-primary rounded-[18px] p-7 relative overflow-hidden hover:border-primary/30 hover:shadow-2xl transition">
      {/* bottom glow */}
      <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-[240px] h-[100px] bg-primary-glow blur-3xl rounded-full" />

      {/* watermark */}
      <div className="absolute bottom-5 right-6 text-primary/5">
        <History size={80} />
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-glow-md border border-primary/20 flex items-center justify-center text-primary">
            <History size={13} />
          </div>

          <span className="text-[9px] uppercase tracking-[0.14em] text-primary/70">
            Weekly Reflection
          </span>
        </div>

        <div className="text-[9.5px] text-text-subtle bg-white/5 border border-border rounded-md px-2 py-1">
          {weekLabel}
        </div>
      </div>

      {/* TITLE */}
      <div className="mb-5 relative z-10">
        <div className="font-serif italic text-[26px] leading-tight mb-1">
          Reflecting on your week
        </div>

        <div className="text-[10.5px] text-text-subtle">
          A summary of your past seven days
        </div>
      </div>

      <div className="h-px bg-border-primary mb-5" />

      {/* CONTENT */}
      <div className="relative z-10 pl-5">
        {/* quote */}
        <div className="absolute text-[80px] text-primary/10 top-5 left-0 font-serif">
          &quot;
        </div>

        <div className="space-y-4">
          {paragraphs.map((p: string, i: number) => (
            <p
              key={i}
              className="font-serif italic text-[16px] leading-relaxed text-white/80"
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      {createdTime && (
        <div className="mt-6 pt-4 border-t border-border flex justify-end text-[9.5px] uppercase tracking-wider text-text-subtle relative z-10">
          Generated at {createdTime}
        </div>
      )}
    </div>
  );
}
