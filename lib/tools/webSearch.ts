import { searchWeb } from '@/lib/search/searchWeb';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export async function runWebSearch(input: {
  query: string;
  topic?: 'general' | 'news';
}): Promise<string> {
  // 1. Call searchWeb
  const results = await searchWeb(input.query, {
    maxResults: 5,
    topic: input.topic,
  });

  // 2. Handle empty results
  if (!results || results.length === 0) {
    return 'No results found for that query.';
  }

  // 3. Format results
  const formattedResults = results
    .map((r, i) => {
      const dateStr = r.publishedDate ? ` — published: ${r.publishedDate}` : '';
      return `[${i + 1}] ${r.title} (${r.source})${dateStr}\n${r.snippet}`;
    })
    .join('\n\n');

  // 4. Call OpenRouter chat completions API
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Agent WebSearch',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-001',
        max_tokens: 300,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              "You are a search result synthesiser. Answer the query concisely using only the provided search results. Cite sources as (domain.com) inline after each claim. 3-5 sentences max. Plain text only. If results don't answer the query, say so.",
          },
          {
            role: 'user',
            content: `Query: ${input.query}\n\nResults:\n${formattedResults}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content?.trim();

    if (!contentText) {
      throw new Error('Failed to extract content from synthesis API.');
    }

    // 6. Append source URLs at the bottom
    const topSources = results
      .slice(0, 3)
      .map((r) => `- ${r.source}: ${r.url}`)
      .join('\n');
    
    // 7. Return the final combined string
    return `${contentText}\n\nSources:\n${topSources}`;
  } catch (error) {
    console.error('runWebSearch synthesis error:', error);
    // Fallback: return raw results if synthesis fails
    const topSources = results
      .slice(0, 3)
      .map((r) => `- ${r.source}: ${r.url}`)
      .join('\n');
    return `Raw search results found, but failed to synthesize an answer.\n\nSources:\n${topSources}`;
  }
}
