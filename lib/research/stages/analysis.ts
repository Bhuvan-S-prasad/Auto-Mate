import { callOpenRouter, extractJson } from "../utils";
import {
  QueryResult,
  ConflictResult,
  RESEARCH_MODEL,
  LOG_PREFIX,
} from "../../types/research";
import { analysisPrompts } from "@/lib/prompts/deep-research-prompts";

// ── STAGE 5: Conflict Detection

export async function detectConflicts(
  topic: string,
  allResults: QueryResult[],
): Promise<ConflictResult> {
  console.log(`${LOG_PREFIX} detectConflicts() called`);

  // Build a condensed view of all source claims
  const sourceSummary = allResults
    .flatMap((qr) => qr.results)
    .slice(0, 15) // limit to avoid huge prompts
    .map((r, i) => `[${i + 1}] ${r.source}: ${r.snippet.slice(0, 150)}`)
    .join("\n");

  const systemPrompt = analysisPrompts.detectConflictsSystem();
  const userMessage = analysisPrompts.detectConflictsUser(topic, sourceSummary);

  try {
    const response = await callOpenRouter(
      systemPrompt,
      userMessage,
      400,
      RESEARCH_MODEL,
      true
    );
    const cleaned = extractJson(response);
    const result = JSON.parse(cleaned) as ConflictResult;
    if (result.hasConflicts) {
      console.log(
        `${LOG_PREFIX} detectConflicts: found ${result.conflicts.length} conflicts`,
      );
    } else {
      console.log(`${LOG_PREFIX} detectConflicts: no conflicts found`);
    }
    return result;
  } catch {
    console.warn(`${LOG_PREFIX} detectConflicts parse failed, assuming none`);
    return { hasConflicts: false, conflicts: [] };
  }
}
