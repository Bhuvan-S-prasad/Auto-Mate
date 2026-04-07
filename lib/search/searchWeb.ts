export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export interface SearchOptions {
  maxResults?: number;
  topic?: 'general' | 'news';
}

export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: options.maxResults ?? 5,
      topic: options.topic ?? 'general',
      include_answer: false,
      search_depth: 'basic'
    }),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  const data = await response.json();
  const results: SearchResult[] = (data.results || []).map(
    (r: {
      title: string;
      url: string;
      content: string;
      published_date?: string;
    }) => {
      let source = r.url || '';
      try {
        if (r.url) {
          source = new URL(r.url).hostname.replace('www.', '');
        }
      } catch {
        // Ignore URL parse error and fallback to string
      }

      return {
        title: r.title || '',
        url: r.url || '',
        snippet: r.content || '',
        source,
        publishedDate: r.published_date ?? undefined,
      };
    }
  );

  return results;
}
