"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  message: string;
  timestamp: string;
}

// Format relative time 
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
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch("/api/dashboard/activity");
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (error) {
        console.error("Failed to fetch activity feed:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchActivities();
  }, []);

  return (
    <div className="flex flex-col bg-surface border border-white/5 rounded-2xl p-6 h-full shadow-sm relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-lg text-primary">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Recent Activity
          </h2>
        </div>
        <Link href="/dashboard/logs" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors hidden sm:block">
          View more &rarr;
        </Link>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2 cursor-default">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 pb-4 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <span className="text-white/40 font-medium">No recent activity logged</span>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 5).map((activity, index) => (
              <div 
                key={activity.id} 
                className="group flex items-center gap-4 py-3 border-b border-white/5 last:border-b-0 animate-premium-fade-in opacity-0"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors duration-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] shrink-0" />
                <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
                  <span className="text-[0.95rem] font-medium text-white/80 group-hover:text-foreground transition-colors truncate pr-4">
                    {activity.message}
                  </span>
                  <span className="text-xs text-white/40 tracking-wide font-medium whitespace-nowrap">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="absolute bottom-6 left-6 right-6 h-8 bg-linear-to-t from-surface to-transparent pointer-events-none rounded-b-2xl" />
      
      <div className="mt-4 sm:hidden flex justify-center">
         <Link href="/dashboard/logs" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          View more &rarr;
        </Link>
      </div>
    </div>
  );
}
