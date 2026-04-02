"use client";

import { useRef } from "react";
import Hero from "@/components/landing-page/Hero";
import MarqueeStrip from "@/components/landing-page/MarqueeStrip";
import Features from "@/components/landing-page/Features";
import Philosophy from "@/components/landing-page/Philosophy";
import CTA from "@/components/landing-page/CTA";
import Footer from "@/components/landing-page/Footer";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans grain-overlay"
      ref={scrollRef}
    >
      <Hero />
      <MarqueeStrip />
      <Features />

      <div className="max-w-4xl mx-auto px-6">
        <div className="glow-line" />
      </div>

      <Philosophy />

      <div className="max-w-4xl mx-auto px-6">
        <div className="glow-line" />
      </div>

      <CTA />
      <Footer />
    </div>
  );
}
