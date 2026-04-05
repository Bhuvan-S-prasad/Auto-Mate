"use client";

import React from "react";
import { Edit2, Trash2, Calendar, Smile, AlertCircle } from "lucide-react";
import {
  parseDateParam,
  formatTimeIST,
  toIST
} from "@/lib/utils/istDate";

interface UserEntry {
  id: string;
  content: string;
  mood: string | null;
  createdAt: string;
}

interface UserEntryDisplayProps {
  entry: UserEntry | null;
  date: string;
  loading?: boolean;
  error?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRetry?: () => void;
}

export function UserEntryDisplay({
  entry,
  date,
  loading,
  error,
  onEdit,
  onDelete,
  onRetry,
}: UserEntryDisplayProps) {
  const queryDate = parseDateParam(date);
  const istDateObj = toIST(queryDate);
  const weekday = istDateObj.toLocaleString('en-IN', { weekday: 'long', timeZone: 'UTC' });
  const dayMonth = istDateObj.toLocaleString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const year = istDateObj.getUTCFullYear();

  const createdTime = entry?.createdAt
    ? formatTimeIST(new Date(entry.createdAt))
    : null;

  { /* LOADING  */}
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-[18px] p-7">
        <div className="flex justify-between mb-7">
          <div className="flex flex-col gap-2.5 flex-1 mr-6">
            <div className="h-2.5 w-[35%] bg-white/10 rounded animate-shimmer opacity-40" />
            <div className="h-2.5 w-[55%] bg-white/10 rounded animate-shimmer" />
            <div className="h-2.5 w-[28%] bg-white/10 rounded animate-shimmer opacity-50" />
          </div>

          <div className="flex gap-2">
            <div className="w-8 h-8 bg-white/5 rounded-lg animate-shimmer" />
            <div className="w-8 h-8 bg-white/5 rounded-lg animate-shimmer" />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {[100, 88, 76, 92, 60].map((w, i) => (
            <div
              key={i}
              className="h-2.5 bg-white/10 rounded animate-shimmer"
              style={{ width: `${w}%`, opacity: i === 4 ? 0.5 : 1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  {/*  ERROR  */}
  if (!loading && error) {
    return (
      <div className="bg-surface border border-red-500/10 rounded-[18px] p-12 flex flex-col items-center text-center gap-3">
        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
          <AlertCircle size={20} />
        </div>

        <p className="text-sm text-red-400 font-medium">
          Couldnt load this entry
        </p>

        <button
          onClick={onRetry}
          className="mt-2 px-5 py-2 text-xs uppercase tracking-wide border border-border text-text-muted hover:text-primary hover:border-border-hover hover:bg-primary-glow rounded-md transition"
        >
          Try again
        </button>
      </div>
    );
  }

  {/*  EMPTY  */}
  if (!entry) {
    return (
      <div className="group bg-surface border border-dashed border-white/10 rounded-[18px] p-14 flex flex-col items-center text-center relative overflow-hidden hover:border-primary/20 transition">
        {/* glow */}
        <div className="pointer-events-none absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-primary-glow blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition" />

        <div className="w-14 h-14 rounded-xl border border-border bg-white/5 flex items-center justify-center text-text-subtle mb-5 group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary-glow transition">
          <Calendar size={22} />
        </div>

        <h3 className="font-serif italic text-xl text-text-muted mb-2">
          Nothing here yet
        </h3>

        <p className="text-xs text-text-subtle max-w-[260px] leading-relaxed mb-6">
          Capture your thoughts, reflections, or moments from this day.
        </p>

        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-md text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 hover:-translate-y-1px transition"
        >
          <Edit2 size={11} />
          Write an entry
        </button>
      </div>
    );
  }

  {/*  ENTRY  */}

  const paragraphs = entry.content
    .split("\n\n")
    .filter((p: string) => p.trim() !== "");

  return (
    <div className="bg-surface border border-border rounded-[18px] p-7 relative overflow-hidden hover:border-white/20 hover:shadow-2xl transition">
      {/* glow */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 bg-primary-glow blur-3xl rounded-full" />

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 relative z-10">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary mb-1">
              {weekday} · {year}
            </div>

            <div className="font-serif italic text-2xl md:text-xl text-white/90 leading-tight md:leading-normal">{dayMonth}</div>

            {entry.mood && (
              <div className="mt-3 md:mt-2 self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide bg-primary-glow border border-primary/20 text-primary font-medium">
                <Smile size={11} />
                {entry.mood}
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
            <button
              onClick={onEdit}
              aria-label="Edit entry"
              className="flex-1 sm:flex-none h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl sm:rounded-md border border-border text-text-subtle hover:text-primary hover:border-border-hover hover:bg-primary-glow transition"
            >
              <Edit2 size={14} className="sm:size-[13px]" />
              <span className="ml-2 text-xs sm:hidden">Edit</span>
            </button>

            <button
              onClick={onDelete}
              aria-label="Delete entry"
              className="flex-1 sm:flex-none h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl sm:rounded-md border border-border text-text-subtle hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition"
            >
              <Trash2 size={14} className="sm:size-[13px]" />
              <span className="ml-2 text-xs sm:hidden">Delete</span>
            </button>
          </div>
        </div>

      <div className="h-px bg-border mb-6" />

      <div className="space-y-4 text-[14.5px] leading-relaxed text-white/70 relative z-10">
        {paragraphs.map((para: string, i: number) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {createdTime && (
        <div className="mt-6 pt-4 border-t border-border flex justify-end text-[9.5px] uppercase tracking-wider text-text-subtle">
          Written at {createdTime}
        </div>
      )}
    </div>
  );
}
