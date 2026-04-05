"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileDashboardHeader from "@/components/MobileDashboardHeader";

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <MobileDashboardHeader
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 w-full md:pl-64 pt-16 md:pt-0">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}