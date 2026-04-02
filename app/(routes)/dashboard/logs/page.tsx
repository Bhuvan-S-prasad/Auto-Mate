"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

// Format relative time concisely 
function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  
  if (diffInMs < 60000) return 'Just now';
  
  const diffInMins = Math.floor(diffInMs / 60000);
  if (diffInMins < 60) return `${diffInMins}m ago`;
  
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LogsPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllActivities() {
      try {
        const res = await fetch("/api/dashboard/activity?limit=all");
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (error) {
        console.error("Failed to fetch activity logs:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllActivities();
  }, []);

  return (
    <div className="mt-24 max-w-4xl mx-auto p-6 space-y-8 min-h-screen">
      <header className="mb-2">
        <Link href="/dashboard" className="text-white/50 hover:text-primary transition-colors flex items-center gap-2 mb-6 w-fit text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" /> System Logs
        </h1>
        <p className="text-white/50 mt-2">Comprehensive history of all automated actions and agent activities.</p>
      </header>

      <div className="flex flex-col bg-surface border border-white/5 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 pb-6 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full bg-white/10 shrink-0" />
                <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-white/40 font-medium">No activity logged yet</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div 
                key={activity.id} 
                className="group flex items-center gap-4 py-4 border-b border-white/5 last:border-b-0 animate-premium-fade-in opacity-0"
                style={{ animationDelay: `${Math.min(index * 50, 1000)}ms` }}
              >
                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors duration-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0" />
                <div className="flex flex-1 items-center justify-between min-w-0 pr-2">
                  <span className="text-[1rem] font-medium text-white/80 group-hover:text-foreground transition-colors pr-6">
                    {activity.message}
                  </span>
                  <span className="text-sm text-white/40 tracking-wide font-medium whitespace-nowrap">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}