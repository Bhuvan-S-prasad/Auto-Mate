import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { ActionLogEntry } from "@/lib/types";
import { todayInIST, istDayBoundsUTC } from "@/lib/utils/istDate";

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

    // Setup date range for today in IST
    const todayIST = todayInIST();
    const { dayStartUTC, dayEndUTC } = istDayBoundsUTC(todayIST);

    // 1. runsToday -> count of AgentRun where startedAt is today in IST
    const runsTodayPromise = prisma.agentRun.count({
      where: {
        userId: user.id,
        startedAt: {
          gte: dayStartUTC,
          lte: dayEndUTC,
        },
      },
    });

    // 2. actionsTaken -> total number of actions from actionsLog across today's runs in IST
    const todayRunsPromise = prisma.agentRun.findMany({
      where: {
        userId: user.id,
        startedAt: {
          gte: dayStartUTC,
          lte: dayEndUTC,
        },
      },
      select: {
        actionsLog: true,
      },
    });

    // 3. pendingTasks -> count of Task where status = "pending"
    const pendingTasksPromise = prisma.task.count({
      where: {
        userId: user.id,
        status: "pending",
      },
    });

    // 4. successRate -> percentage of successful runs
    const totalRunsPromise = prisma.agentRun.count({
      where: {
        userId: user.id,
      },
    });

    const successfulRunsPromise = prisma.agentRun.count({
      where: {
        userId: user.id,
        status: "success",
      },
    });

    // Run parallel queries
    const [
      runsToday,
      todayRuns,
      pendingTasks,
      totalRuns,
      successfulRuns,
    ] = await Promise.all([
      runsTodayPromise,
      todayRunsPromise,
      pendingTasksPromise,
      totalRunsPromise,
      successfulRunsPromise,
    ]);

    // Calculate actionsTaken safely
    let actionsTaken = 0;
    for (const run of todayRuns) {
      try {
        const actions = run.actionsLog as ActionLogEntry[] | string;
        if (Array.isArray(actions)) {
          actionsTaken += actions.length;
        } else if (typeof actions === "string") {
          const parsed = JSON.parse(actions) as ActionLogEntry[];
          if (Array.isArray(parsed)) {
            actionsTaken += parsed.length;
          }
        }
      } catch (e) {
        // Silently skip unparseable logs
        console.error("Error evaluating actionsLog:", e);
      }
    }

    // Calculate successRate
    const successRate =
      totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

    return NextResponse.json({
      runsToday,
      actionsTaken,
      pendingTasks,
      successRate,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard metrics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}