import { prisma } from "@/lib/prisma";
import { Prisma, type JournalEntryType, type JournalEntry } from "@/app/generated/prisma";

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

  return prisma.$transaction(async (tx) => {
    // Lock the row for update to ensure atomicity
    const existing = await tx.$queryRaw<JournalEntry[]>`
      SELECT * FROM journal_entries 
      WHERE user_id = ${userId} AND date = ${dateObj}::date AND type = ${data.type}::"JournalEntryType"
      FOR UPDATE
    `;

    const entry = existing[0];

    if (entry) {
      const newContent = isUserEntry
        ? entry.content + "\n\n" + formattedContent
        : formattedContent;

      const newHighlights = isUserEntry && data.highlights?.length
        ? Array.from(new Set([...entry.highlights, ...data.highlights]))
        : data.highlights ?? entry.highlights;

      return tx.journalEntry.update({
        where: { id: entry.id },
        data: {
          content: newContent,
          highlights: newHighlights,
          mood: data.mood ?? entry.mood,
        }
      });
    }

    return tx.journalEntry.create({
      data: {
        userId,
        date: dateObj,
        type: data.type,
        content: formattedContent,
        highlights: data.highlights ?? [],
        mood: data.mood,
      },
    });
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
