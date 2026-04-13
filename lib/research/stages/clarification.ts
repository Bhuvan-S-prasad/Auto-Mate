import { callOpenRouter, extractJson } from "../utils";
import {
  ClarificationResult,
  LOG_PREFIX,
} from "@/lib/types/research";
import { clarificationPrompts } from "@/lib/prompts/deep-research-prompts";
import { RESEARCH_MODEL } from "@/lib/models";

export async function assessClarification(
  topic: string,
): Promise<ClarificationResult> {
  console.log(
    `${LOG_PREFIX} assessClarification() called for topic="${topic}"`,
  );

  const systemPrompt = clarificationPrompts.system();

  const response = await callOpenRouter(
    systemPrompt,
    clarificationPrompts.user(topic),
    200,
    RESEARCH_MODEL,
    true
  );

  try {
    const cleaned = extractJson(response);
    const result = JSON.parse(cleaned) as ClarificationResult;
    console.log(
      `${LOG_PREFIX} assessClarification: needsClarification=${result.needsClarification}`,
    );
    return result;
  } catch {
    // On parse failure, proceed without clarification
    console.warn(
      `${LOG_PREFIX} assessClarification parse failed, proceeding without clarification`,
    );
    return {
      needsClarification: false,
      refinedTopic: topic,
      researchScope: "",
    };
  }
}
