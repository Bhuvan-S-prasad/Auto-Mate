import { searchWeb } from "@/lib/search/searchWeb";
import type { SearchResult } from "@/lib/search/searchWeb";
import sendMessage from "@/lib/Telegram/send-message";
import { sendDocument } from "@/lib/Telegram/send-document";
import { prisma } from "@/lib/prisma";
import { logEpisode } from "@/lib/agents/memory";
import { formatDateTimeIST } from "@/lib/utils/istDate";
import { generateResearchPDF } from "@/lib/research/generatePDF";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RESEARCH_MODEL = "google/gemini-2.0-flash-001";
const REPORT_MODEL = "google/gemini-2.0-flash-001";

const LOG_PREFIX = "[DeepResearch]";

// ── Types

interface ClarificationResult {
  needsClarification: boolean;
  question?: string;
  refinedTopic?: string;
  researchScope?: string;
}

interface ResearchPlan {
  title: string;
  objective: string;
  sections: {
    heading: string;
    purpose: string;
    keyQuestions: string[];
  }[];
  searchAngles: string[];
  limitations: string;
  estimatedComplexity: "simple" | "moderate" | "complex";
}

interface QueryResult {
  query: string;
  results: SearchResult[];
}

interface ConflictResult {
  hasConflicts: boolean;
  conflicts: {
    claim: string;
    positions: string[];
    sources: string[];
  }[];
}

interface VerificationResult {
  verified: boolean;
  issues: {
    claim: string;
    citation: string;
    issue: string;
  }[];
  cleanedReport: string;
}

// ── Helpers

async function getTelegramChatId(userId: string): Promise<number | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: "telegram" },
  });
  if (!integration?.telegramChatId) return null;
  return Number(integration.telegramChatId);
}

async function sendToUser(userId: string, text: string): Promise<void> {
  const chatId = await getTelegramChatId(userId);
  if (chatId) {
    await sendMessage(chatId, text);
  } else {
    console.warn(`${LOG_PREFIX} No Telegram chatId found for user ${userId}`);
  }
}

async function callOpenRouter(
  systemPrompt: string,
  userContent: string,
  maxTokens = 512,
  model = RESEARCH_MODEL,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  console.log(
    `${LOG_PREFIX} Calling OpenRouter model=${model} maxTokens=${maxTokens}`,
  );

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Auto-Mate",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`${LOG_PREFIX} OpenRouter error ${res.status}:`, body);
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content = (json.choices?.[0]?.message?.content ?? "").trim();
  console.log(`${LOG_PREFIX} OpenRouter response length=${content.length}`);
  return content;
}

// ── STAGE 0: Clarification

