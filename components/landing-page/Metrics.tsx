import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const METRICS = [
  { label: "Tasks Automated", value: "2.4M+" },
  { label: "Time Saved", value: "85k hrs" },
  { label: "Active Agents", value: "12k" },
  { label: "Uptime", value: "99.9%" },
];

export default function Metrics() {
  useScrollReveal();

  return (
    <section className="border-y border-white/5 py-14 px-6 reveal-on-scroll opacity-0">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0">
        {METRICS.map((metric, idx) => (
          <div
            key={idx}
            className={`stagger-child opacity-0 text-center ${
              idx < METRICS.length - 1 ? "md:border-r md:border-white/5" : ""
            }`}
          >
            <p className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
              {metric.value}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
