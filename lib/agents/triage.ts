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
  lastRoute?: string,
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const systemPrompt = `You are an intent classification router for an AI assistant.
Classify the user's latest message into one of four routes based on its intent, taking the recent conversation into account.

ROUTES:
- direct: General knowledge or greetings that require no tools. Provide the answer in "directReply".
- search: Queries requiring live web search for facts, news, or deep-dives into a topic.
- task: Requests requiring personal tools (email, calendar, memory) or a combination of tools and web search.
- chat: Casual conversation, brainstorming, or discussion not requiring external tools.

ROUTING PRINCIPLES:
1. Context is King: Always interpret the latest message within the flow of the RECENT CONVERSATION. Expand ambiguous references (e.g., "what about X?", "do it") using prior messages.
2. Workflow Continuity: If a user is exploring a topic or completing a multi-step request, maintain the LAST ROUTE USED unless their new message clearly demands a different toolset. 
3. Tool Necessity: Route to "chat" ONLY if the request can be completely fulfilled without any tools, external searches, or active workflows.

LAST ROUTE USED: ${lastRoute || "None"}
MEMORY: ${memoryContext || "None"}
RECENT CONVERSATION:
${
  scratchpad
    .slice(-5)
    .map((m) => m.role + ": " + m.content)
    .join("\n") || "None"
}

Return ONLY a 1-line JSON: {"route":"direct|chat|task|search","directReply":string|null,"confidence":0-1}
IMPORTANT: Ensure your output is strictly valid JSON. Properly escape any double quotes or newlines inside the "directReply" string.
No markdown, no explanation.`;

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

    // Parse JSON response avoiding markdown code blocks
    let jsonString = content.trim();
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      jsonString = match[1].trim();
    }
    const result = JSON.parse(jsonString) as TriageResult;

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