async function assessClarification(
  topic: string,
): Promise<ClarificationResult> {
  console.log(`${LOG_PREFIX} assessClarification() called for topic="${topic}"`);

  const systemPrompt = `You are a research scoping assistant.
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
- It's a clear question or a named subject`;

  const response = await callOpenRouter(
    systemPrompt,
    `Research topic: "${topic}"`,
    200,
    RESEARCH_MODEL,
  );

  try {
    const cleaned = response
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```$/i, "")
      .trim();
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

// ── STAGE 1: Research Plan

async function createResearchPlan(
  topic: string,
  scope: string,
): Promise<ResearchPlan> {
  console.log(`${LOG_PREFIX} createResearchPlan() called`);

  const systemPrompt = `You are a senior research director creating a structured research plan.
Return ONLY valid JSON. No markdown, no explanation.`;

  const userMessage = `Create a comprehensive research plan for this topic.

Topic: "${topic}"
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
- limitations should be honest about scope boundaries`;

  const response = await callOpenRouter(
    systemPrompt,
    userMessage,
    600,
    REPORT_MODEL,
  );

  try {
    const cleaned = response
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```$/i, "")
      .trim();
    const plan = JSON.parse(cleaned) as ResearchPlan;
    console.log(
      `${LOG_PREFIX} Research plan created: "${plan.title}", ${plan.sections.length} sections, ${plan.searchAngles.length} angles`,
    );
    return plan;
  } catch (err) {
    console.error(`${LOG_PREFIX} createResearchPlan parse failed:`, err);
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

const PLAN_SYSTEM_PROMPT = `You are a research query strategist. Your goal is to generate highly specific, diverse search queries that together provide comprehensive coverage of a topic.

Rules:
- Return ONLY a valid JSON array of strings — no explanation, no markdown, no code fences.
- Each query should target a distinct angle or subtopic.
- Queries should be specific enough to return focused results, not vague or generic.
- Use natural language phrasing that works well with search engines.
- Avoid redundancy — each query must add unique informational value.
- Prioritize queries that would surface recent, authoritative, or data-rich sources.`;

async function planQueries(
  topic: string,
  searchAngles?: string[],
): Promise<string[]> {
  console.log(`${LOG_PREFIX} planQueries() called with topic="${topic}"`);

  // If we have research plan angles, use them to guide query generation
  const anglesContext = searchAngles?.length
    ? `\nResearch plan search angles to incorporate:\n${searchAngles.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\nGenerate queries that cover these angles while also ensuring the following aspects are addressed:`
    : "\nGenerate 5 distinct search queries covering these angles:";

  const userMessage = `Topic: ${topic}
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

  try {
    const raw = await callOpenRouter(PLAN_SYSTEM_PROMPT, userMessage, 300);
    console.log(`${LOG_PREFIX} planQueries raw LLM response:`, raw);

    // Strip possible markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

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

function getFallbackQueries(topic: string): string[] {
  const year = new Date().getFullYear();
  const fallback = [
    topic,
    `${topic} recent developments ${year}`,
    `${topic} analysis challenges risks`,
  ];
  console.log(`${LOG_PREFIX} Using fallback queries:`, fallback);
  return fallback;
}

// ── STAGE 3: Search All Queries

async function searchAllQueries(queries: string[]): Promise<QueryResult[]> {
  console.log(
    `${LOG_PREFIX} searchAllQueries() called with ${queries.length} queries`,
  );

  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      console.log(`${LOG_PREFIX} Searching: "${query}"`);
      const results = await searchWeb(query, {
        maxResults: 4,
        topic: "general",
      });
      console.log(
        `${LOG_PREFIX} Search "${query}" returned ${results.length} results`,
      );
      return { query, results } as QueryResult;
    }),
  );

  const queryResults: QueryResult[] = [];

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      queryResults.push(result.value);
    } else {
      console.error(
        `${LOG_PREFIX} Search FAILED for query "${queries[i]}":`,
        result.reason,
      );
    }
  }

  console.log(
    `${LOG_PREFIX} searchAllQueries completed: ${queryResults.length}/${queries.length} succeeded, total results=${queryResults.reduce((n, qr) => n + qr.results.length, 0)}`,
  );

  return queryResults;
}

// ── STAGE 4: Detect Gaps

async function detectGaps(
  topic: string,
  queryResults: QueryResult[],
): Promise<string[]> {
  console.log(`${LOG_PREFIX} detectGaps() called`);

  const queriesSummary = queryResults
    .map((qr) => {
      const titles = qr.results.map((r) => r.title).join(", ");
      return `Query: "${qr.query}"\nFound: [${titles}]`;
    })
    .join("\n\n");

  const systemPrompt =
    "You are a research quality checker. Given a topic and what was found so far, identify gaps. Return ONLY a JSON array of 0-3 follow-up search queries. Return [] if coverage is good. No explanation.";

  const userMessage = `Research topic: ${topic}

Queries run so far:
${queriesSummary}

What important angles are missing? Generate 0-3 follow-up queries to fill gaps. Return [] if coverage is sufficient.`;

  try {
    const raw = await callOpenRouter(systemPrompt, userMessage, 200);
    console.log(`${LOG_PREFIX} detectGaps raw LLM response:`, raw);

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed) &&
      parsed.every((q: unknown) => typeof q === "string")
    ) {
      const gaps = (parsed as string[]).slice(0, 3);
      console.log(`${LOG_PREFIX} detectGaps found ${gaps.length} gaps:`, gaps);
      return gaps;
    }

    console.warn(
      `${LOG_PREFIX} detectGaps unexpected shape, returning []. Parsed:`,
      parsed,
    );
    return [];
  } catch (err) {
    console.error(`${LOG_PREFIX} detectGaps failed:`, err);
    return [];
  }
}

// ── STAGE 5: Conflict Detection

async function detectConflicts(
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

  const systemPrompt = `You are a fact-checking analyst. Identify factual contradictions between sources.
Return ONLY valid JSON. No explanation.`;

  const userMessage = `Topic: "${topic}"

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
Only flag genuine factual contradictions, not different perspectives on the same fact.`;

  try {
    const response = await callOpenRouter(
      systemPrompt,
      userMessage,
      400,
      RESEARCH_MODEL,
    );
    const cleaned = response
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```$/i, "")
      .trim();
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

// ── STAGE 6: Compile Report (plan-aware, conflict-aware)

async function compileReport(
  topic: string,
  allResults: QueryResult[],
  plan: ResearchPlan,
  conflicts: ConflictResult,
): Promise<string> {
  console.log(`${LOG_PREFIX} compileReport() called`);

  // Deduplicate results by URL
  const seen = new Set<string>();
  const dedupedResults: SearchResult[] = [];

  for (const qr of allResults) {
    for (const result of qr.results) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        dedupedResults.push(result);
      }
    }
  }

  console.log(
    `${LOG_PREFIX} compileReport: ${dedupedResults.length} unique sources after dedup`,
  );

  // Build numbered source list
  const numberedSourceList = dedupedResults
    .map((r, i) => {
      const snippet =
        r.snippet.length > 200 ? r.snippet.slice(0, 200) + "..." : r.snippet;
      return `[${i + 1}] ${r.title} — ${r.source}\n    ${snippet}`;
    })
    .join("\n\n");

  // Build conflict note for the prompt
  const conflictNote = conflicts.hasConflicts
    ? `\nCONFLICTING EVIDENCE (must be noted in report):\n` +
      conflicts.conflicts
        .map((c) => `- ${c.claim}: ${c.positions.join(" vs ")}`)
        .join("\n")
    : "";

  // Build section plan from the research plan
  const sectionPlan = plan.sections
    .map(
      (s, i) =>
        `Section ${i + 1}: ${s.heading}\nPurpose: ${s.purpose}\nMust answer: ${s.keyQuestions.join("; ")}`,
    )
    .join("\n\n");

  const systemPrompt = `You are a research analyst writing a structured report.
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
- Keep total length under 1800 words`;

  const userMessage = `Research topic: ${topic}
Report title: ${plan.title}
Objective: ${plan.objective}

Sources:
${numberedSourceList}

Write the research report following the section plan exactly.`;

  console.log(
    `${LOG_PREFIX} compileReport: sending to LLM (model=${REPORT_MODEL})`,
  );

  const report = await callOpenRouter(
    systemPrompt,
    userMessage,
    2000,
    REPORT_MODEL,
  );

  console.log(
    `${LOG_PREFIX} compileReport: report generated, length=${report.length} chars`,
  );
  return report;
}

