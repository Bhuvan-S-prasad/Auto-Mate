import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-26 px-6 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px] animate-glow-pulse pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-[premium-fade-in_1s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:200ms]">
          <Sparkles className="w-3 h-3" />
          <span>Introducing Auto-Mate</span>
        </div>

        {/* Headline */}
        <h1 className="mb-8 opacity-0 animate-[premium-fade-in_1s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:400ms]">
          <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
            Your Personal
          </span>
          <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mt-2 bg-clip-text text-transparent bg-linear-to-b from-white via-white/90 to-gray-500">
            Autonomous Agent
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-base md:text-xl text-gray-400 max-w-xl mb-12 md:mb-14 opacity-0 animate-[premium-fade-in_1s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:600ms] leading-relaxed font-light">
          Automate tedious tasks, connect your services, and let AI orchestrate
          your digital life with precision.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-[premium-fade-in_1s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:800ms]">
          <Link
            href="/onboarding"
            className="group h-14 w-full sm:w-auto px-8 rounded-2xl bg-primary text-black font-bold text-base flex items-center justify-center gap-2.5 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-[0_0_40px_rgba(16,185,129,0.25)]"
          >
            Start Automating
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
