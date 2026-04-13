import { TOOL_DEFINITIONS } from "@/lib/tools/index";
import type { OpenRouterResponse, AgentMessage } from "@/lib/types/agent";
import { AGENT_MODEL } from "@/lib/models";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Call OpenRouter
export async function callLLM(
  messages: AgentMessage[],
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${body}`);
    }

    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenRouter request timed out after 10 seconds.");
    }
    throw error;
  }
}
