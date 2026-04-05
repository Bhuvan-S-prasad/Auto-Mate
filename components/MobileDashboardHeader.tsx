"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

interface MobileDashboardHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function MobileDashboardHeader({
  isOpen,
  onToggle,
}: MobileDashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50 md:hidden">
      <div className="flex items-center gap-3 font-bold text-lg tracking-wide">
        <Link href="/">
          Auto<span className="text-primary">-Mate</span>
        </Link>
      </div>

      <button
        onClick={onToggle}
        className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </header>
  );
}
