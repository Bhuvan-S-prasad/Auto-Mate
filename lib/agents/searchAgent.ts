import { getSession, setSession, trimScratchpad } from "@/lib/agents/agent-tools/session";
import { searchWeb } from "@/lib/search/searchWeb";
import { sendToUser } from "@/lib/Telegram/user-service";
import { AGENT_MODEL } from "@/lib/models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function runSearchAgent(
  userId: string,
  message: string,
): Promise<string> {
  try {
    const session = await getSession(userId);
    if ("error" in session) {
      const fallback = "Cache unavailable. Try again shortly.";
      await sendToUser(userId, fallback);
      return fallback;
    }

    // Perform native web search bypassing LLM tool execution
    const searchResults = await searchWeb(message).catch(() => []);
    const resultStr = JSON.stringify(searchResults);
    const truncatedResults = resultStr.length > 4000 ? resultStr.slice(0, 4000) + '... [truncated]' : resultStr;

    const systemPrompt = `You are Auto-Mate's precise web-search specialist.
You have been provided with real-time web search results below to answer the user's query.
Never guess or hallucinate. Be extremely concise. Cite your sources implicitly.

<web_results>
${truncatedResults}
</web_results>`;

    if (session.scratchpad.length === 0) {
      session.scratchpad.push({ role: "system", content: systemPrompt });
    } else {
      session.scratchpad[0] = { role: "system", content: systemPrompt };
    }

    session.scratchpad.push({ role: "user", content: message });
    session.scratchpad = trimScratchpad(session.scratchpad);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Auto-Mate",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: session.scratchpad,
        temperature: 0.1, 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter error: ${res.status}: ${body}`);
    }

    const data = await res.json();
    const assistantMsg = data.choices?.[0]?.message;
    let responseText = assistantMsg?.content ?? "I couldn't find an answer.";

    if (assistantMsg) {
      session.scratchpad.push(assistantMsg);
    }

    if (!responseText) responseText = "Search failed.";

    await setSession(userId, session);
    await sendToUser(userId, responseText);

    return responseText;
  } catch (error) {
    console.error("[SearchAgent] Error:", error);
    const fallback = "Something went wrong with the search.";
    await sendToUser(userId, fallback);
    return fallback;
  }
}
