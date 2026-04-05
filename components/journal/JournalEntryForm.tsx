"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Smile, X } from "lucide-react";

const MOODS = [
  "productive",
  "tired",
  "happy",
  "stressed",
  "focused",
  "distracted",
  "energised",
  "calm",
];

interface JournalEntryFormProps {
  date: string;
  existingContent?: string;
  existingMood?: string;
  onSave: (content: string, mood?: string) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

export function JournalEntryForm({
  existingContent = "",
  existingMood = "",
  onSave,
  onCancel,
  isSubmitting,
}: JournalEntryFormProps) {
  const [content, setContent] = useState(existingContent);
  const [mood, setMood] = useState<string | undefined>(
    existingMood || undefined,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditMode = existingContent !== "";

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.max(120, ta.scrollHeight)}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    await onSave(content, mood);
    if (!isEditMode) {
      setContent("");
      setMood(undefined);
    }
  };

  const toggleMood = (m: string) =>
    setMood((prev) => (prev === m ? undefined : m));

  return (
    <div className="w-full font-mono">
      <div className="bg-surface border border-border rounded-[18px] p-7 relative overflow-hidden focus-within:border-border-primary transition">
        {/* glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-primary-glow blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition" />

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <div className="text-[9px] uppercase tracking-[0.14em] text-primary/70 mb-1">
              {isEditMode ? "Editing entry" : "New entry"}
            </div>

            <div className="font-serif italic text-xl">
              {isEditMode ? "Edit your note" : "What's on your mind?"}
            </div>
          </div>

          {isEditMode && onCancel && (
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-subtle hover:border-red-400/30 hover:text-red-400 hover:bg-red-400/10 transition"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="h-px bg-border mb-5" />

        {/* TEXTAREA */}
        <div className="relative mb-5">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write freely. This is just for you."
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-[13.5px] leading-relaxed text-white/80 resize-none outline-none focus:border-border-primary focus:bg-primary-glow"
          />

          {content.length > 0 && (
            <span className="absolute bottom-2 right-3 text-[9px] text-text-muted">
              {content.length}
            </span>
          )}
        </div>

        {/* MOODS */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-text-subtle mb-3">
            <Smile size={11} />
            How are you feeling?
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMood(m)}
                className={`
                  px-3 py-1.5 text-[10.5px] rounded-full border transition capitalize
                  ${
                    mood === m
                      ? "bg-primary-glow-md border-border-primary text-primary shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                      : "border-border text-text-muted hover:border-white/20 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-t border-white/5 pt-6 gap-4">
          <div className="hidden sm:flex text-[10px] text-gray-500 items-center gap-1.5">
            <span className="px-1.5 py-0.5 border border-white/10 rounded text-gray-400 font-medium bg-white/5">
              ⌘
            </span>
            <span className="text-gray-600">+</span>
            <span className="px-1.5 py-0.5 border border-white/10 rounded text-gray-400 font-medium bg-white/5">
              ↵
            </span>
            <span className="ml-1 uppercase tracking-tight">to save note</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isEditMode && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 sm:flex-none h-11 sm:h-auto px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider border border-white/10 rounded-xl sm:rounded-lg text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="flex-1 sm:flex-none h-11 sm:h-auto px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-black rounded-xl sm:rounded-lg flex items-center justify-center gap-2.5 shadow-lg shadow-primary/10 hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              {isEditMode ? "Save Changes" : "Record Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
