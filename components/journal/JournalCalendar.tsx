"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  todayInIST,
  toISTDateString,
  nowInIST
} from "@/lib/utils/istDate";

type Props = {
  selectedDate: string;
  datesWithEntries: string[];
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
};

const toIsoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function JournalCalendar({
  selectedDate,
  datesWithEntries,
  onDateSelect,
  onMonthChange,
}: Props) {
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) return parseInt(selectedDate.split("-")[0], 10);
    const istNow = nowInIST();
    return istNow.getUTCFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) return parseInt(selectedDate.split("-")[1], 10);
    const istNow = nowInIST();
    return istNow.getUTCMonth() + 1;
  });

  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    const [y, m] = selectedDate.split("-");
    const numY = parseInt(y, 10);
    const numM = parseInt(m, 10);
    if (numY !== viewYear || numM !== viewMonth) {
      setViewYear(numY);
      setViewMonth(numM);
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  useEffect(() => {
    onMonthChange(viewYear, viewMonth);
  }, [viewYear, viewMonth, onMonthChange]);

  const generateGrid = () => {
    const startDay = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
    const emptyStartDays = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth - 1, 0)).getUTCDate();

    const grid = [];
    const prevMonthYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;

    for (let i = 0; i < emptyStartDays; i++) {
      const d = daysInPrevMonth - emptyStartDays + i + 1;
      grid.push({
        baseDate: toIsoDate(prevMonthYear, prevMonth, d),
        day: d,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        baseDate: toIsoDate(viewYear, viewMonth, i),
        day: i,
        isCurrentMonth: true,
      });
    }

    const nextMonthYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const remaining = 42 - grid.length;

    for (let i = 1; i <= remaining; i++) {
      grid.push({
        baseDate: toIsoDate(nextMonthYear, nextMonth, i),
        day: i,
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  const grid = generateGrid();
  const todayStr = toISTDateString(todayInIST());

  return (
    <div className="bg-surface border border-border rounded-xl p-5 w-full max-w-[300px] relative overflow-hidden font-mono">
      {/* subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40" />

      {/* glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[180px] h-[80px] bg-primary-glow blur-3xl rounded-full" />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5 relative z-10">
        <div className="flex flex-col gap-[2px]">
          <div className="font-serif italic text-lg">
            {MONTH_NAMES[viewMonth - 1]}
          </div>
          <div className="text-[10px] tracking-[0.12em] uppercase text-primary">
            {viewYear}
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:border-border-active hover:text-primary hover:bg-primary-glow transition"
          >
            <ChevronLeft size={13} />
          </button>

          <button
            onClick={handleNextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:border-border-active hover:text-primary hover:bg-primary-glow transition"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* WEEKDAYS */}
      <div className="grid grid-cols-7 mb-2 text-[9px] uppercase tracking-widest text-text-subtle relative z-10">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-[2px] relative z-10">
        {grid.map((cell, idx) => {
          const isSelected = cell.baseDate === selectedDate;
          const isToday = cell.baseDate === todayStr;
          const hasEntry = datesWithEntries.includes(cell.baseDate);

          return (
            <button
              key={idx}
              disabled={!cell.isCurrentMonth}
              onClick={() => cell.isCurrentMonth && onDateSelect(cell.baseDate)}
              className={`
                relative aspect-square flex items-center justify-center text-[11.5px] rounded-md border transition
                ${!cell.isCurrentMonth && "text-text-subtle pointer-events-none"}
                ${
                  isSelected
                    ? "bg-primary text-black border-primary shadow-[0_0_0_3px_var(--primary-glow-strong)]"
                    : "border-transparent hover:bg-white/5 hover:border-border"
                }
                ${isToday && !isSelected && "border-primary/40 text-primary"}
              `}
            >
              {cell.day}

              {hasEntry && (
                <span
                  className={`absolute bottom-[3px] w-[3px] h-[3px] rounded-full ${
                    isSelected
                      ? "bg-black/50"
                      : "bg-primary shadow-[0_0_4px_rgba(16,185,129,0.6)]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[9px] text-text-muted relative z-10">
        <div className="flex items-center gap-1.5 uppercase tracking-wide">
          <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(16,185,129,0.7)]" />
          has entry
        </div>

        <div>
          <span className="text-primary">{datesWithEntries.length}</span>{" "}
          entries
        </div>
      </div>
    </div>
  );
}
