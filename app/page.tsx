"use client";

import { useRef } from "react";
import Navigation from "@/components/Navigation";


export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);



  return (
    <div
      className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans overflow-x-hidden grain-overlay"
      ref={scrollRef}
    >
      <Navigation />

    </div>
  );
}
