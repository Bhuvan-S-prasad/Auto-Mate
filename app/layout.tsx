import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto-Mate | Your Personal Autonomous AI Agent",
  description:
    "Auto-Mate is a powerful, autonomous reAct agent that manages your Gmail, Google Calendar, and long-term memory via Telegram. Automate your digital life with reasoning and human-in-the-loop safety.",
  authors: [{ name: "Bhuvan S Prasad" }],
  keywords: [
    "AutoMate",
    "AI Agent",
    "ReAct Agent",
    "Automation",
    "Gmail AI",
    "Calendar AI",
    "Productivity",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex flex-col">
        <ClerkProvider>
          <Navigation />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
