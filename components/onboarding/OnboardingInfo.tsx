"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function OnboardingInfo() {
  const router = useRouter();
  return (
    <aside className="relative flex flex-col justify-center px-6 py-10 md:py-12 md:px-12 border-b md:border-b-0 md:border-r border-white/5 gap-8">
      {/* Ambient glow */}
      <div 
        className="absolute -top-[15%] -left-[15%] w-[55%] h-[55%] rounded-full pointer-events-none animate-glow-pulse flex-none" 
        style={{ background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)" }}
      />

      {/* Wordmark */}
      <div 
        className="font-semibold text-[15px] tracking-[0.02em] opacity-0 animate-premium-fade-in flex items-center justify-between"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          Auto<span className="text-primary">-Mate</span>
        </div>
        <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
      </div>

      {/* Hero section */}
      <div 
        className="opacity-0 animate-premium-fade-in"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-3 py-1 px-2.5 rounded-full bg-primary/10 border border-primary/15">
          Your AI personal assistant
        </span>
        <h1 className="text-2xl md:text-[28px] font-semibold leading-tight tracking-[-0.02em] my-3 bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
          Your inbox, calendar, and memory — automated
        </h1>
        <p className="text-sm leading-relaxed text-white/45 max-w-[400px]">
          Auto-Mate connects to your Gmail and Google Calendar, then operates
          via Telegram. Tell it what you need in plain language.
        </p>
      </div>

      {/* Capabilities */}
      <ul 
        className="flex flex-col gap-3 m-0 p-0 opacity-0 animate-premium-fade-in"
        style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
      >
        <CapabilityItem
          iconBg="#185FA5"
          title="Email management"
          description="Summarise your inbox, draft replies, send with your approval, and manage threads — all from Telegram."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
        />
        <CapabilityItem
          iconBg="#0F6E56"
          title="Calendar control"
          description="Check availability, create events, and get a briefing before your day starts."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          }
        />
        <CapabilityItem
          iconBg="#534AB7"
          title="Persistent memory"
          description="Remembers your preferences, the people in your life, and what happened — so you never repeat yourself."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <line x1="9" y1="21" x2="15" y2="21" />
              <line x1="10" y1="24" x2="14" y2="24" />
            </svg>
          }
        />
        <CapabilityItem
          iconBg="#854F0B"
          title="Deep research"
          description="Ask it to research any topic and receive a cited, structured report delivered directly to Telegram."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          }
        />
        <CapabilityItem
          iconBg="#9b59b6"
          title="Journaling & Memory Retrieval"
          description="Your agent actively manages facts and episodes to construct automated journal entries, ensuring seamless memory retrieval."
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          }
        />
      </ul>

      {/* Phone mockup */}
      <div 
        className="hidden md:flex justify-center opacity-0 animate-premium-fade-in"
        style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
      >
        <div className="w-[280px] bg-surface rounded-3xl overflow-hidden shadow-[0_0_0_0.5px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.4)]">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5 bg-white/5">
            <div className="w-[30px] h-[30px] rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold">Auto-Mate</div>
              <div className="text-[10px] text-primary font-medium">online</div>
            </div>
          </div>

          {/* Chat bubbles */}
          <div className="p-3.5 flex flex-col gap-2 min-h-[200px]">
            <ChatBubble from="agent">
              Good morning! You have 3 unread emails and a standup at 10am.
            </ChatBubble>
            <ChatBubble from="user">
              Draft a reply to Priya saying I&apos;ll be 5 min late
            </ChatBubble>
            <ChatBubble from="agent">
              Draft ready — To: priya@company.com. Send it?
            </ChatBubble>
            <ChatBubble from="user">yes</ChatBubble>
            <ChatBubble from="agent">
              Sent ✓
            </ChatBubble>
          </div>

          {/* Input bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-white/20">
            <span>Message Auto-Mate…</span>
            <svg className="opacity-35" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Trust note */}
      <div 
        className="flex items-center gap-2 text-[11px] text-white/45 leading-relaxed opacity-0 animate-premium-fade-in"
        style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
      >
        <span className="w-1.5 h-1.5 min-w-[6px] rounded-full bg-[#639922] shrink-0" />
        Your data never leaves your account — we store only summaries, never
        raw email content
      </div>
    </aside>
  );
}

/* ── Capability item sub-component ─── */
function CapabilityItem({
  iconBg,
  title,
  description,
  icon,
}: {
  iconBg: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3.5 p-3 rounded-xl transition-colors hover:bg-white/5">
      <div
        className="w-8 h-8 min-w-8 flex items-center justify-center rounded-lg shrink-0"
        style={{ backgroundColor: `${iconBg}18`, color: iconBg }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-[13px] font-semibold mb-0.5 text-white/90">{title}</h3>
        <p className="text-xs leading-relaxed text-white/45">{description}</p>
      </div>
    </li>
  );
}

/* ── Chat bubble sub-component ─── */
function ChatBubble({
  from,
  children,
}: {
  from: "agent" | "user";
  children: React.ReactNode;
}) {
  const isAgent = from === "agent";
  return (
    <div 
      className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed animate-premium-fade-in ${
        isAgent 
          ? "self-start bg-white/5 text-white/85 rounded-[4px_12px_12px_12px]" 
          : "self-end bg-[#185FA5] text-white rounded-[12px_4px_12px_12px]"
      }`}
    >
      {children}
    </div>
  );
}
