"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle, Clock, PlayCircle } from "lucide-react";

interface MetricsData {
  runsToday: number;
  actionsTaken: number;
  pendingTasks: number;
  successRate: number;
}

// number counting animation
function useCountUp(endValue: number, durationMs: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * endValue));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [endValue, durationMs]);

  return count;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  delay?: number;
}

function MetricCard({ label, value, icon, suffix = "", delay = 0 }: MetricCardProps) {
  const [show, setShow] = useState(false);
  const animatedValue = useCountUp(show ? value : 0, 1500);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`relative overflow-hidden bg-surface border border-white/5 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out group ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="absolute top-0 right-0 p-32 bg-linear-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-full blur-3xl -mr-16 -mt-16" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium tracking-tight text-white/50">
          {label}
        </h3>
        <div className="p-2 bg-white/5 rounded-lg text-white/70 transition-colors group-hover:bg-white/10 group-hover:text-primary">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tighter text-foreground">
          {animatedValue}
        </span>
        <span className="text-lg font-medium text-white/40">
          {suffix}
        </span>
      </div>
    </div>
  );
}

export function MetricsGrid() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, []);

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface border border-red-500/10 p-6 h-[120px] rounded-2xl flex flex-col justify-center items-center">
            <span className="text-red-400/60 text-sm font-medium">Unable to load metric</span>
          </div>
        ))}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-surface border border-white/5 p-6 rounded-2xl flex flex-col min-h-[136px]">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-white/5 rounded w-1/3" />
              <div className="w-9 h-9 bg-white/5 rounded-lg" />
            </div>
            <div className="h-8 bg-white/10 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        label="Runs Today"
        value={data.runsToday}
        icon={<PlayCircle className="w-5 h-5 text-blue-500" />}
        delay={100}
      />
      <MetricCard
        label="Actions Taken"
        value={data.actionsTaken}
        icon={<Activity className="w-5 h-5 text-emerald-500" />}
        delay={200}
      />
      <MetricCard
        label="Pending Tasks"
        value={data.pendingTasks}
        icon={<Clock className="w-5 h-5 text-orange-500" />}
        delay={300}
      />
      <MetricCard
        label="Success Rate"
        value={data.successRate}
        suffix="%"
        icon={<CheckCircle className="w-5 h-5 text-indigo-500" />}
        delay={400}
      />
    </div>
  );
}
