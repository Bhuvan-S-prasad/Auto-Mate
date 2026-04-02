"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Suggestion {
  id: string;
  message: string;
  type: "warning" | "info";
}

export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch("/api/dashboard/suggestions");
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  return (
    <div className="flex flex-col bg-surface border border-white/5 rounded-2xl p-6 shadow-sm overflow-hidden w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[1.125rem] font-semibold tracking-tight text-foreground">
          Suggested action
        </h2>
      </div>

      <div className="flex overflow-x-auto gap-4 nice-scrollbar pb-2 snap-x">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
               <div key={i} className="min-w-[260px] sm:min-w-[300px] rounded-xl border border-white/5 bg-white/5 shrink-0 p-4 flex flex-col gap-2 animate-pulse snap-start">
                 <div className="flex items-center gap-2">
                   <div className="h-5 w-16 bg-white/10 rounded-full" />
                   <div className="h-3 w-20 bg-white/5 rounded" />
                 </div>
                 <div className="flex flex-col gap-1.5 mt-1">
                   <div className="h-4 w-3/4 bg-white/10 rounded" />
                   <div className="h-3 w-1/3 bg-white/5 rounded" />
                 </div>
               </div>
            ))}
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center w-full">
            <span className="text-white/40 font-medium">Failed to load suggestions</span>
            <button onClick={() => window.location.reload()} className="text-xs text-blue-400 mt-2 hover:underline">Retry</button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center w-full border border-dashed border-white/10 rounded-xl">
            <span className="text-white/40 font-medium">You&apos;re all caught up</span>
            <p className="text-xs text-white/30 mt-1">No urgent actions needed.</p>
          </div>
        ) : (
          <>
            {suggestions.map((suggestion) => {
              const isWarning = suggestion.type === "warning";
              
              return (
                <div 
                  key={suggestion.id}
                  className="min-w-[260px] sm:min-w-[300px] rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 flex flex-col gap-3 shrink-0 snap-start cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    {isWarning ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold border border-red-500/20">
                        Urgent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[11px] font-bold border border-amber-500/20">
                        Notice
                      </span>
                    )}
                    <span className="text-[12px] text-white/40 font-medium">System evaluation</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-1">
                    <h3 className="text-[15px] font-semibold text-white/90 leading-snug group-hover:text-white transition-colors">
                      {suggestion.message}
                    </h3>
                    <span className="text-[13px] text-white/40 font-medium group-hover:text-white/50 transition-colors">
                      Created by agent
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
