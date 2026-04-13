import { callOpenRouter, extractJson } from "../utils";
import { ResearchPlan, LOG_PREFIX } from "@/lib/types/research";
import { planningPrompts } from "@/lib/prompts/deep-research-prompts";
import { REPORT_MODEL } from "@/lib/models";

// ── STAGE 1: Research Plan

export async function createResearchPlan(
  topic: string,
  scope: string,
): Promise<ResearchPlan> {
  console.log(`${LOG_PREFIX} createResearchPlan() called`);

  const systemPrompt = planningPrompts.createPlanSystem();
  const userMessage = planningPrompts.createPlanUser(topic, scope);

  try {
    const response = await callOpenRouter(
      systemPrompt,
      userMessage,
      600,
      REPORT_MODEL,
      true
    );

    const cleaned = extractJson(response);
    const plan = JSON.parse(cleaned) as ResearchPlan;
    console.log(
      `${LOG_PREFIX} Research plan created: "${plan.title}", ${plan.sections.length} sections, ${plan.searchAngles.length} angles`,
    );
    return plan;
  } catch (err) {
    console.error(`${LOG_PREFIX} createResearchPlan failed:`, err);
    // Fallback plan
    return {
      title: topic,
      objective: `Investigate ${topic} comprehensively`,
      sections: [
        {
          heading: "Overview",
          purpose: "Establish context",
          keyQuestions: [`What is ${topic}?`],
        },
        {
          heading: "Key Findings",
          purpose: "Present main findings",
          keyQuestions: ["What are the key facts?"],
        },
        {
          heading: "Analysis",
          purpose: "Synthesise findings",
          keyQuestions: ["What do the findings mean?"],
        },
        {
          heading: "Conclusions",
          purpose: "Draw conclusions",
          keyQuestions: ["What are the implications?"],
        },
      ],
      searchAngles: [
        topic,
        `${topic} analysis`,
        `${topic} latest developments`,
      ],
      limitations: "Limited to publicly available sources",
      estimatedComplexity: "moderate",
    };
  }
}

// ── STAGE 2: Plan Queries



export async function planQueries(
  topic: string,
  searchAngles?: string[],
): Promise<string[]> {
  console.log(`${LOG_PREFIX} planQueries() called with topic="${topic}"`);

  const systemPrompt = planningPrompts.planQueriesSystem();
  const userMessage = planningPrompts.planQueriesUser(topic, searchAngles);

  try {
    const raw = await callOpenRouter(systemPrompt, userMessage, 300, undefined, false);
    console.log(`${LOG_PREFIX} planQueries raw LLM response:`, raw);

    // Strip possible markdown fences
    const cleaned = extractJson(raw);

    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((q: unknown) => typeof q === "string")
    ) {
      console.log(
        `${LOG_PREFIX} planQueries generated ${parsed.length} queries:`,
        parsed,
      );
      return parsed as string[];
    }

    // wrong shape — fallback
    console.warn(
      `${LOG_PREFIX} planQueries unexpected shape, using fallback. Parsed:`,
      parsed,
    );
    return getFallbackQueries(topic);
  } catch (err) {
    console.error(`${LOG_PREFIX} planQueries failed:`, err);
    return getFallbackQueries(topic);
  }
}

export function getFallbackQueries(topic: string): string[] {
  const year = new Date().getFullYear();
  const fallback = [
    topic,
    `${topic} recent developments ${year}`,
    `${topic} analysis challenges risks`,
  ];
  console.log(`${LOG_PREFIX} Using fallback queries:`, fallback);
  return fallback;
}
