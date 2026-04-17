import { ResearchPlan } from "@/lib/types/research";
import { sanitizePromptInsert } from "./react-agent-prompts";

export const clarificationPrompts = {
  system: () => `You are a research scoping assistant.
Assess if the research topic is specific enough to produce a focused, high-quality report.

Return ONLY valid JSON matching this schema:
{
  "needsClarification": boolean,
  "question": "single clarifying question if needed, null otherwise",
  "refinedTopic": "cleaned and expanded topic description if proceeding",
  "researchScope": "1-2 sentences: what this research will cover and what it won't"
}

Clarification is needed when:
- Topic is extremely broad (e.g., "AI", "technology", "India")
- Topic has ambiguous timeframe for time-sensitive subjects
- Topic could mean fundamentally different things (e.g., "Python" = language or snake?)

Clarification is NOT needed when:
- Topic is specific enough to generate focused queries
- Topic includes enough context to scope the research
- It's a clear question or a named subject`,
  user: (topic: string) => `Research topic: "${sanitizePromptInsert(topic)}"`,
};

export const planningPrompts = {
  createPlanSystem: () => `You are a senior research director creating a structured research plan.
Return ONLY valid JSON. No markdown, no explanation.`,
  createPlanUser: (topic: string, scope: string) => `Create a comprehensive research plan for this topic.

Topic: "${sanitizePromptInsert(topic)}"
Scope: "${scope}"

Return JSON matching this exact schema:
{
  "title": "Formal research report title",
  "objective": "Single sentence: what question this research answers",
  "sections": [
    {
      "heading": "Section name",
      "purpose": "What this section establishes (1 sentence)",
      "keyQuestions": ["Question 1", "Question 2"]
    }
  ],
  "searchAngles": ["angle 1", "angle 2", "angle 3", "angle 4", "angle 5"],
  "limitations": "What this research will not cover and why",
  "estimatedComplexity": "simple|moderate|complex"
}

Requirements:
- 4-6 sections covering distinct aspects
- sections must flow logically (context → findings → analysis → implications)
- searchAngles become the basis for web searches — make them specific
- limitations should be honest about scope boundaries`,

  planQueriesSystem: () => `You are a research query strategist. Your goal is to generate highly specific, diverse search queries that together provide comprehensive coverage of a topic.

Rules:
- Return ONLY a valid JSON array of strings — no explanation, no markdown, no code fences.
- Each query should target a distinct angle or subtopic.
- Queries should be specific enough to return focused results, not vague or generic.
- Use natural language phrasing that works well with search engines.
- Avoid redundancy — each query must add unique informational value.
- Prioritize queries that would surface recent, authoritative, or data-rich sources.`,
  planQueriesUser: (topic: string, searchAngles?: string[]) => {
    const anglesContext = searchAngles?.length
      ? `\nResearch plan search angles to incorporate:\n${searchAngles.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nGenerate queries that cover these angles while also ensuring the following aspects are addressed:`
      : "\nGenerate 5 distinct search queries covering these angles:";

    return `Topic: ${sanitizePromptInsert(topic)}
${anglesContext}
1. Current state and most recent developments (last 6 months)
2. Key players, companies, technologies, or frameworks involved
3. Challenges, criticisms, risks, or competing viewpoints
4. Quantitative data — statistics, benchmarks, market figures, or research findings
5. Future outlook, predictions, or long-term implications

Requirements:
- Make each query specific and search-engine-optimized.
- Avoid overlap between queries.
- Each query should be 5-12 words.
- Return format: ["query 1", "query 2", "query 3", "query 4", "query 5"]`;
  },
};

export const searchPrompts = {
  detectGapsSystem: () => `You are a research quality checker. Given a topic and what was found so far, identify gaps. Return ONLY a JSON array of 0-3 follow-up search queries. Return [] if coverage is good. No explanation.`,
  detectGapsUser: (topic: string, queriesSummary: string) => `Research topic: ${sanitizePromptInsert(topic)}

Queries run so far:
${queriesSummary}

What important angles are missing? Generate 0-3 follow-up queries to fill gaps. Return [] if coverage is sufficient.`,
};

export const analysisPrompts = {
  detectConflictsSystem: () => `You are a fact-checking analyst. Identify factual contradictions between sources.
Return ONLY valid JSON. No explanation.`,
  detectConflictsUser: (topic: string, sourceSummary: string) => `Topic: "${sanitizePromptInsert(topic)}"

Sources:
${sourceSummary}

Identify any direct factual contradictions between these sources.
Return JSON:
{
  "hasConflicts": boolean,
  "conflicts": [
    {
      "claim": "What is contested (e.g. 'market size')",
      "positions": ["Source A says X", "Source B says Y"],
      "sources": ["source-a.com", "source-b.com"]
    }
  ]
}

Return {"hasConflicts": false, "conflicts": []} if sources are broadly consistent.
Only flag genuine factual contradictions, not different perspectives on the same fact.`,
};

export const reportPrompts = {
  compileSystem: (sectionPlan: string, conflictNote: string) => `You are a research analyst writing a structured report.
Use ONLY the provided sources. Cite inline as [N].

Follow this exact section plan:
${sectionPlan}

${conflictNote}

Rules:
- Every factual claim needs a [N] citation matching a provided source
- When sources conflict, present both positions with their citations
- Do not invent statistics or facts not in the sources
- Mark uncertain or extrapolated claims with "reportedly" or "according to [N]"
- Use --- before each section heading
- Plain text only, no markdown headers (they don't render in Telegram)
- Keep total length under 1800 words`,
  compileUser: (topic: string, plan: ResearchPlan, numberedSourceList: string) => `Research topic: ${sanitizePromptInsert(topic)}
Report title: ${plan.title}
Objective: ${plan.objective}

Sources:
${numberedSourceList}

Write the research report following the section plan exactly.`,

  verifySystem: () => `You are a fact-checking editor. Verify that every citation in a research report
is actually supported by the cited source.

Return ONLY valid JSON.`,
  verifyUser: (sourceRef: string, reportSlice: string) => `Review this report and verify all citations are grounded.

SOURCES (what each citation actually says):
${sourceRef}

REPORT TO VERIFY:
${reportSlice}

For each [N] citation in the report, check if the preceding claim is actually supported
by source [N]'s text above. Only flag citations where the source text clearly does NOT
support the claim. If the source is relevant to the topic of the claim, consider it
broadly supported.

Return JSON:
{
  "verified": boolean,
  "issues": [
    {
      "claim": "the exact claim made in the report",
      "citation": "[N]",
      "issue": "not supported | misrepresented | extrapolated beyond source"
    }
  ],
  "cleanedReport": "the full report text with problematic citations replaced by [unverified] tag"
}`,
};
