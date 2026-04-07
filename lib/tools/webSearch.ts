import { searchWeb } from '@/lib/search/searchWeb';

/**
 * Tool wrapper for the react agent's webSearch tool.
 * Fetches results via the shared searchWeb primitive and formats them
 * into a readable string. The main react agent LLM handles synthesis.
 *
 * The raw searchWeb() function in lib/search/searchWeb.ts is also
 * available for direct import by the deep research agent, which will
 * run its own multi-query orchestration and synthesis.
 */
export async function runWebSearch(input: {
  query: string;
  topic?: 'general' | 'news';
}): Promise<string> {
  const results = await searchWeb(input.query, {
    maxResults: 5,
    topic: input.topic,
  });

  if (!results || results.length === 0) {
    return 'No results found for that query.';
  }

  // Format results into a readable block for the agent LLM
  const formattedResults = results
    .map((r, i) => {
      const dateStr = r.publishedDate ? ` | Published: ${r.publishedDate}` : '';
      return `[${i + 1}] ${r.title} (${r.source}${dateStr})\n${r.snippet}`;
    })
    .join('\n\n');

  const sources = results
    .slice(0, 3)
    .map((r) => `- ${r.source}: ${r.url}`)
    .join('\n');

  return `${formattedResults}\n\nSources:\n${sources}`;
}
