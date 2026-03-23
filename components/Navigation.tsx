import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Integrations",
    href: "/setup",
  },
  {
    name: "Automations",
    href: "/automations",
  },
  {
    name: "Activity",
    href: "/activity",
  },
];

export default function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-white/5 opacity-0 animate-premium-fade-in">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 font-bold text-xl tracking-wide">
          <Link href="/">
            Auto<span className="text-primary">-Mate</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-sm font-medium text-gray-300 hover:text-primary transition-colors group"
            >
              {item.name}
              <span className="absolute left-0 -bottom-1.5 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full rounded-full" />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/setup"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all text-white"
            >
              Get Started
            </Link>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border border-white/10",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </nav>
  );
}
