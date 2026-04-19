import type { AgentMessage } from "@/lib/types/agent";
import { TRIAGE_MODEL } from "@/lib/models";

export type TriageRoute = "direct" | "chat" | "task" | "research";

export interface TriageResult {
  route: TriageRoute;
  directReply?: string; // only when route === 'direct'
  confidence: number;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Fast triage call using Claude Haiku to classify message intent
 * Cost: ~300 tokens, ~200ms latency
 */
export async function triageMessage(
  message: string,
  memoryContext: string,
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const systemPrompt = `Classify message to route. Return 1-line JSON: {"route":"direct|chat|task|research","directReply":string|null,"confidence":0-1}
RULES:
- direct: greetings or general knowledge you can answer (e.g., "what are webhooks?", "hi"). Provide full answer in "directReply", set route:"direct".
- chat: open-ended conversation, brainstorming. No tools. route:"chat", directReply:null.
- task: requires personal tools (email, calendar, memory, journal). route:"task", directReply:null.
- research: ONLY if explicitly requesting web search, latest news, or deep research. NEVER use for general knowledge. route:"research", directReply:null.
MEMORY: ${memoryContext || "None"}
Output ONLY JSON. No explanation.`;

  const messages: AgentMessage[] = [
    {
      role: "user",
      content: `Message to classify:\n"${message}"`,
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

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
        model: TRIAGE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.1, // Low temperature for consistent classification
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Triage] OpenRouter error: ${res.status}: ${body}`);
      // Default to "task" if triage fails
      return { route: "task", confidence: 0.5 };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("[Triage] Empty response from triage model");
      return { route: "task", confidence: 0.5 };
    }

    // Parse JSON response
    const trimmed = content.trim();
    const result = JSON.parse(trimmed) as TriageResult;

    // Validate result shape
    if (!result.route || typeof result.confidence !== "number") {
      console.warn("[Triage] Invalid response format", result);
      return { route: "task", confidence: 0.5 };
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[Triage] Request timeout");
    } else {
      console.error("[Triage] Error:", error);
    }

    // Safe fallback: route to task agent
    return { route: "task", confidence: 0.5 };
  }
}
