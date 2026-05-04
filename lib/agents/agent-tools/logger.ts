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

  let safeDataStr = "[unserializable data]";
  try {
    safeDataStr = JSON.stringify(data, null, 2);
  } catch {
    // Ignored, fallback used
  }
  
  console.log(`\n[Agent:${runId}] === ${type} ===\n${safeDataStr}\n`);

  try {
    await prisma.$executeRaw`
      UPDATE "agent_runs"
      SET "actions_log" = COALESCE("actions_log", '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb
      WHERE id = ${runId}
    `;
  } catch (err) {
    console.error("[Agent:logStep] Failed to persist log:", err);
  }
}
