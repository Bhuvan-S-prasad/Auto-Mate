import { prisma } from "@/lib/prisma";
import type { LogEntry } from "@/lib/types/agent";

export async function logStep(
  runId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  const entry: LogEntry = {
    step: type,
    timestamp: new Date().toISOString(),
    ...data,
  };

  console.log(`[Agent:${runId}] ${type}`, JSON.stringify(data));

  try {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: { actionsLog: true },
    });

    const currentLog = Array.isArray(run?.actionsLog) ? run.actionsLog : [];
    const updatedLog = JSON.parse(
      JSON.stringify([...(currentLog as unknown[]), entry]),
    );
    await prisma.agentRun.update({
      where: { id: runId },
      data: { actionsLog: updatedLog },
    });
  } catch (err) {
    console.error("[Agent:logStep] Failed to persist log:", err);
  }
}
