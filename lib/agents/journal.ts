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
  
  return prisma.journalEntry.upsert({
    where: {
      userId_date_type: {
        userId,
        date: dateObj,
        type: data.type,
      }
    },
    update: {
      content: data.content,
      highlights: data.highlights ?? [],
      mood: data.mood,
    },
    create: {
      userId,
      date: dateObj,
      type: data.type,
      content: data.content,
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
