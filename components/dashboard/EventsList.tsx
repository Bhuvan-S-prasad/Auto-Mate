"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import {
  formatTimeIST,
  formatDateIST,
  todayInIST,
  toISTDateString
} from "@/lib/utils/istDate";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

function formatTimeRange(startStr: string, endStr: string) {
  if (!startStr) return "All Day";

  // if it's an all day event, it won't have a "T" natively returned by google
  if (!startStr.includes("T")) {
    return "All Day";
  }

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  const startIST = formatTimeIST(startDate);
  const endIST = formatTimeIST(endDate);

  const startDateStr = toISTDateString(startDate);
  const endDateStr = toISTDateString(endDate);

  // Check if dates are different days in IST
  if (startDateStr !== endDateStr) {
    const startDisplay = startDate.toLocaleDateString("en-IN", { 
      month: "short", 
      day: "numeric",
      timeZone: "Asia/Kolkata" 
    });
    const endDisplay = endDate.toLocaleDateString("en-IN", { 
      month: "short", 
      day: "numeric",
      timeZone: "Asia/Kolkata" 
    });
    return `${startDisplay} ${startIST} - ${endDisplay} ${endIST}`;
  }

  return `${startIST} - ${endIST}`;
}

function getEventDayContext(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);

  const today = todayInIST();
  const tomorrow = new Date(today.getTime());
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  const dateISTStr = toISTDateString(date);
  const todayISTStr = toISTDateString(today);
  const tomorrowISTStr = toISTDateString(tomorrow);

  if (dateISTStr === todayISTStr) return "Today";
  if (dateISTStr === tomorrowISTStr) return "Tomorrow";

  return date.toLocaleDateString("en-IN", { 
    month: "long", 
    day: "numeric",
    timeZone: "Asia/Kolkata" 
  });
}

export function EventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/dashboard/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col bg-surface border border-white/5 rounded-2xl p-6 h-full shadow-sm relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white/5 rounded-lg text-primary">
          <CalendarDays className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Upcoming Events
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 cursor-default">
        {loading ? (
          <div className="space-y-3 pb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-xl p-4 border animate-pulse
                  ${i === 1 ? "border-primary/20 bg-primary/5" : "border-white/5 bg-white/5"}`}
              >
                {i === 1 && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                )}
                
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex justify-between items-start gap-4">
                    <div className="h-5 bg-white/10 rounded w-1/2" />
                    {i === 1 && <div className="h-4 bg-primary/20 rounded w-16" />}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1">
                    <div className="h-3.5 bg-white/5 rounded w-16" />
                    <div className="h-3.5 bg-white/5 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <span className="text-white/40 font-medium">
              Failed to load events
            </span>
            <button onClick={() => window.location.reload()} className="text-xs text-primary mt-2 hover:underline">Retry</button>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <span className="text-white/40 font-medium">
              No upcoming events
            </span>
            <p className="text-xs text-white/30 mt-2">
              Your schedule is clear!
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {events.map((event, index) => {
              const isNext = index === 0;

              return (
                <div
                  key={event.id}
                  className={`group relative overflow-hidden rounded-xl p-4 border transition-colors duration-200
                    ${
                      isNext
                        ? "border-primary/30 bg-primary/10"
                        : "border-white/5 bg-white/5 hover:bg-white/10"
                    }`}
                >
                  {isNext && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  )}

                  <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-start gap-4">
                      <h3
                        className={`font-semibold tracking-tight truncate ${isNext ? "text-primary" : "text-white/80 group-hover:text-foreground transition-colors"}`}
                      >
                        {event.title}
                      </h3>
                      {isNext && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          Up Next
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium mt-1">
                      <div className="flex items-center gap-1.5 text-white/50">
                        <CalendarDays className="w-3.5 h-3.5 text-white/40" />
                        <span>{getEventDayContext(event.start)}</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${isNext ? "text-primary/70" : "text-white/40"}`}
                      >
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        <span>{formatTimeRange(event.start, event.end)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seamless fade overlay to mask scrolling elements off edge */}
      <div className="absolute bottom-6 left-6 right-6 h-8 bg-linear-to-t from-surface to-transparent pointer-events-none rounded-b-2xl" />
    </div>
  );
}
