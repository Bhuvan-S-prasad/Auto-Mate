import { prisma } from "@/lib/prisma";
import { sendToUser } from "@/lib/Telegram/user-service";
import { buildMemoryContext } from "@/lib/agents/agent-tools/memory";
import { getPersonalityInstruction } from "@/lib/constants/personality";
import type { AgentMessage } from "@/lib/types/agent";
import { CHAT_MODEL } from "@/lib/models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";


export async function runChatAgent(
  userId: string,
  message: string,
): Promise<string> {
  try {
    // Retrieve user preferences for personality
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const personalityInstruction = getPersonalityInstruction(
      user?.preferences as Record<string, unknown> | null,
    );

    // Build memory context (but lighter for chat)
    let memoryContext = "";
    try {
      memoryContext = await buildMemoryContext(userId, message);
    } catch {
      // If memory fails, continue without it
    }

    // Build chat-specific system prompt (no tools)
    const systemPrompt = buildChatSystemPrompt(
      memoryContext,
      personalityInstruction,
    );

    const messages: AgentMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        model: CHAT_MODEL,
        messages,
        temperature: 0.7, 
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      console.error(`[ChatAgent] OpenRouter error: ${res.status}: ${body}`);
      return "Sorry, I encountered an error. Please try again.";
    }

    const data = await res.json();
    const responseText =
      data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    // Send response to user via Telegram
    await sendToUser(userId, responseText);

    return responseText;
  } catch (error) {
    console.error("[ChatAgent] Error:", error);
    const fallback = "Something went wrong. Please try again.";
    await sendToUser(userId, fallback);
    return fallback;
  }
}

/**
 * Build a lightweight system prompt for chat (no tools, no approval protocol)
 */
function buildChatSystemPrompt(
  memoryContext: string,
  personalityInstruction: string | null,
): string {
  const safePersonality = personalityInstruction
    ? personalityInstruction.slice(0, 1000)
    : null;
  const safeMemory = memoryContext ? memoryContext.slice(0, 2000) : null;

  return `You are Auto-Mate, a personal AI assistant inside Telegram.
You are having a casual conversation. You DO NOT have access to tools right now.
Be natural, warm, and conversational. Match the user's energy and tone.

${
  safePersonality
    ? `Communication style preference: "${safePersonality}"`
    : ""
}

${
  safeMemory
    ? `User context (use silently): ${safeMemory}`
    : ""
}

Keep responses concise (1-3 sentences usually). Be direct and genuine.
If the user asks you to do something that requires tools, suggest they ask directly (e.g., "Check my emails").`;
}
