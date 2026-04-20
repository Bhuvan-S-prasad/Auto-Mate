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
  const session = await getSession(userId);
  
  if ("error" in session) {
    const msg = "Backend temporarily degraded. Cannot verify pending approvals right now.";
    await sendToUser(userId, msg);
    return msg;
  }

  const pending = session.pendingAction;

  if (!pending) return "No pending action to approve.";

  const isApproved = /^(yes|y|confirm|approve|continue|ok|proceed)$/i.test(message.trim());
  const isDenied = /^(no|n|cancel|deny|stop|halt|abort)$/i.test(message.trim());

  await logStep(runId, "APPROVAL_RESULT", {
    response: message,
    approved: isApproved,
  });

  if (isDenied) {
    const cancelResultStr = JSON.stringify({ error: "User cancelled the action." });
    
    // Push cancellation as tool result
    session.scratchpad.push({
      role: "tool",
      content: `<tool_result name="${pending.type}">\n${cancelResultStr}\n</tool_result>`,
      tool_call_id: pending.toolUseId,
    });

    await clearPendingAction(userId);
    await setSession(userId, session);

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

    await clearPendingAction(userId);

    const resultStr = JSON.stringify(
      result.success ? result.data : { error: result.error }
    );
    const truncated = resultStr.length > 8000
      ? resultStr.slice(0, 8000) + '... [truncated]'
      : resultStr;

    // Push tool result into scratchpad
    session.scratchpad.push({
      role: "tool",
      content: `<tool_result name="${pending.type}">\n${truncated}\n</tool_result>`,
      tool_call_id: pending.toolUseId,
    });

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
    await setSession(userId, session);

    try {
      const confirmResponse = await callLLM(session.scratchpad);
      const confirmText =
        confirmResponse.choices?.[0]?.message?.content ?? "Done!";

      session.scratchpad.push({
        role: "assistant",
        content: confirmText,
      });
      await setSession(userId, session);

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
