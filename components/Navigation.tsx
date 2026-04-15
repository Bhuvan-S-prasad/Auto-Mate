"use client"

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (pathname !== "/") {
    return null;
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-white/5 opacity-0 animate-premium-fade-in [animation-fill-mode:forwards]">
        <div className="max-w-5xl mx-auto px-8 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold text-lg md:text-xl tracking-wide shrink-0">
              <Link href="/" onClick={closeMenu}>
                Auto<span className="text-primary">-Mate</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-6">
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all text-white"
                >
                  Get Started
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/80 border border-black text-sm font-medium transition-all text-black"
                >
                  Dashboard
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 border border-white/10",
                    },
                  }}
                />
              </Show>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors md:hidden"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden pt-20 px-6 ${
          isMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            <Link
              href="#features"
              onClick={closeMenu}
              className="text-2xl font-bold tracking-tight text-white/90 hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#philosophy"
              onClick={closeMenu}
              className="text-2xl font-bold tracking-tight text-white/90 hover:text-primary transition-colors"
            >
              Philosophy
            </Link>
          </div>

          <div className="pt-8 border-t border-white/5">
            <Show when="signed-out">
              <div className="flex flex-col gap-4">
                <Link
                  href="/onboarding"
                  onClick={closeMenu}
                  className="w-full h-14 rounded-2xl bg-primary text-black font-bold text-lg flex items-center justify-center transition-all active:scale-[0.98]"
                >
                  Get Started
                </Link>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-all active:scale-[0.98]"
                >
                  Sign In
                </Link>
              </div>
            </Show>
            <Show when="signed-in">
              <div className="flex flex-col gap-4">
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="w-full h-14 rounded-2xl bg-primary text-black font-bold text-lg flex items-center justify-center transition-all active:scale-[0.98]"
                >
                  Go to Dashboard
                </Link>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-10 h-10 border border-white/10",
                      },
                    }}
                  />
                  <span className="font-medium text-white/80">Your Profile</span>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </>
  );
}
