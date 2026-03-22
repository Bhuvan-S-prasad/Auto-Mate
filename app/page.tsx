"use client";

import { useRef } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/landing-page/Hero";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans grain-overlay"
      ref={scrollRef}
    >
      <Navigation />
      <Hero />
    </div>
  );
}
