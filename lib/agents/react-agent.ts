import {
  getSession,
  setSession,
  clearPendingAction,
} from "@/lib/agents/session";
import {
  buildMemoryContext,
  extractAndStoreFacts,
  logEpisode,
} from "@/lib/agents/memory";
import { TOOL_DEFINITIONS, MUTATING_TOOLS } from "@/lib/tools/index";
import { executeTool } from "@/lib/tools/executor";
import sendTelegramMessage from "@/lib/Telegram/send-message";
import { prisma } from "@/lib/prisma";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AGENT_MODEL = "google/gemini-2.0-flash-lite-001";
const MAX_STEPS = 10;
const MAX_SCRATCHPAD = 20;

// OpenRouter message types
interface ToolCallFunction {
  name: string;
  arguments: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: ToolCallFunction;
}

interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

interface OpenRouterChoice {
  message: AssistantMessage;
  finish_reason: string;
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

// Log entry shape
interface LogEntry {
  step: string;
  timestamp: string;
  [key: string]: unknown;
}

// Resolve userId to Telegram chatId
async function getTelegramChatId(userId: string): Promise<number | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: "telegram" },
  });
  if (!integration?.telegramChatId) return null;
  return Number(integration.telegramChatId);
}

// Send a message to the user via Telegram (userId-based)
async function sendToUser(userId: string, text: string): Promise<void> {
  const chatId = await getTelegramChatId(userId);
  if (chatId) {
    await sendTelegramMessage(chatId, text);
  }
}

// TASK 0: Logging

async function logStep(
  runId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  const entry: LogEntry = {
    step: type,
    timestamp: new Date().toISOString(),
    ...data,
  };

  console.log(`[Agent:${runId}] ${type}`, JSON.stringify(data));

  try {
    // Append to AgentRun.actionsLog
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: { actionsLog: true },
    });

    const currentLog = Array.isArray(run?.actionsLog) ? run.actionsLog : [];
    const updatedLog = JSON.parse(
      JSON.stringify([...(currentLog as unknown[]), entry]),
    );
    await prisma.agentRun.update({
      where: { id: runId },
      data: { actionsLog: updatedLog },
    });
  } catch (err) {
    console.error("[Agent:logStep] Failed to persist log:", err);
  }
}

// TASK 1: System prompt builder

function buildSystemPrompt(memoryContext: string): string {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return `You are Auto-Mate, a personal AI assistant with access to Gmail, Google Calendar, and Memory.

Current date/time (IST): ${now}

Behaviour rules:
- Think step-by-step before acting.
- Use tools when you need real data — do not guess.
- NEVER perform mutating actions (sending emails, creating events, drafting) without user approval.
- For personal or contextual queries ("who is…", "what did I…"), ALWAYS use recallMemory first.
- If the user shares a personal fact (name, location, preference), call storeUserFact to remember it.
- Keep responses concise and direct — the user reads these on Telegram.
- When listing emails or events, use a clean numbered format.

${memoryContext ? `What I know about you:\n${memoryContext}\n` : ""}Tools available: fetchUnreadEmails, getEmailById, createDraft, sendEmail, markAsRead, fetchUpcomingEvents, createCalendarEvent, recallMemory, storeUserFact, sendTelegramMessage, createJournalEntry, fetchJournalEntries.`;
}

// TASK 2: Approval preview formatter

