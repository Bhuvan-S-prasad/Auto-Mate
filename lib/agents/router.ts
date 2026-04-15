import { triageMessage } from "@/lib/agents/triage";
import { runChatAgent } from "@/lib/agents/chatAgent";
import { runReActAgent } from "@/lib/agents/react-agent";
import { runDeepResearch } from "@/lib/research/deepResearch";
import { sendToUser } from "@/lib/Telegram/user-service";
import { buildMemoryContext } from "@/lib/agents/agent-tools/memory";


export async function routeMessage(
  userId: string,
  message: string,
): Promise<void> {
  const startTime = Date.now();

  // Get memory context for triage
  let memoryContext = "";
  try {
    memoryContext = await buildMemoryContext(userId, message);
  } catch {
    // If memory fails, continue without it
  }

  // TRIAGE: classify the message
  const triage = await triageMessage(message, memoryContext);
  const latency = Date.now() - startTime;

  console.log(`[Router] Triage result: route=${triage.route}, confidence=${triage.confidence.toFixed(2)}, latency=${latency}ms`);

  // ROUTE based on triage result
  try {
    switch (triage.route) {
      case "direct": {
        // Immediate answer — send and return
        if (triage.directReply) {
          await sendToUser(userId, triage.directReply);
        }
        break;
      }

      case "chat": {
        // Lightweight conversational agent
        await runChatAgent(userId, message);
        break;
      }

      case "task": {
        // Full ReAct agent with tools
        await runReActAgent(userId, message);
        break;
      }

      case "research": {
        // Deep research pipeline
        const topic = extractResearchTopic(message);
        if (topic) {
          await sendToUser(
            userId,
            `Starting deep research on:\n"${topic}"\n\nThis takes 60-90 seconds. I'll send the full report when ready.`,
          );
          // Run async, don't await
          runDeepResearch(userId, topic).catch((err) => {
            console.error("[Router] Research error:", err);
          });
        }
        break;
      }

      default: {
        // Fallback to task agent
        await runReActAgent(userId, message);
      }
    }
  } catch (error) {
    console.error("[Router] Error:", error);
    await sendToUser(userId, "Something went wrong. Please try again.");
  }
}

/**
 * Extract research topic from a message (removes /research prefix if present)
 */
function extractResearchTopic(message: string): string {
  const trimmed = message.trim();
  if (trimmed.toLowerCase().startsWith("/research")) {
    return trimmed.slice("/research".length).trim();
  }
  return trimmed;
}
