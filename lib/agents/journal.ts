import { prisma } from "@/lib/prisma";
import { Prisma, type JournalEntryType } from "@/app/generated/prisma";

export async function createJournalEntry(
  userId: string,
  data: {
    date: string; // ISO string or YYYY-MM-DD
    type: JournalEntryType;
    content: string;
    highlights?: string[];
    mood?: string;
  }
) {
  const dateObj = new Date(data.date);
  
  const existing = await prisma.journalEntry.findUnique({
    where: {
      userId_date_type: {
        userId,
        date: dateObj,
        type: data.type,
      }
    }
  });

  const isUserEntry = data.type === "user_entry";
  
  // Create a localized timestamp like "9:00 AM"
  const timestamp = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

  const formattedContent = isUserEntry
    ? `${timestamp}\n${data.content}`
    : data.content;

  if (existing) {
    const newContent = isUserEntry
      ? existing.content + "\n\n" + formattedContent
      : formattedContent;

    const newHighlights = isUserEntry && data.highlights?.length
      ? Array.from(new Set([...existing.highlights, ...data.highlights]))
      : data.highlights ?? existing.highlights;

    return prisma.journalEntry.update({
      where: { id: existing.id },
      data: {
        content: newContent,
        highlights: newHighlights,
        mood: data.mood ?? existing.mood,
      }
    });
  }

  return prisma.journalEntry.create({
    data: {
      userId,
      date: dateObj,
      type: data.type,
      content: formattedContent,
      highlights: data.highlights ?? [],
      mood: data.mood,
    },
  });
}

export async function fetchJournalEntries(
  userId: string,
  dateRange?: { start: string; end: string }
) {
  const whereClause: Prisma.JournalEntryWhereInput = { userId };
  
  if (dateRange) {
    whereClause.date = {
      gte: new Date(dateRange.start),
      lte: new Date(dateRange.end),
    };
  }

  return prisma.journalEntry.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
    take: 10,
  });
}
