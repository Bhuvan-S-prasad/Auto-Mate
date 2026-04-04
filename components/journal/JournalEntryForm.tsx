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
        <div className="flex justify-between items-center border-t border-border pt-5 gap-3">
          <div className="text-[9px] text-text-subtle flex items-center gap-1.5 sm:flex">
            <span className="px-1.5 border border-border rounded text-text-muted">
              ⌘
            </span>
            +
            <span className="px-1.5 border border-border rounded text-text-muted">
              ↵
            </span>
            <span className="ml-1">to save</span>
          </div>

          <div className="flex gap-2 ml-auto">
            {isEditMode && onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-[10.5px] uppercase tracking-wide border border-border rounded-md text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="px-5 py-2 text-[10.5px] uppercase tracking-wider bg-primary text-black rounded-md flex items-center gap-2 shadow-md hover:bg-primary/90 disabled:opacity-40"
            >
              {isSubmitting && <Loader2 size={12} className="animate-spin" />}
              {isEditMode ? "Save changes" : "Record note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
