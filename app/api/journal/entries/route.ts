import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  todayInIST,
  parseDateParam,
} from '@/lib/utils/istDate';

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const queryDate = parseDateParam(dateStr);

    const entries = await prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        date: queryDate,
      },
    });

    // Group the entries
    let userEntry = null;
    let aiSummary = null;
    let weeklyReview = null;

    for (const entry of entries) {
      if (entry.type === "user_entry") {
        userEntry = {
          id: entry.id,
          content: entry.content,
          mood: entry.mood,
          createdAt: entry.createdAt.toISOString(),
        };
      } else if (entry.type === "auto_daily_summary") {
        aiSummary = {
          id: entry.id,
          content: entry.content,
          highlights: entry.highlights,
          createdAt: entry.createdAt.toISOString(),
        };
      } else if (entry.type === "weekly_review") {
        weeklyReview = {
          id: entry.id,
          content: entry.content,
          createdAt: entry.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      date: dateStr,
      userEntry,
      aiSummary,
      weeklyReview,
    });
  } catch (error) {
    console.error("Failed to fetch journal entries:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { date: dateStr, content, mood } = body;

    let queryDate: Date;
    if (dateStr) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
      queryDate = parseDateParam(dateStr);
    } else {
      queryDate = todayInIST();
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string." },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      INSERT INTO journal_entries (id, user_id, date, type, content, mood, created_at)
      VALUES (gen_random_uuid(), ${user.id}, ${queryDate}, 'user_entry', ${content}, ${mood || null}, NOW())
      ON CONFLICT (user_id, date, type) DO UPDATE SET 
        content = journal_entries.content || '\n\n' || EXCLUDED.content,
        mood = COALESCE(EXCLUDED.mood, journal_entries.mood)
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { date: dateStr, content, mood } = body;

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    const queryDate = parseDateParam(dateStr);

    if (content === undefined || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string." },
        { status: 400 }
      );
    }

    const result = await prisma.journalEntry.upsert({
      where: {
        userId_date_type: {
          userId: user.id,
          date: queryDate,
          type: "user_entry",
        },
      },
      update: {
        content: content,
        mood: mood !== undefined ? mood : null,
      },
      create: {
        userId: user.id,
        date: queryDate,
        type: "user_entry",
        content: content,
        mood: mood || null,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    const queryDate = parseDateParam(dateStr);

    try {
      await prisma.journalEntry.delete({
        where: {
          userId_date_type: {
            userId: user.id,
            date: queryDate,
            type: "user_entry",
          },
        },
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      // If the record to delete doesn't exist, prisma throws a specific error (P2025)
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2025"
      ) {
        return NextResponse.json({
          success: true,
          message: "Entry didn't exist",
        });
      }
      throw e;
    }
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
