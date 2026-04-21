import { triageMessage } from "@/lib/agents/triage";
import { runChatAgent } from "@/lib/agents/chatAgent";
import { runReActAgent } from "@/lib/agents/react-agent";
import { runSearchAgent } from "@/lib/agents/searchAgent";
import { sendToUser } from "@/lib/Telegram/user-service";
import { buildMemoryContext } from "@/lib/agents/agent-tools/memory";
import {
  getSession,
  setSession,
  trimScratchpad,
} from "@/lib/agents/agent-tools/session";

export async function routeMessage(
  userId: string,
  message: string,
): Promise<void> {
  const startTime = Date.now();

  // Check for pending action to bypass triage entirely
  const session = await getSession(userId);
  if (!("error" in session) && session.pendingAction) {
    console.log(
      `[Router] Pending action detected for ${userId}, bypassing triage.`,
    );
    try {
      await runReActAgent(userId, message);
    } catch (error) {
      console.error("[Router] Error:", error);
      await sendToUser(userId, "Something went wrong. Please try again.");
    }
    return;
  }

  // Get memory context for triage
  let memoryContext = "";
  try {
    memoryContext = await buildMemoryContext(userId, message);
  } catch {
    // If memory fails, continue without it
  }

  // TRIAGE: classify the message
  const triage = await triageMessage(
    message,
    memoryContext,
    !("error" in session) ? session.scratchpad : [],
  );
  const latency = Date.now() - startTime;

  console.log(
    `[Router] Triage result: route=${triage.route}, confidence=${triage.confidence.toFixed(2)}, latency=${latency}ms`,
  );

  // ROUTE based on triage result
  try {
    switch (triage.route) {
      case "direct": {
        // Immediate answer — send and return
        if (triage.directReply) {
          if (!("error" in session)) {
            session.scratchpad.push({ role: "user", content: message });
            session.scratchpad.push({
              role: "assistant",
              content: triage.directReply,
            });
            session.scratchpad = trimScratchpad(session.scratchpad);
            await setSession(userId, session);
          }
          await sendToUser(userId, triage.directReply);
        }
        break;
      }

      case "chat": {
        // Lightweight conversational agent
        await runChatAgent(userId, message, memoryContext);
        break;
      }

      case "search": {
        // Specialized web search agent
        await runSearchAgent(userId, message);
        break;
      }

      case "task": {
        // Full ReAct agent with tools
        await runReActAgent(userId, message, memoryContext);
        break;
      }

      // 'research' case removed - now handled explicitly above triage.

      default: {
        // Fallback to task agent
        await runReActAgent(userId, message, memoryContext);
      }
    }
  } catch (error) {
    console.error("[Router] Error:", error);
    await sendToUser(userId, "Something went wrong. Please try again.");
  }
}
