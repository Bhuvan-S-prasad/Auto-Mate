import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "@/lib/google-client";
import { fetchUpcomingEvents } from "@/lib/agents/agent-tools/calendar";

export async function GET() {
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

    try {
      const calendarClient = await getCalendarClient(user.id);

      // Fetch upcoming events:  1 month (720 hours)
      const events = await fetchUpcomingEvents(calendarClient, 720);
      // map and take top 5 events
      const top5Events = events.slice(0, 5).map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
      }));

      return NextResponse.json(top5Events);
    } catch (apiError) {
      console.error("Calendar API Error:", apiError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Failed to fetch dashboard events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
