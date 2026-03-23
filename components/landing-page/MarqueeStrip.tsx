const MARQUEE_WORDS = [
  "Automate",
  "Execute",
  "Orchestrate",
  "Respond",
  "Schedule",
  "Summarize",
  "Delegate",
  "Act",
];

export default function MarqueeStrip() {
  return (
    <section className="relative border-y border-white/5 py-5 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
          <span
            key={i}
            className="mx-8 text-sm font-medium uppercase tracking-[0.25em] text-gray-500 flex items-center gap-8"
          >
            {word}
            <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          </span>
        ))}
      </div>
    </section>
  );
}
