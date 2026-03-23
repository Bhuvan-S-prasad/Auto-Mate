import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function Philosophy() {
  useScrollReveal();

  return (
    <>
      <section className="py-32 md:py-40 px-6 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 lg:gap-24 items-center reveal-on-scroll opacity-0">
          <div className="flex-1 stagger-child opacity-0">
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold mb-5">
              Philosophy
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
              Focus on what
              <br />
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-emerald-300">
                truly matters.
              </span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-10 font-light">
              time is the most valuable asset. Auto-Mate acts as your digital
              proxy — interpreting intent and executing tasks with unyielding
              precision.
            </p>
            <ul className="space-y-5">
              {[
                "No-code seamless automation workflows",
                "Secure context and memory retrieval",
                "Proactive intelligent actions",
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-4 text-gray-300 text-[15px]"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Terminal mockup */}
          <div className="flex-1 w-full max-w-md relative stagger-child opacity-0">
            <div className="absolute inset-0 bg-primary/15 blur-[80px] rounded-full -z-10" />
            <div className="relative p-8 rounded-4xl bg-surface/60 border border-white/6 shadow-2xl backdrop-blur-xl">
              {/* Window dots */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-auto text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                  terminal
                </span>
              </div>
              {/* Terminal lines */}
              <div className="space-y-3.5 font-mono text-sm">
                <p className="text-gray-500">
                  <span className="text-primary mr-2">›</span>
                  <span className="text-primary">Initialize</span> Agent...
                </p>
                <p className="pl-5 text-gray-600">Loading context...</p>
                <p className="pl-5 text-gray-600">
                  Authenticating providers...
                </p>
                <p className="text-gray-500">
                  <span className="text-primary mr-2">›</span>
                  <span className="text-primary">Agent</span> Online.
                </p>
                <p className="pl-5 text-white/90">
                  Monitoring for triggers
                  <span className="animate-blink ml-0.5">▌</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