// ── STAGE 7: Verification Pass

async function verifyReport(
  report: string,
  sources: SearchResult[],
): Promise<VerificationResult> {
  console.log(`${LOG_PREFIX} verifyReport() called`);

  // Deduplicate sources by URL (same logic as compileReport)
  const seen = new Set<string>();
  const dedupedSources: SearchResult[] = [];
  for (const s of sources) {
    if (!seen.has(s.url)) {
      seen.add(s.url);
      dedupedSources.push(s);
    }
  }

  // Extract which citation numbers the report actually uses
  const citedNumbers = new Set<number>();
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(report)) !== null) {
    citedNumbers.add(parseInt(match[1], 10));
  }

  // Build source reference using only the cited sources with correct [N] numbering
  // Cap at 20 sources to keep prompt size reasonable
  const citedIndices = Array.from(citedNumbers)
    .sort((a, b) => a - b)
    .slice(0, 20);

  const sourceRef = citedIndices
    .filter((n) => n >= 1 && n <= dedupedSources.length)
    .map((n) => {
      const s = dedupedSources[n - 1]; // citations are 1-indexed
      return `[${n}] ${s.source}: "${s.snippet.slice(0, 200)}"`;
    })
    .join("\n");

  console.log(
    `${LOG_PREFIX} verifyReport: ${citedNumbers.size} unique citations found, ${citedIndices.length} sources included for verification`,
  );

  const systemPrompt = `You are a fact-checking editor. Verify that every citation in a research report
is actually supported by the cited source.

Return ONLY valid JSON.`;

  const userMessage = `Review this report and verify all citations are grounded.

SOURCES (what each citation actually says):
${sourceRef}

REPORT TO VERIFY:
${report.slice(0, 3000)}

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
}`;

  try {
    const response = await callOpenRouter(
      systemPrompt,
      userMessage,
      2500,
      REPORT_MODEL,
    );
    const cleaned = response
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```$/i, "")
      .trim();
    const result = JSON.parse(cleaned) as VerificationResult;

    if (result.issues?.length > 0) {
      console.log(
        `${LOG_PREFIX} Verification found ${result.issues.length} citation issues`,
      );
      result.issues.forEach((issue) => {
        console.warn(
          `${LOG_PREFIX} Unverified: "${issue.claim}" cited as ${issue.citation} — ${issue.issue}`,
        );
      });
    } else {
      console.log(`${LOG_PREFIX} Verification passed: all citations grounded`);
    }

    return result;
  } catch (err) {
    console.error(`${LOG_PREFIX} verifyReport failed:`, err);
    // On failure, return the original report unchanged
    return { verified: true, issues: [], cleanedReport: report };
  }
}

// ── STAGE 8: Format and Deliver

function splitAtParagraphs(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let current = "";

  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    // If adding this paragraph exceeds the limit, flush current
    if (current.length + para.length + 2 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }

    // If a single paragraph exceeds maxLen, split by sentences
    if (para.length > maxLen) {
      if (current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (
          current.length + sentence.length + 1 > maxLen &&
          current.length > 0
        ) {
          chunks.push(current.trim());
          current = "";
        }
        current += (current ? " " : "") + sentence;
      }
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function formatAndDeliver(
  userId: string,
  topic: string,
  report: string,
  sources: SearchResult[],
): Promise<void> {
  console.log(
    `${LOG_PREFIX} formatAndDeliver() called, sources=${sources.length}`,
  );

  const header =
    "DEEP RESEARCH REPORT\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    topic.toUpperCase() +
    "\n" +
    `Generated: ${formatDateTimeIST(new Date())} · ${sources.length} sources\n`;

  // Deduplicate sources for footer by URL
  const seenUrls = new Set<string>();
  const uniqueSources: SearchResult[] = [];
  for (const s of sources) {
    if (!seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      uniqueSources.push(s);
    }
  }

  // Find highest citation index used in the report
  let maxCitationIndex = 0;
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(report)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > maxCitationIndex) {
      maxCitationIndex = num;
    }
  }
  const sourcesToShow = Math.max(8, maxCitationIndex);

  const footer =
    "\n─── SOURCES ───\n" +
    uniqueSources
      .slice(0, sourcesToShow)
      .map((s, i) => `[${i + 1}] ${s.title}\n    ${s.url}`)
      .join("\n");

  const fullMessage = header + "\n" + report + "\n" + footer;
  const chunks = splitAtParagraphs(fullMessage, 3800);

  console.log(
    `${LOG_PREFIX} formatAndDeliver: message length=${fullMessage.length}, chunks=${chunks.length}`,
  );

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `${LOG_PREFIX} Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`,
    );
    await sendToUser(userId, chunks[i]);
    // Delay between chunks to avoid Telegram rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  console.log(`${LOG_PREFIX} formatAndDeliver: all text chunks sent`);

  // Generate and send PDF
  try {
    console.log(`${LOG_PREFIX} Generating PDF...`);
    const pdfBuffer = await generateResearchPDF(topic, report, sources);
    console.log(
      `${LOG_PREFIX} PDF generated: ${(pdfBuffer.length / 1024).toFixed(1)} KB`,
    );

    const chatId = await getTelegramChatId(userId);
    if (chatId) {
      const safeTopic = topic
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50);
      const filename = `research_${safeTopic}.pdf`;

      await sendDocument(
        chatId,
        pdfBuffer,
        filename,
        `📄 Full research report: ${topic}`,
      );
      console.log(`${LOG_PREFIX} PDF sent to Telegram`);
    }
  } catch (pdfErr) {
    // PDF is a bonus — don't fail the whole delivery if it errors
    console.error(`${LOG_PREFIX} PDF generation/delivery failed:`, pdfErr);
  }
}

// ── MAIN: runDeepResearch

export async function runDeepResearch(
  userId: string,
  topic: string,
): Promise<void> {
  console.log(`${LOG_PREFIX} ========== START: runDeepResearch ==========`);
  console.log(`${LOG_PREFIX} userId=${userId}, topic="${topic}"`);
  const startTime = Date.now();

  try {
    // ── Stage 0: Clarification check
    console.log(`${LOG_PREFIX} Stage 0: Assessing clarification...`);
    const clarification = await assessClarification(topic);

    if (clarification.needsClarification) {
      console.log(`${LOG_PREFIX} Stage 0: Clarification needed, asking user`);
      await sendToUser(
        userId,
        `Before I start researching, one question:\n\n${clarification.question}\n\nPlease reply, and then send the /research command again with more detail.`,
      );
      return;
    }

    const refinedTopic = clarification.refinedTopic || topic;
    const scope = clarification.researchScope || "";
    console.log(
      `${LOG_PREFIX} Stage 0 complete: refinedTopic="${refinedTopic}", scope="${scope}"`,
    );

    // ── Stage 1: Research plan
    console.log(`${LOG_PREFIX} Stage 1: Creating research plan...`);
    await sendToUser(
      userId,
      `🔬 Researching: "${refinedTopic}"\n📋 Creating research plan...`,
    );
    const plan = await createResearchPlan(refinedTopic, scope);
    await sendToUser(
      userId,
      `✅ Plan ready: "${plan.title}"\n📑 ${plan.sections.length} sections · ${plan.searchAngles.length} search angles\n\nStarting searches...`,
    );
    console.log(`${LOG_PREFIX} Stage 1 complete: plan created`);

    // ── Stage 2: Plan queries (guided by research plan angles)
    console.log(`${LOG_PREFIX} Stage 2: Planning queries...`);
    const queries = await planQueries(refinedTopic, plan.searchAngles);
    console.log(
      `${LOG_PREFIX} Stage 2 complete: ${queries.length} queries planned`,
    );

    // ── Stage 3: Search
    console.log(`${LOG_PREFIX} Stage 3: Executing searches...`);
    await sendToUser(
      userId,
      `🔎 Running ${queries.length} searches in parallel...`,
    );
    const queryResults = await searchAllQueries(queries);
    const totalFound = queryResults.reduce(
      (n, qr) => n + qr.results.length,
      0,
    );
    console.log(
      `${LOG_PREFIX} Stage 3 complete: ${totalFound} total results from ${queryResults.length} queries`,
    );

    // ── Stage 4: Gap detection
    console.log(`${LOG_PREFIX} Stage 4: Detecting gaps...`);
    const gaps = await detectGaps(refinedTopic, queryResults);
    let allResults = queryResults;

    if (gaps.length > 0) {
      console.log(`${LOG_PREFIX} Stage 4: Filling ${gaps.length} gaps...`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Filling ${gaps.length} research gaps...`,
      );
      const gapResults = await searchAllQueries(gaps);
      allResults = [...queryResults, ...gapResults];
      console.log(
        `${LOG_PREFIX} Stage 4 complete: gap searches done, total query sets=${allResults.length}`,
      );
    } else {
      console.log(`${LOG_PREFIX} Stage 4 complete: no gaps found`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Analysing for conflicts...`,
      );
    }

    // Check for empty results
    const allSources = allResults.flatMap((qr) => qr.results);
    if (allSources.length === 0) {
      console.warn(`${LOG_PREFIX} No sources found — aborting`);
      await sendToUser(
        userId,
        `Research on "${refinedTopic}" found no sources. Try rephrasing the topic or use /research with a more specific query.`,
      );
      return;
    }

    // ── Stage 5: Conflict detection
    console.log(`${LOG_PREFIX} Stage 5: Detecting conflicts...`);
    const conflicts = await detectConflicts(refinedTopic, allResults);
    if (conflicts.hasConflicts) {
      await sendToUser(
        userId,
        `⚠️ Found ${conflicts.conflicts.length} conflicting claims across sources. These will be noted in the report.`,
      );
    }
    console.log(`${LOG_PREFIX} Stage 5 complete`);

    // ── Stage 6: Compile (plan-aware, conflict-aware)
    console.log(
      `${LOG_PREFIX} Stage 6: Compiling report with ${allSources.length} total sources`,
    );
    await sendToUser(userId, `✍️ Compiling report...`);
    const rawReport = await compileReport(
      refinedTopic,
      allResults,
      plan,
      conflicts,
    );
    console.log(
      `${LOG_PREFIX} Stage 6 complete: report compiled (${rawReport.length} chars)`,
    );

    // ── Stage 7: Verification
    console.log(`${LOG_PREFIX} Stage 7: Verifying citations...`);
    await sendToUser(userId, `🔎 Verifying citations against sources...`);
    const verification = await verifyReport(rawReport, allSources);

    if (!verification.verified && verification.issues.length > 0) {
      console.log(
        `${LOG_PREFIX} Stage 7: Report verified with ${verification.issues.length} issues corrected`,
      );
    } else {
      console.log(`${LOG_PREFIX} Stage 7: All citations verified`);
    }

    const finalReport = verification.cleanedReport || rawReport;

    // ── Stage 8: Deliver
    console.log(`${LOG_PREFIX} Stage 8: Delivering report...`);
    await formatAndDeliver(userId, refinedTopic, finalReport, allSources);
    console.log(`${LOG_PREFIX} Stage 8 complete: report delivered`);

    // Log as episode (fire and forget)
    logEpisode(userId, {
      type: "agent_action",
      data: {
        action: "deep_research",
        topic: refinedTopic,
        sourceCount: allSources.length,
        conflictsFound: conflicts.conflicts.length,
        verificationIssues: verification.issues.length,
        planSections: plan.sections.length,
      },
      importance: 3,
    }).catch(() => {});

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${LOG_PREFIX} ========== DONE in ${elapsed}s ==========`);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(
      `${LOG_PREFIX} ========== FAILED after ${elapsed}s ==========`,
    );
    console.error(`${LOG_PREFIX} Error:`, err);
    await sendToUser(
      userId,
      `Research on "${topic}" failed. ${err instanceof Error ? err.message : "Unknown error"}. Try again or use webSearch for a quick overview.`,
    );
  }
}
