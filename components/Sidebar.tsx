"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, Show } from "@clerk/nextjs";
import { Book, LayoutDashboard, Settings } from "lucide-react";

const SIDEBAR_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Integrations",
    href: "/integrations",
    icon: Settings,
  },
  {
    name: "Journal",
    href: "/journal",
    icon: Book,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <Show when="signed-in">
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-white/5 flex flex-col z-45 md:z-40 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 md:h-20 flex items-center px-6 font-bold text-xl tracking-wide border-b border-white/5">
          <Link href="/" onClick={onClose}>
            Auto<span className="text-primary">-Mate</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 border border-white/10",
              },
            }}
          />
          <div className="text-sm font-medium text-gray-300">Profile</div>
        </div>
      </aside>
    </Show>
  );
}
