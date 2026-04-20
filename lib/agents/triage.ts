import type { AgentMessage } from "@/lib/types/agent";
import { TRIAGE_MODEL } from "@/lib/models";

export type TriageRoute = "direct" | "chat" | "task" | "search";

export interface TriageResult {
  route: TriageRoute;
  directReply?: string; // only when route === 'direct'
  confidence: number;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function triageMessage(
  message: string,
  memoryContext: string,
  scratchpad: AgentMessage[] = [],
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const systemPrompt = `Classify message to route. Return 1-line JSON: {"route":"direct|chat|task|search","directReply":string|null,"confidence":0-1}
RULES:
- direct: greetings or general knowledge you can answer (e.g., "what are webhooks?", "hi"). Provide full answer in "directReply", set route:"direct".
- chat: open-ended conversation, brainstorming. No tools. route:"chat", directReply:null.
- task: requires personal tools (email, calendar, memory, journal, recall memory). route:"task", directReply:null.
- search: queries requiring live web search for recent events or info outside your training data. Do NOT use if you already know the answer. route:"search", directReply:null.
  *NOTE*: If message needs BOTH web search AND any write/read action (email, calendar, memory, journal) → route to 'task' instead.
MEMORY: ${memoryContext || "None"}
RECENT CONVERSATION:
${
  scratchpad
    .slice(-5)
    .map((m) => m.role + ": " + m.content)
    .join("\n") || "None"
}
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
        messages: [{ role: "system", content: systemPrompt }, ...messages],
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
