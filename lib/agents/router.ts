/**
 * CENTRAL ORCHESTRATOR
 * 
 * The main entry point for user messages. It handles:
 * 1. Triage: Classifying the user's intent.
 * 2. Routing: Dispatching to specialized agents (Direct, Chat, Search, or Task).
 * 3. Session Management: Maintaining the conversation flow.
 */
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

  // Sticky route: short ambiguous follow-ups go back to the previous agent
  const isShortFollowUp =
    message.trim().length < 40 &&
    /^(yes|no|y|n|sure|ok|go ahead|send it|do it|cancel|change|nah|yeah|yep|nope|please|thanks|correct|right)$/i.test(
      message.trim(),
    );

  if (
    !("error" in session) &&
    isShortFollowUp &&
    session.lastRoute === "task"
  ) {
    console.log(
      `[Router] Short follow-up detected, sticky routing to 'task' for ${userId}.`,
    );
    try {
      let memoryContext = "";
      try {
        memoryContext = await buildMemoryContext(userId, message);
      } catch {}
      await runReActAgent(userId, message, memoryContext);
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
    !("error" in session) ? session.lastRoute : undefined,
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
            session.lastRoute = "direct";
            await setSession(userId, session);
          }
          await sendToUser(userId, triage.directReply);
        }
        break;
      }

      case "chat": {
        // Lightweight conversational agent
        if (!("error" in session)) {
          session.lastRoute = "chat";
          await setSession(userId, session);
        }
        await runChatAgent(userId, message, memoryContext);
        break;
      }

      case "search": {
        // Specialized web search agent
        if (!("error" in session)) {
          session.lastRoute = "search";
          await setSession(userId, session);
        }
        await runSearchAgent(userId, message);
        break;
      }

      case "task": {
        // Full ReAct agent with tools
        if (!("error" in session)) {
          session.lastRoute = "task";
          await setSession(userId, session);
        }
        await runReActAgent(userId, message, memoryContext);
        break;
      }

      // 'research' case removed - now handled explicitly above triage.

      default: {
        // Fallback to task agent
        if (!("error" in session)) {
          session.lastRoute = "task";
          await setSession(userId, session);
        }
        await runReActAgent(userId, message, memoryContext);
      }
    }
  } catch (error) {
    console.error("[Router] Error:", error);
    await sendToUser(userId, "Something went wrong. Please try again.");
  }
}
