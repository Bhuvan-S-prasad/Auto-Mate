import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Zap, Network, Brain, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "AI-Powered Automation",
    description:
      "Intelligent task execution that learns your patterns and adapts to your workflow over time.",
  },
  {
    icon: Network,
    title: "Seamless Integrations",
    description:
      "Connect Gmail, Calendar, Telegram, and more — your services, orchestrated in harmony.",
  },
  {
    icon: Brain,
    title: "Contextual Intelligence",
    description:
      "Persistent memory and context awareness so your agent truly understands your intent.",
  },
];

export default function Features() {
  useScrollReveal();

  return (
    <section
      id="features"
      className="py-32 md:py-40 px-6 relative"
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 reveal-on-scroll opacity-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold mb-4">
            Capabilities
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Built for the future
            <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-emerald-300">
              of productivity.
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 reveal-on-scroll opacity-0">
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              className="stagger-child opacity-0 group relative p-8 md:p-10 rounded-4xl bg-surface/40 backdrop-blur-md border border-white/5 hover:border-primary/20 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-3 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
