import { TOOL_DEFINITIONS } from "@/lib/tools/index";
import type { OpenRouterResponse } from "@/lib/types/agent";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const AGENT_MODEL = "google/gemini-2.0-flash-lite-001";

// Call OpenRouter
export async function callLLM(
  messages: Record<string, unknown>[],
): Promise<OpenRouterResponse> {
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
      model: AGENT_MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  return res.json();
}
