import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  useScrollReveal();

  return (
    <section className="py-32 md:py-40 px-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center relative z-10 p-14 md:p-24 rounded-[2.5rem] bg-surface/30 border border-white/4 backdrop-blur-sm reveal-on-scroll opacity-0">
        <div className="stagger-child opacity-0">
          <Layers className="w-8 h-8 text-primary mx-auto mb-8 animate-float" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Ready to regain
            <br />
            your time?
          </h2>
          <p className="text-lg text-gray-400 mb-12 max-w-md mx-auto leading-relaxed font-light">
            Configure your autonomous agent in under 2 minutes. No code
            required.
          </p>
          <Link
            href="/setup"
            className="group inline-flex h-14 px-10 rounded-2xl bg-white text-black font-bold text-base items-center justify-center gap-2.5 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-[0_0_60px_rgba(255,255,255,0.08)]"
          >
            Create Your Agent
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