function formatApprovalPreview(
  toolName: string,
  input: Record<string, unknown>,
): string {
  switch (toolName) {
    case "createDraft":
    case "sendEmail":
      return [
        `📧 ${toolName === "sendEmail" ? "Send Email" : "Create Draft"}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        `Body: ${String(input.body).slice(0, 200)}${String(input.body).length > 200 ? "..." : ""}`,
        "",
        "Reply YES to confirm, NO to cancel.",
      ].join("\n");

    case "createCalendarEvent": {
      const lines = [
        "📅 Create Calendar Event",
        `Title: ${input.title}`,
        `Date: ${input.date}`,
      ];
      if (input.startTime) lines.push(`Start: ${input.startTime}`);
      if (input.endTime) lines.push(`End: ${input.endTime}`);
      if (input.description) lines.push(`Description: ${input.description}`);
      lines.push("", "Reply YES to confirm, NO to cancel.");
      return lines.join("\n");
    }

    default:
      return `Action: ${toolName}\n${JSON.stringify(input, null, 2)}\n\nReply YES to confirm, NO to cancel.`;
  }
}

// Call OpenRouter
async function callLLM(
  messages: Record<string, unknown>[],
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

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
      model: AGENT_MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  return res.json();
}

// Trim scratchpad to last N messages (keep system prompt + recent context)
function trimScratchpad(
  scratchpad: { role: string; content: unknown }[],
): { role: string; content: unknown }[] {
  if (scratchpad.length <= MAX_SCRATCHPAD) return scratchpad;
  // Keep first message (system prompt) + last (MAX_SCRATCHPAD - 1) messages
  return [scratchpad[0], ...scratchpad.slice(-(MAX_SCRATCHPAD - 1))];
}

// TASK 4: Handle pending approval

async function handleApproval(
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
      content: JSON.stringify({ success: false, error: "User cancelled the action." }),
      tool_call_id: pending.toolUseId,
    } as unknown as { role: string; content: unknown });

    clearPendingAction(userId);
    setSession(userId, session);

    await sendToUser(userId, "❌ Action cancelled.");
    return "Action cancelled by user.";
  }

  if (isApproved) {
    clearPendingAction(userId);

    // Execute the approved tool
    const result = await executeTool(
      userId,
      pending.type,
      pending.payload,
    );

    await logStep(runId, "TOOL_RESULT", {
      tool: pending.type,
      result,
    });

    // Push tool result into scratchpad
    session.scratchpad.push({
      role: "tool",
      content: JSON.stringify(result),
      tool_call_id: pending.toolUseId,
    } as unknown as { role: string; content: unknown });

    // Log episode for approved mutating action
    logEpisode(userId, {
      type: pending.type === "createCalendarEvent" ? "event_created"
        : pending.type === "sendEmail" ? "email_sent"
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

// TASK 3: Main ReAct loop

export async function runReActAgent(
  userId: string,
  message: string,
): Promise<string> {
  const session = getSession(userId);
  const startTime = Date.now();

  // Create AgentRun
  const agentRun = await prisma.agentRun.create({
    data: { userId, status: "running" },
  });
  const runId = agentRun.id;

  try {
    // If pending approval, handle it
    if (session.pendingAction) {
      const result = await handleApproval(userId, message, runId);
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "success",
          summary: result.slice(0, 200),
          durationMs: Date.now() - startTime,
        },
      });
      return result;
    }

    await logStep(runId, "USER_INPUT", { message });

    // Retrieve memory context
    let memoryContext = "";
    try {
      memoryContext = await buildMemoryContext(userId, message);
      await logStep(runId, "MEMORY_RETRIEVAL", {
        hasContext: memoryContext.length > 0,
        length: memoryContext.length,
      });
    } catch {
      await logStep(runId, "MEMORY_RETRIEVAL", { error: "Failed to retrieve memory" });
    }

    // Build system prompt and initialize scratchpad if empty
    const systemPrompt = buildSystemPrompt(memoryContext);

    if (session.scratchpad.length === 0) {
      session.scratchpad.push({ role: "system", content: systemPrompt });
    } else {
      // Update system prompt to latest
      session.scratchpad[0] = { role: "system", content: systemPrompt };
    }

    // Push user message
    session.scratchpad.push({ role: "user", content: message });
    session.scratchpad = trimScratchpad(session.scratchpad);
    setSession(userId, session);

    // Fire-and-forget: extract facts from user message
    extractAndStoreFacts(userId, message);

    // ReAct loop
    for (let step = 0; step < MAX_STEPS; step++) {
      await logStep(runId, "LLM_REQUEST", {
        step,
        messageCount: session.scratchpad.length,
      });

      const response = await callLLM(session.scratchpad);
      const choice = response.choices?.[0];

      if (!choice) {
        await logStep(runId, "ERROR", { error: "Empty LLM response" });
        break;
      }

      const assistantMsg = choice.message;

      await logStep(runId, "LLM_RESPONSE", {
        step,
        hasToolCalls: !!assistantMsg.tool_calls?.length,
        content: assistantMsg.content?.slice(0, 200),
        finishReason: choice.finish_reason,
      });

      // Push assistant message to scratchpad
      session.scratchpad.push(assistantMsg as unknown as { role: string; content: unknown });
      setSession(userId, session);

      // C. Tool calls
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          await logStep(runId, "TOOL_CALL", {
            tool: toolName,
            input: toolArgs,
            toolCallId: toolCall.id,
          });

          // Check if mutating (needs approval)
          if (MUTATING_TOOLS.has(toolName)) {
            const summary = formatApprovalPreview(toolName, toolArgs);

            session.pendingAction = {
              type: toolName,
              toolUseId: toolCall.id,
              payload: toolArgs,
              summary,
            };
            setSession(userId, session);

            await logStep(runId, "APPROVAL_REQUEST", {
              tool: toolName,
              summary,
            });

            await sendToUser(userId, summary);

            await prisma.agentRun.update({
              where: { id: runId },
              data: {
                status: "success",
                summary: `Waiting for approval: ${toolName}`,
                durationMs: Date.now() - startTime,
              },
            });

            return `Awaiting approval for ${toolName}`;
          }

          // Non-mutating: execute immediately
          const result = await executeTool(userId, toolName, toolArgs);

          await logStep(runId, "TOOL_RESULT", {
            tool: toolName,
            success: result.success,
            data: result.success ? result.data : undefined,
            error: !result.success ? result.error : undefined,
          });

          // Push tool result back
          session.scratchpad.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(
              result.success ? result.data : { error: result.error },
            ),
          } as unknown as { role: string; content: unknown });
          session.scratchpad = trimScratchpad(session.scratchpad);
          setSession(userId, session);
        }

        // Continue loop for next LLM call with tool results
        continue;
      }

      // D. No tool calls → final text response
      const finalText = assistantMsg.content ?? "I couldn't generate a response.";

      await sendToUser(userId, finalText);
      await logStep(runId, "FINAL_RESPONSE", { text: finalText });

      // Background: log the conversation episode
      logEpisode(userId, {
        type: "conversation",
        data: { userMessage: message, agentResponse: finalText },
      });

      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "success",
          summary: finalText.slice(0, 200),
          durationMs: Date.now() - startTime,
        },
      });

      return finalText;
    }

    // Loop exhausted
    const exhaustedMsg = "I couldn't complete that request. Please try again.";
    await sendToUser(userId, exhaustedMsg);
    await logStep(runId, "ERROR", { error: "Step limit reached" });

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        summary: "Step limit reached",
        errorMessage: `Exceeded ${MAX_STEPS} reasoning steps`,
        durationMs: Date.now() - startTime,
      },
    });

    return exhaustedMsg;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Agent:${runId}] Fatal error:`, errorMsg);

    await logStep(runId, "ERROR", { error: errorMsg });

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        summary: "Agent error",
        errorMessage: errorMsg,
        durationMs: Date.now() - startTime,
      },
    });

    await sendToUser(userId, "Sorry, something went wrong. Please try again.");
    return "Agent error occurred.";
  }
}
