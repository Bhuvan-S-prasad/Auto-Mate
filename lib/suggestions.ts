import { prisma } from "@/lib/prisma";

export interface Suggestion {
  id: string;
  message: string;
  type: "warning" | "info";
}

export async function getDashboardSuggestions(userId: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  // Pending tasks warning
  const pendingTasksCount = await prisma.task.count({
    where: {
      userId,
      status: "pending",
    },
  });

  if (pendingTasksCount > 3) {
    suggestions.push({
      id: "suggestion-tasks-warning",
      message: `You have ${pendingTasksCount} pending tasks`,
      type: "warning",
    });
  }

  // Unverified facts needing confirmation (confidence < 0.6)
  const uncertainFacts = await prisma.userFact.findMany({
    where: {
      userId,
      confidence: {
        lt: 0.6,
      },
    },
    take: 5, 
    orderBy: { createdAt: "desc" },
  });

  for (const fact of uncertainFacts) {
    suggestions.push({
      id: `suggestion-fact-${fact.id}`,
      message: `Confirm: ${fact.key}`,
      type: "info",
    });
  }

  // Agent run checks for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const runsToday = await prisma.agentRun.count({
    where: {
      userId,
      startedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (runsToday === 0) {
    suggestions.push({
      id: "suggestion-no-runs",
      message: "Your agent has not run today",
      type: "info",
    });
  }

  return suggestions;
}
