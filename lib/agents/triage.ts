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

  const systemPrompt = `You are a message router. Classify this user message into one of four categories.

Return ONLY valid JSON on a single line (no formatting): { "route": "direct|chat|task|research", "directReply": string|null, "confidence": 0-1 }

ROUTING RULES:

direct — trivial greeting, single-word answer, or simple factual question you can answer instantly WITHOUT tools
  Examples: "hi", "hello", "thanks", "what is 2+2", "who invented the telephone"
  Format: route: "direct", directReply: "your answer here", confidence: 0.9+
  Only use for questions that have a single agreed-upon answer or greeting

chat — casual conversation, general knowledge, emotional, or discussion that needs NO tools
  Examples: "ugh mondays", "explain recursion", "I'm stressed", "what's your favorite color", "tell me about Python"
  Format: route: "chat", directReply: null, confidence: 0.7-0.95

task — requires accessing tools like Gmail, Calendar, Memory, or Journal
  Examples: "check my emails", "schedule a meeting", "what did I do last week", "save that I live in Berlin", "draft an email", "who is my manager"
  Format: route: "task", directReply: null, confidence: 0.7-0.95

research — user explicitly asks for news, current events, research, analysis of recent info, or web search
  Examples: "what's the latest on AI", "research quantum computing trends", "news about tech", "find articles on climate change"
  Format: route: "research", directReply: null, confidence: 0.7-0.95

CONFIDENCE RULES:
- Use 0.9+ for very clear classifications
- Use 0.7-0.8 for borderline cases
- If completely ambiguous, default to "chat" with 0.6

MEMORY CONTEXT (may be provided):
${memoryContext ? `Earlier context: ${memoryContext}` : "No earlier context available"}

IMPORTANT: Return ONLY the JSON object on one line. No explanation, no markdown.`;

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
