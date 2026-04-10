import { searchWeb } from "@/lib/search/searchWeb";
import { callOpenRouter, extractJson } from "../utils";
import { QueryResult, LOG_PREFIX } from "@/lib/types/research";
import { searchPrompts } from "@/lib/prompts/deep-research-prompts";

// ── STAGE 3: Search All Queries

export async function searchAllQueries(
  queries: string[],
): Promise<QueryResult[]> {
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

export async function detectGaps(
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

  const systemPrompt = searchPrompts.detectGapsSystem();
  const userMessage = searchPrompts.detectGapsUser(topic, queriesSummary);

  try {
    const raw = await callOpenRouter(systemPrompt, userMessage, 200, undefined, true);
    console.log(`${LOG_PREFIX} detectGaps raw LLM response:`, raw);

    const cleaned = extractJson(raw);

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
