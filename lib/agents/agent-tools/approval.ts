import {
  getSession,
  setSession,
  clearPendingAction,
  trimScratchpad,
} from "@/lib/agents/agent-tools/session";
import { executeTool } from "@/lib/tools/executor";
import { logStep } from "@/lib/agents/agent-tools/logger";
import { logEpisode } from "@/lib/agents/agent-tools/memory";
import { callLLM } from "@/lib/agents/agent-tools/llm";
import { sendToUser } from "@/lib/Telegram/user-service";

export async function handleApproval(
  userId: string,
  message: string,
  runId: string,
): Promise<string> {
  const session = getSession(userId);
  const pending = session.pendingAction;

  if (!pending) return "No pending action to approve.";

  const isApproved = /^(yes|y|confirm|approve)$/i.test(message.trim());
  const isDenied = /^(no|n|cancel|deny)$/i.test(message.trim());

  await logStep(runId, "APPROVAL_RESULT", {
    response: message,
    approved: isApproved,
  });

  if (isDenied) {
    // Push cancellation as tool result
    session.scratchpad.push({
      role: "tool",
      content: JSON.stringify({
        success: false,
        error: "User cancelled the action.",
      }),
      tool_call_id: pending.toolUseId,
    } as unknown as { role: string; content: unknown });

    clearPendingAction(userId);
    setSession(userId, session);

    await sendToUser(userId, "❌ Action cancelled.");
    return "Action cancelled by user.";
  }

  if (isApproved) {
    // Execute the approved tool
    const result = await executeTool(userId, pending.type, pending.payload);

    await logStep(runId, "TOOL_RESULT", {
      tool: pending.type,
      result,
    });

    clearPendingAction(userId);

    // Push tool result into scratchpad
    session.scratchpad.push({
      role: "tool",
      content: JSON.stringify(result),
      tool_call_id: pending.toolUseId,
    } as unknown as { role: string; content: unknown });

    // Log episode for approved mutating action
    logEpisode(userId, {
      type:
        pending.type === "createCalendarEvent"
          ? "event_created"
          : pending.type === "sendEmail"
            ? "email_sent"
            : "email_drafted",
      data: JSON.parse(
        JSON.stringify({ tool: pending.type, input: pending.payload, result }),
      ),
      importance: 4,
    });

    // Final LLM call to generate confirmation message
    session.scratchpad = trimScratchpad(session.scratchpad);
    setSession(userId, session);

    try {
      const confirmResponse = await callLLM(session.scratchpad);
      const confirmText =
        confirmResponse.choices?.[0]?.message?.content ?? "Done!";

      session.scratchpad.push({
        role: "assistant",
        content: confirmText,
      });
      setSession(userId, session);

      await sendToUser(userId, confirmText);
      await logStep(runId, "FINAL_RESPONSE", { text: confirmText });

      return confirmText;
    } catch {
      const fallback = "✅ Action completed successfully.";
      await sendToUser(userId, fallback);
      return fallback;
    }
  }

  // Ambiguous response
  await sendToUser(
    userId,
    "Please reply YES or NO to confirm the pending action.",
  );
  return "Waiting for clear approval.";
}
