import { prisma } from "@/lib/prisma";
import sendMessage from "@/lib/Telegram/send-message";
import { OPENROUTER_URL, RESEARCH_MODEL, LOG_PREFIX } from "../types/research";

export async function getTelegramChatId(
  userId: string,
): Promise<number | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: "telegram" },
  });
  if (!integration?.telegramChatId) return null;
  return Number(integration.telegramChatId);
}

function redactUserId(userId: string): string {
  if (userId.length <= 8) return "****";
  return userId.slice(0, 4) + "..." + userId.slice(-4);
}

export async function sendToUser(userId: string, text: string): Promise<void> {
  const chatId = await getTelegramChatId(userId);
  if (chatId) {
    await sendMessage(chatId, text);
  } else {
    console.warn(
      `${LOG_PREFIX} No Telegram chatId found for user ${redactUserId(userId)}`,
    );
  }
}

export async function callOpenRouter(
  systemPrompt: string,
  userContent: string,
  maxTokens = 512,
  model = RESEARCH_MODEL,
  expectJson = false,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  console.log(
    `${LOG_PREFIX} Calling OpenRouter model=${model} maxTokens=${maxTokens} jsonMode=${expectJson}`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

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
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      console.error(`${LOG_PREFIX} OpenRouter error ${res.status}:`, body);
      throw new Error(`OpenRouter ${res.status}: ${body}`);
    }

    const json = await res.json();
    const content = (json.choices?.[0]?.message?.content ?? "").trim();
    console.log(`${LOG_PREFIX} OpenRouter response length=${content.length}`);
    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`OpenRouter request timed out after 60 seconds`);
    }
    throw err;
  }
}

export function extractJson(text: string): string {
  // Try to match standard markdown code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    return match[1].trim();
  }
  // Fallback: try to find the start and end of a JSON object or array
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  
  if (objStart !== -1 || arrStart !== -1) {
    const start = objStart !== -1 && arrStart !== -1 ? Math.min(objStart, arrStart) : Math.max(objStart, arrStart);
    const endChar = text[start] === '{' ? '}' : ']';
    const end = text.lastIndexOf(endChar);
    if (end > start) {
      return text.substring(start, end + 1).trim();
    }
  }
  
  // If all fails, attempt to strip naive markdown tags
  return text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```$/i, "")
    .trim();
}

