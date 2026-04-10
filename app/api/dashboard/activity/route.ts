import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface RawAction {
  step?: string;
  tool?: string;
  type?: string;
  name?: string;
  timestamp?: string;
  toolCallId?: string;
  id?: string;
  input?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

// Helper function to convert raw action objects into human-readable strings
function transformAction(
  action: RawAction | null,
): { id: string; message: string; timestamp: string } | null {
  if (!action || typeof action !== "object") return null;

  const step = action.step;
  const toolName = action.tool || action.type;

  if (!toolName) return null;

  if (step && step !== "TOOL_CALL") return null;

  let message = `Executed ${toolName}`;
  const input = action.input || action.data || {};

  switch (toolName) {
    case "fetchUnreadEmails":
      message = "Checked unread emails";
      break;
    case "getEmailById":
      message = "Read an email";
      break;
    case "createDraft":
      const draftSubject = input.subject || "";
      message = draftSubject
        ? `Drafted email: ${draftSubject}`
        : "Drafted an email";
      break;
    case "sendEmail":
    case "send_email":
      const sentSubject = input.subject || "";
      message = sentSubject ? `Sent email: ${sentSubject}` : "Sent email";
      break;
    case "sendDraft":
      message = "Sent drafted email";
      break;
    case "markAsRead":
      message = "Marked email as read";
      break;
    case "fetchUpcomingEvents":
      message = "Checked upcoming schedule";
      break;
    case "createCalendarEvent":
    case "schedule_event":
      const eventTitle = input.title || input.eventName || "event";
      message = `Scheduled: ${eventTitle}`;
      break;
    case "recallMemory":
      const query = input.query || "";
      message = query ? `Recalled memory: "${query}"` : "Recalled memory";
      break;
    case "storeUserFact":
      const fact = input.value || input.key || "";
      message = fact ? `Remembered fact: ${fact}` : "Remembered a fact";
      break;
    case "sendTelegramMessage":
      message = "Sent Telegram message";
      break;
    case "createTask":
    case "create_task":
      const taskName = input.title || input.taskName || input.name || "";
      message = taskName ? `Created task: ${taskName}` : "Created a task";
      break;
    case "deepResearch":
    case "deep_research":
      const topic = input.topic as string | undefined || "";
      message = topic ? `Researched: ${topic}` : "Ran deep research";
      break;
    default:
      message = `Executed ${toolName}`;
  }

  return {
    id: action.toolCallId || action.id || String(Date.now() + Math.random()),
    message,
    timestamp: action.timestamp || new Date().toISOString(),
  };
}

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

    const recentRuns = await prisma.agentRun.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { actionsLog: true },
    });

    const allActivities: Array<{
      id: string;
      message: string;
      timestamp: string;
    }> = [];

    for (const run of recentRuns) {
      if (!run.actionsLog) continue;

      let actions: RawAction[] = [];
      if (Array.isArray(run.actionsLog)) {
        actions = run.actionsLog as RawAction[];
      } else if (typeof run.actionsLog === "string") {
        try {
          actions = JSON.parse(run.actionsLog);
          if (!Array.isArray(actions)) actions = [];
        } catch {
          actions = [];
        }
      }

      for (const action of actions) {
        const transformed = transformAction(action);
        if (transformed) {
          allActivities.push(transformed);
        }
      }
    }

    allActivities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    
    const url = new URL(req.url);
    const limit = url.searchParams.get("limit");
    
    const resultActivities = limit === "all" ? allActivities : allActivities.slice(0, 10);

    return NextResponse.json(resultActivities);
  } catch (error) {
    console.error("Failed to fetch dashboard activity:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
