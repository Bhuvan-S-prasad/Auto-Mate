"use client";

import React, { useState, useEffect, useCallback } from "react";
import { JournalCalendar } from "./JournalCalendar";
import {
  toISTDateString,
  todayInIST,
  parseDateParam,
  toIST
} from "@/lib/utils/istDate";
import { UserEntryDisplay } from "./UserEntryDisplay";
import { AiSummaryDisplay } from "./AiSummaryDisplay";
import { WeeklyReviewDisplay } from "./WeeklyReviewDisplay";
import { JournalEntryForm } from "./JournalEntryForm";

export interface UserEntry {
  id: string;
  content: string;
  mood: string | null;
  createdAt: string;
}

export interface AiSummary {
  id: string;
  content: string;
  highlights: string[];
  createdAt: string;
}

export interface WeeklyReview {
  id: string;
  content: string;
  createdAt: string;
}

export interface EntriesResponse {
  date: string;
  userEntry: UserEntry | null;
  aiSummary: AiSummary | null;
  weeklyReview: WeeklyReview | null;
}

interface JournalPageClientProps {
  initialDate: string;
  initialEntries: EntriesResponse;
  initialDatesWithEntries: string[];
}

export function JournalPageClient({
  initialEntries,
  initialDatesWithEntries,
}: JournalPageClientProps) {
  // Use today in IST as the initial selected date
  const [selectedDate, setSelectedDate] = useState(
    toISTDateString(todayInIST())
  );
  const [datesWithEntries, setDatesWithEntries] = useState(
    initialDatesWithEntries,
  );
  const [currentEntries, setCurrentEntries] =
    useState<EntriesResponse>(initialEntries);

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/journal/entries?date=${date}`);
      if (!res.ok) throw new Error();
      setCurrentEntries(await res.json());
    } catch {
      setError("Failed to load journal entries. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(selectedDate);
  }, [selectedDate, fetchEntries]);

  const handleDateSelect = (date: string) => {
    setIsEditing(false);
    setCurrentEntries({
      date,
      userEntry: null,
      aiSummary: null,
      weeklyReview: null,
    });
    setSelectedDate(date);
  };

  const handleMonthChange = useCallback(async (year: number, month: number) => {
    try {
      const res = await fetch(
        `/api/journal/calendar?year=${year}&month=${month}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setDatesWithEntries(data.datesWithEntries);
    } catch {}
  }, []);

  const handleSave = async (content: string, mood?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/journal/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, content, mood }),
      });
      if (!res.ok) throw new Error();

      if (!datesWithEntries.includes(selectedDate)) {
        setDatesWithEntries((prev: string[]) => [...prev, selectedDate]);
      }

      await fetchEntries(selectedDate);
    } catch {
      setError("Failed to save your note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (content: string, mood?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/journal/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, content, mood }),
      });
      if (!res.ok) throw new Error();

      await fetchEntries(selectedDate);
      setIsEditing(false);
    } catch {
      setError("Failed to update your note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/journal/entries?date=${selectedDate}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setCurrentEntries((prev: EntriesResponse) => ({
        ...prev,
        userEntry: null,
      }));

      if (!currentEntries.aiSummary && !currentEntries.weeklyReview) {
        setDatesWithEntries((prev: string[]) =>
          prev.filter((d) => d !== selectedDate),
        );
      }
    } catch {
      setError("Failed to delete entry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const queryDate = parseDateParam(selectedDate);
  const istDateObj = toIST(queryDate);
  const weekday = istDateObj.toLocaleString('en-IN', { weekday: 'long', timeZone: 'UTC' });
  const dayMonth = istDateObj.toLocaleString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const year = istDateObj.getUTCFullYear();

  return (
    <div className="flex gap-8 w-full min-h-full items-start">
      {/* SIDEBAR */}
      <aside className="w-[260px] shrink-0 sticky top-8 flex flex-col gap-3">
        <JournalCalendar
          selectedDate={selectedDate}
          datesWithEntries={datesWithEntries}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
        />

        <div className="flex gap-2 p-3 rounded-xl border border-border bg-white/1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)] mt-1" />
          <p className="text-[10.5px] text-text-subtle leading-relaxed">
            Dates with a dot have a recorded journal entry or AI summary.
          </p>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 flex flex-col pb-20">
        {/* HEADER */}
        <div className="mb-8">
          <div className="text-[9px] uppercase tracking-[0.16em] text-primary/70 mb-1">
            {weekday} · {year}
          </div>

          <h1 className="font-serif italic text-[32px] leading-tight">
            {dayMonth}
          </h1>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex justify-between items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5 mb-7">
            <span className="text-sm text-red-400">{error}</span>

            <button
              onClick={() => fetchEntries(selectedDate)}
              className="text-[10px] uppercase tracking-wider text-red-400 border border-red-400/30 px-3 py-1 rounded-md hover:bg-red-400/10 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* SECTIONS */}
        <div className="flex flex-col">
          <div className="relative">
            <UserEntryDisplay
              entry={currentEntries.userEntry}
              date={selectedDate}
              loading={isLoading}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
            />
          </div>

          {!isLoading && (
            <div className="relative mt-6">
              <JournalEntryForm
                date={selectedDate}
                existingContent={
                  isEditing ? (currentEntries.userEntry?.content ?? "") : ""
                }
                existingMood={
                  isEditing ? (currentEntries.userEntry?.mood ?? "") : ""
                }
                onSave={isEditing ? handleEdit : handleSave}
                onCancel={isEditing ? () => setIsEditing(false) : undefined}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          <div className="relative mt-6">
            <AiSummaryDisplay
              summary={currentEntries.aiSummary}
              date={selectedDate}
              loading={isLoading}
            />
          </div>

          {currentEntries.weeklyReview && (
            <div className="relative mt-6">
              <WeeklyReviewDisplay
                review={currentEntries.weeklyReview}
                date={selectedDate}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
