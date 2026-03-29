const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";
const MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 8000;

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}


export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const truncated = text.slice(0, MAX_INPUT_CHARS);

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Auto-Mate",
    },
    body: JSON.stringify({
      model: MODEL,
      input: truncated,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenRouter embedding request failed (${response.status}): ${errorBody}`,
    );
  }

  const json: EmbeddingResponse = await response.json();

  if (!json.data?.[0]?.embedding) {
    throw new Error("OpenRouter returned unexpected embedding response shape");
  }

  return json.data[0].embedding;
}
