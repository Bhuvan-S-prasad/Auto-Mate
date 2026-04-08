import { searchWeb } from "@/lib/search/searchWeb";
import type { SearchResult } from "@/lib/search/searchWeb";
import sendMessage from "@/lib/Telegram/send-message";
import { prisma } from "@/lib/prisma";
import { logEpisode } from "@/lib/agents/memory";
import { formatDateTimeIST } from "@/lib/utils/istDate";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const RESEARCH_MODEL = "google/gemini-2.0-flash-001";
const REPORT_MODEL = "google/gemini-2.0-flash-001";

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
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
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
      return parsed as string[];
    }

    // wrong shape — fallback
    console.warn("[DeepResearch:planQueries] Unexpected shape, using fallback");
    return getFallbackQueries(topic);
  } catch (err) {
    console.error("[DeepResearch:planQueries] Failed:", err);
    return getFallbackQueries(topic);
  }
}

function getFallbackQueries(topic: string): string[] {
  return [
    topic,
    `${topic} recent developments 2025`,
    `${topic} analysis challenges risks`,
  ];
}

// ── FUNCTION 2: searchAllQueries

interface QueryResult {
  query: string;
  results: SearchResult[];
}

async function searchAllQueries(queries: string[]): Promise<QueryResult[]> {
  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      const results = await searchWeb(query, {
        maxResults: 4,
        topic: "general",
      });
      return { query, results } as QueryResult;
    }),
  );

  const queryResults: QueryResult[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      queryResults.push(result.value);
    } else {
      console.warn(
        `[DeepResearch:searchAllQueries] Query failed:`,
        result.reason,
      );
    }
  }

  return queryResults;
}

// ── FUNCTION 3: detectGaps

async function detectGaps(
  topic: string,
  queryResults: QueryResult[],
): Promise<string[]> {
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

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed) &&
      parsed.every((q: unknown) => typeof q === "string")
    ) {
      return (parsed as string[]).slice(0, 3);
    }

    return [];
  } catch (err) {
    console.error("[DeepResearch:detectGaps] Failed:", err);
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

  return await callOpenRouter(
    REPORT_SYSTEM_PROMPT,
    userMessage,
    2000,
    REPORT_MODEL,
  );
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

  const footer =
    "\n─── SOURCES ───\n" +
    uniqueSources
      .slice(0, 8)
      .map((s, i) => `[${i + 1}] ${s.title}\n    ${s.url}`)
      .join("\n");

  const fullMessage = header + "\n" + report + "\n" + footer;

  const chunks = splitAtParagraphs(fullMessage, 3800);

  for (let i = 0; i < chunks.length; i++) {
    await sendToUser(userId, chunks[i]);
    // Delay between chunks to avoid Telegram rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
}

// ── MAIN: runDeepResearch

export async function runDeepResearch(
  userId: string,
  topic: string,
): Promise<void> {
  try {
    // Plan
    await sendToUser(
      userId,
      `🔬 Researching: "${topic}"\nPlanning search strategy...`,
    );
    const queries = await planQueries(topic);

    // Search
    await sendToUser(
      userId,
      `📋 Running ${queries.length} searches in parallel...`,
    );
    const queryResults = await searchAllQueries(queries);
    const totalFound = queryResults.reduce((n, qr) => n + qr.results.length, 0);

    // Gap detection
    const gaps = await detectGaps(topic, queryResults);
    let allResults = queryResults;

    if (gaps.length > 0) {
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Filling ${gaps.length} research gaps...`,
      );
      const gapResults = await searchAllQueries(gaps);
      allResults = [...queryResults, ...gapResults];
    } else {
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Compiling report...`,
      );
    }

    // Compile
    const report = await compileReport(topic, allResults);
    const allSources = allResults.flatMap((qr) => qr.results);

    // Deliver
    await formatAndDeliver(userId, topic, report, allSources);

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
  } catch (err) {
    console.error("[deepResearch] failed:", err);
    await sendToUser(
      userId,
      `Research on "${topic}" failed. ${err instanceof Error ? err.message : "Unknown error"}. Try again or use webSearch for a quick overview.`,
    );
  }
}
