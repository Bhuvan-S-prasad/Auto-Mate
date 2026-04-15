"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useTypingLoop } from "@/hooks/use-typing-loop";
import {
  Zap,
  Mail,
  Calendar,
  Search,
  Brain,
  ShieldCheck,
  Send,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";

function OrbitingIcons() {
  const icons = [
    { Icon: Mail, label: "Gmail", color: "#ea4335" },
    { Icon: Calendar, label: "Calendar", color: "#4285f4" },
    { Icon: Send, label: "Telegram", color: "#26a5e4" },
    { Icon: Globe, label: "Web", color: "#10b981" },
  ];

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      {/* Central hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center z-10 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
        <Zap className="w-6 h-6 text-primary" />
      </div>

      {/* Orbit ring */}
      <div className="absolute inset-4 rounded-full border border-white/4" />
      <div className="absolute inset-4 rounded-full border border-dashed border-primary/10 animate-[spin_30s_linear_infinite]" />

      {/* Orbiting icons */}
      {icons.map(({ Icon, label, color }, i) => {
        return (
          <div
            key={label}
            className="absolute top-1/2 left-1/2 w-0 h-0"
            style={{
              animation: `spin 20s linear infinite`,
              animationDelay: `${-(20 / icons.length) * i}s`,
            }}
          >
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-surface/80 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg group"
              style={{
                top: "-80px",
                left: "0px",
                animation: `spin 20s linear infinite reverse`,
                animationDelay: `${-(20 / icons.length) * i}s`,
              }}
              title={label}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Memory Nodes
function MemoryGraph() {
  const nodes = [
    { x: 20, y: 25, label: "preferences", delay: 0 },
    { x: 75, y: 15, label: "contacts", delay: 0.3 },
    { x: 50, y: 55, label: "patterns", delay: 0.6 },
    { x: 15, y: 75, label: "history", delay: 0.9 },
    { x: 80, y: 70, label: "context", delay: 1.2 },
    { x: 45, y: 90, label: "intent", delay: 1.5 },
  ];

  const connections = [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 5],
    [1, 4],
  ];

  return (
    <div className="relative w-full h-[200px]">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        {connections.map(([from, to], i) => (
          <line
            key={i}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="rgba(16,185,129,0.15)"
            strokeWidth="0.5"
            className="animate-[pulse_3s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>

      {nodes.map((node, i) => (
        <div
          key={i}
          className="absolute flex flex-col items-center gap-1"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
            animation: `float 4s ease-in-out infinite`,
            animationDelay: `${node.delay}s`,
          }}
        >
          <div className="w-3 h-3 rounded-full bg-primary/40 border border-primary/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
          <span className="text-[9px] text-gray-500 font-mono whitespace-nowrap">
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}

//  Live Search Feed
function SearchFeed() {
  const queries = [
    { q: "IPL match score today", result: "CSK 186/4 vs MI 142/8" },
    { q: "latest AI news", result: "GPT-5 announced at dev conf" },
    { q: "is Succession still airing?", result: "Ended after Season 4" },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % queries.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [queries.length]);

  return (
    <div className="space-y-3">
      {queries.map((item, i) => (
        <div
          key={i}
          className={`p-3 rounded-xl border transition-all duration-500 ${
            i === active
              ? "bg-primary/6 border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
              : "bg-white/2 border-white/4 opacity-40"
          }`}
        >
          <p className="text-[11px] font-mono text-gray-500 mb-1">
            <span className="text-primary">{">"}</span> {item.q}
          </p>
          <p
            className={`text-xs transition-all duration-500 ${
              i === active ? "text-white/80" : "text-white/30"
            }`}
          >
            {item.result}
          </p>
        </div>
      ))}
    </div>
  );
}

//  Approval Flow — animated approval protocol mockup
function ApprovalFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % 4;
      setStep(i);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stages = [
    { label: "Draft email prepared", status: "done" },
    { label: "Preview shown to you", status: step >= 1 ? "done" : "pending" },
    {
      label: 'Awaiting "Go ahead"',
      status: step >= 2 ? "done" : step >= 1 ? "active" : "pending",
    },
    {
      label: "Email sent ✓",
      status: step >= 3 ? "done" : "pending",
    },
  ];

  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-all duration-500 ${
              s.status === "done"
                ? "bg-primary/20 text-primary border border-primary/40"
                : s.status === "active"
                  ? "bg-primary/10 text-primary border border-primary/30 animate-pulse"
                  : "bg-white/5 text-gray-600 border border-white/10"
            }`}
          >
            {s.status === "done" ? "✓" : i + 1}
          </div>
          <span
            className={`text-xs transition-colors duration-500 ${
              s.status === "done"
                ? "text-white/70"
                : s.status === "active"
                  ? "text-primary"
                  : "text-gray-600"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

//  Main Features Component — Bento Grid
export default function Features() {
  useScrollReveal();

  const terminalLines = [
    '> User: "Schedule standup & notify team"',
    "  Parsing intent...",
    "  Creating calendar event: 10:00 AM",
    "  Drafting email to team@co.dev",
    "  Done — all tasks executed.",
  ];

  const { display, cursorVisible } = useTypingLoop(terminalLines, 35, 3000);

  return (
    <section
      id="features"
      className="py-24 md:py-40 px-6 relative overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute left-[-10%] top-[20%] w-[500px] h-[500px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute right-[-10%] bottom-[10%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20 md:mb-28 reveal-on-scroll opacity-0">
          <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-5 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-primary/40" />
            What it does
            <span className="w-8 h-px bg-primary/40" />
          </p>
          <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1]">
            Not just a chatbot.
            <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-emerald-300 to-teal-200">
              A digital extension of you.
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-500 mt-6 max-w-2xl mx-auto font-light leading-relaxed">
            Six core capabilities that work together to automate your entire
            digital workflow — from email to memory.
          </p>
        </div>

        {/* ── Bento Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 reveal-on-scroll opacity-0">
          {/* ─── Card 1: AI Automation (Large — spans 4 cols) ─── */}
          <div className="stagger-child opacity-0 md:col-span-4 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-700 overflow-hidden">
            {/* Hover glow */}
            <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-shadow duration-500">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">
                  AI-Powered Automation
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                  Speak naturally — Auto-Mate decomposes your request into
                  actionable steps and executes them in sequence, learning your
                  patterns over time.
                </p>
              </div>

              {/* Live terminal */}
              <div className="w-full md:w-[300px] shrink-0 rounded-2xl bg-[#0d0d0f] border border-white/6 p-5 font-mono text-[12px] shadow-2xl">
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-auto text-[9px] text-gray-600 uppercase tracking-widest">
                    auto-mate
                  </span>
                </div>
                <div className="space-y-1.5 min-h-[110px]">
                  {display.map((line, i) => (
                    <p
                      key={i}
                      className={`${
                        line.startsWith(">")
                          ? "text-gray-300"
                          : line.includes("✅")
                            ? "text-primary"
                            : "text-gray-500"
                      } leading-relaxed`}
                    >
                      {line}
                      {i === display.length - 1 && (
                        <span
                          className={`ml-0.5 ${cursorVisible ? "opacity-100" : "opacity-0"} text-primary transition-opacity`}
                        >
                          ▌
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Card 2: Integrations (spans 2 cols) ─── */}
          <div className="stagger-child opacity-0 md:col-span-2 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-700 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2 tracking-tight">
                Seamless Integrations
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Gmail, Calendar, Telegram, Web — all connected and orchestrated.
              </p>
              <OrbitingIcons />
            </div>
          </div>

          {/* ─── Card 3: Contextual Intelligence (spans 2 cols) ─── */}
          <div className="stagger-child opacity-0 md:col-span-2 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-700 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    Contextual Memory
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Persistent knowledge graph
                  </p>
                </div>
              </div>
              <MemoryGraph />
            </div>
          </div>

          {/* ─── Card 4: Web Search (spans 2 cols) ─── */}
          <div className="stagger-child opacity-0 md:col-span-2 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-700 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    Live Web Search
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Real-time answers, always current
                  </p>
                </div>
              </div>
              <SearchFeed />
            </div>
          </div>

          {/* ─── Card 5: Approval Protocol (spans 2 cols) ─── */}
          <div className="stagger-child opacity-0 md:col-span-2 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-700 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">
                    Human-in-the-Loop
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    You approve every write action
                  </p>
                </div>
              </div>
              <ApprovalFlow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
