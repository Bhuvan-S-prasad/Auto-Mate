import { searchWeb } from "@/lib/search/searchWeb";
import type { SearchResult } from "@/lib/search/searchWeb";
import sendMessage from "@/lib/Telegram/send-message";
import { prisma } from "@/lib/prisma";
import { logEpisode } from "@/lib/agents/memory";
import { formatDateTimeIST } from "@/lib/utils/istDate";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RESEARCH_MODEL = "google/gemini-2.0-flash-001";
const REPORT_MODEL = "google/gemini-2.0-flash-001";

const LOG_PREFIX = "[DeepResearch]";

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

  console.log(`${LOG_PREFIX} Calling OpenRouter model=${model} maxTokens=${maxTokens}`);

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

// ── FUNCTION 1: planQueries

const PLAN_SYSTEM_PROMPT = `You are a research query strategist. Your goal is to generate highly specific, diverse search queries that together provide comprehensive coverage of a topic.

Rules:
- Return ONLY a valid JSON array of strings — no explanation, no markdown, no code fences.
- Each query should target a distinct angle or subtopic.
- Queries should be specific enough to return focused results, not vague or generic.
- Use natural language phrasing that works well with search engines.
- Avoid redundancy — each query must add unique informational value.
- Prioritize queries that would surface recent, authoritative, or data-rich sources.`;

