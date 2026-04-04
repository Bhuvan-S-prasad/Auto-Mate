import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { JournalPageClient, EntriesResponse } from "@/components/journal/JournalPageClient";
import { redirect } from "next/navigation";

export default async function JournalPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Use today's date (UTC midnight) for initial fetch
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  
  const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const queryDate = new Date(Date.UTC(year, month - 1, day));

  // Initial Data Fetches
  const [entries, calendarDots] = await Promise.all([
    // 1. Fetch entries for today
    prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        date: queryDate,
      },
    }),
    // 2. Fetch all unique dates with entries for the current month
    prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
      },
      select: { date: true },
    }),
  ]);

  // Format daily entries
  const initialEntries: EntriesResponse = {
    date: todayStr,
    userEntry: null,
    aiSummary: null,
    weeklyReview: null,
  };

  entries.forEach((entry) => {
    if (entry.type === "user_entry") {
      initialEntries.userEntry = {
        id: entry.id,
        content: entry.content,
        mood: entry.mood,
        createdAt: entry.createdAt.toISOString(),
      };
    } else if (entry.type === "auto_daily_summary") {
      initialEntries.aiSummary = {
        id: entry.id,
        content: entry.content,
        highlights: entry.highlights,
        createdAt: entry.createdAt.toISOString(),
      };
    } else if (entry.type === "weekly_review") {
      initialEntries.weeklyReview = {
        id: entry.id,
        content: entry.content,
        createdAt: entry.createdAt.toISOString(),
      };
    }
  });

  // Extract unique active dates for the calendar
  const uniqueDates = new Set<string>();
  calendarDots.forEach((dot) => {
    uniqueDates.add(dot.date.toISOString().split("T")[0]);
  });

  return (
    <div className="animate-premium-fade-in opacity-0">
      <JournalPageClient
        initialDate={todayStr}
        initialEntries={initialEntries}
        initialDatesWithEntries={Array.from(uniqueDates)}
      />
    </div>
  );
}