async function planQueries(topic: string): Promise<string[]> {
  console.log(`${LOG_PREFIX} planQueries() called with topic="${topic}"`);

  const userMessage = `Topic: ${topic}

Generate 5 distinct search queries covering these angles:
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
      console.log(`${LOG_PREFIX} planQueries generated ${parsed.length} queries:`, parsed);
      return parsed as string[];
    }

    // wrong shape — fallback
    console.warn(`${LOG_PREFIX} planQueries unexpected shape, using fallback. Parsed:`, parsed);
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

// ── FUNCTION 2: searchAllQueries

interface QueryResult {
  query: string;
  results: SearchResult[];
}

async function searchAllQueries(queries: string[]): Promise<QueryResult[]> {
  console.log(`${LOG_PREFIX} searchAllQueries() called with ${queries.length} queries`);

  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      console.log(`${LOG_PREFIX} Searching: "${query}"`);
      const results = await searchWeb(query, {
        maxResults: 4,
        topic: "general",
      });
      console.log(`${LOG_PREFIX} Search "${query}" returned ${results.length} results`);
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

// ── FUNCTION 3: detectGaps

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

    console.warn(`${LOG_PREFIX} detectGaps unexpected shape, returning []. Parsed:`, parsed);
    return [];
  } catch (err) {
    console.error(`${LOG_PREFIX} detectGaps failed:`, err);
    return [];
  }
}

// ── FUNCTION 4: compileReport

const REPORT_SYSTEM_PROMPT = `You are a research analyst writing a detailed report.
Use ONLY the provided sources. Cite sources inline as [N] matching the source numbers provided.

Write the report in this exact structure:

EXECUTIVE SUMMARY
[2-3 sentences: the single most important finding]

INTRODUCTION
[What this topic is, why it matters, scope of this research. 2 paragraphs.]

KEY FINDINGS
[3-5 numbered findings, each with a heading and 2-3 sentences of detail with inline citations]

ANALYSIS
[Synthesis: patterns across findings, contradictions between sources, your assessment of confidence in the conclusions]

LIMITATIONS
[What this research could not cover. Where sources were sparse or conflicting. What a deeper investigation would need.]

Use plain text. No markdown headers (they don't render in Telegram).
Use --- before each section name. Keep total length under 1800 words.`;

async function compileReport(
  topic: string,
  allResults: QueryResult[],
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

  console.log(`${LOG_PREFIX} compileReport: ${dedupedResults.length} unique sources after dedup`);

  // Build numbered source list
  const numberedSourceList = dedupedResults
    .map((r, i) => {
      const snippet =
        r.snippet.length > 200 ? r.snippet.slice(0, 200) + "..." : r.snippet;
      return `[${i + 1}] ${r.title} — ${r.source}\n    ${snippet}`;
    })
    .join("\n\n");

  const userMessage = `Research topic: ${topic}

Sources:
${numberedSourceList}

Write the research report.`;

  console.log(`${LOG_PREFIX} compileReport: sending to LLM (model=${REPORT_MODEL})`);

  const report = await callOpenRouter(
    REPORT_SYSTEM_PROMPT,
    userMessage,
    2000,
    REPORT_MODEL,
  );

  console.log(`${LOG_PREFIX} compileReport: report generated, length=${report.length} chars`);
  return report;
}

// ── FUNCTION 5: formatAndDeliver

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
  console.log(`${LOG_PREFIX} formatAndDeliver() called, sources=${sources.length}`);

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

  console.log(`${LOG_PREFIX} formatAndDeliver: message length=${fullMessage.length}, chunks=${chunks.length}`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(`${LOG_PREFIX} Sending chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    await sendToUser(userId, chunks[i]);
    // Delay between chunks to avoid Telegram rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  console.log(`${LOG_PREFIX} formatAndDeliver: all chunks sent`);
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
    // Plan
    console.log(`${LOG_PREFIX} Step 1: Planning queries...`);
    await sendToUser(
      userId,
      `🔬 Researching: "${topic}"\nPlanning search strategy...`,
    );
    const queries = await planQueries(topic);
    console.log(`${LOG_PREFIX} Step 1 complete: ${queries.length} queries planned`);

    // Search
    console.log(`${LOG_PREFIX} Step 2: Executing searches...`);
    await sendToUser(
      userId,
      `📋 Running ${queries.length} searches in parallel...`,
    );
    const queryResults = await searchAllQueries(queries);
    const totalFound = queryResults.reduce((n, qr) => n + qr.results.length, 0);
    console.log(`${LOG_PREFIX} Step 2 complete: ${totalFound} total results from ${queryResults.length} queries`);

    // Gap detection
    console.log(`${LOG_PREFIX} Step 3: Detecting gaps...`);
    const gaps = await detectGaps(topic, queryResults);
    let allResults = queryResults;

    if (gaps.length > 0) {
      console.log(`${LOG_PREFIX} Step 3: Filling ${gaps.length} gaps...`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Filling ${gaps.length} research gaps...`,
      );
      const gapResults = await searchAllQueries(gaps);
      allResults = [...queryResults, ...gapResults];
      console.log(`${LOG_PREFIX} Step 3 complete: gap searches done, total queries=${allResults.length}`);
    } else {
      console.log(`${LOG_PREFIX} Step 3 complete: no gaps found`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Compiling report...`,
      );
    }

    // Compile
    const allSources = allResults.flatMap((qr) => qr.results);
    console.log(`${LOG_PREFIX} Step 4: Compiling report with ${allSources.length} total sources`);

    if (allSources.length === 0) {
      console.warn(`${LOG_PREFIX} Step 4: No sources found — aborting`);
      await sendToUser(
        userId,
        `Research on "${topic}" found no sources. Try rephrasing the topic or use /research with a more specific query.`,
      );
      return;
    }

    const report = await compileReport(topic, allResults);
    console.log(`${LOG_PREFIX} Step 4 complete: report compiled (${report.length} chars)`);

    // Deliver
    console.log(`${LOG_PREFIX} Step 5: Delivering report...`);
    await formatAndDeliver(userId, topic, report, allSources);
    console.log(`${LOG_PREFIX} Step 5 complete: report delivered`);

    // Log as episode (fire and forget)
    logEpisode(userId, {
      type: "agent_action",
      data: {
        action: "deep_research",
        topic,
        sourceCount: allSources.length,
      },
      importance: 3,
    }).catch(() => {});

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${LOG_PREFIX} ========== DONE in ${elapsed}s ==========`);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`${LOG_PREFIX} ========== FAILED after ${elapsed}s ==========`);
    console.error(`${LOG_PREFIX} Error:`, err);
    await sendToUser(
      userId,
      `Research on "${topic}" failed. ${err instanceof Error ? err.message : "Unknown error"}. Try again or use webSearch for a quick overview.`,
    );
  }
}
