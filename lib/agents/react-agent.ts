import {
  getSession,
  setSession,
  trimScratchpad,
  withUserLock,
} from "@/lib/agents/agent-tools/session";
import {
  buildMemoryContext,
  extractAndStoreFacts,
  logEpisode,
} from "@/lib/agents/agent-tools/memory";
import { MUTATING_TOOLS } from "@/lib/tools/index";
import { executeTool } from "@/lib/tools/executor";
import { prisma } from "@/lib/prisma";
import { getPersonalityInstruction } from "@/lib/constants/personality";
import { buildSystemPrompt } from "@/lib/prompts/react-agent-prompts";

import { callLLM } from "@/lib/agents/agent-tools/llm";
import { logStep } from "@/lib/agents/agent-tools/logger";
import { formatApprovalPreview } from "@/lib/agents/agent-tools/formatters";
import { sendToUser } from "@/lib/Telegram/user-service";
import { handleApproval } from "@/lib/agents/agent-tools/approval";

const MAX_STEPS = 10;

export async function runReActAgent(
  userId: string,
  message: string,
): Promise<string> {
  return withUserLock(userId, () => _runReActAgent(userId, message));
}

async function _runReActAgent(
  userId: string,
  message: string,
): Promise<string> {
  const session = await getSession(userId);
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
        context: memoryContext,
      });
    } catch {
      await logStep(runId, "MEMORY_RETRIEVAL", {
        error: "Failed to retrieve memory",
      });
    }

    // Fetch user preferences for personality
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const personalityInstruction = getPersonalityInstruction(
      user?.preferences as Record<string, unknown> | null,
    );

    // Build system prompt and initialize scratchpad if empty
    const systemPrompt = buildSystemPrompt(
      memoryContext,
      personalityInstruction,
    );

    if (session.scratchpad.length === 0) {
      session.scratchpad.push({ role: "system", content: systemPrompt });
    } else {
      // Update system prompt to latest
      session.scratchpad[0] = { role: "system", content: systemPrompt };
    }

    // Push user message
    session.scratchpad.push({ role: "user", content: message });
    session.scratchpad = trimScratchpad(session.scratchpad);
    await setSession(userId, session);

    // Fire-and-forget: extract facts from user message
    extractAndStoreFacts(userId, message);

    // ReAct loop
    let narrationRetries = 0;
    const MAX_NARRATION_RETRIES = 2;
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
      session.scratchpad.push(assistantMsg);
      await setSession(userId, session);

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
            await setSession(userId, session);

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
          const resultStr = JSON.stringify(
            result.success ? result.data : { error: result.error }
          );
          const truncated = resultStr.length > 8000
            ? resultStr.slice(0, 8000) + '... [truncated]'
            : resultStr;
            
          session.scratchpad.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `<tool_result name="${toolName}">\n${truncated}\n</tool_result>`,
          });
          session.scratchpad = trimScratchpad(session.scratchpad);
          await setSession(userId, session);
        }

        // Continue loop for next LLM call with tool results
        continue;
      }

      // D. No tool calls → check for narration vs final response
      const responseText =
        assistantMsg.content ?? "I couldn't generate a response.";

      const isNarration =
        /\b(i will|i'll|let me|i'm going to|i am going to)\b/i.test(
          responseText,
        ) ||
        /\b(searching|looking up|fetching|keep digging|still working|just a moment|one moment|hold on)\b/i.test(
          responseText,
        ) ||
        /\b(i('ll| will) (keep|try|refine|continue))\b/i.test(responseText);

      if (
        isNarration &&
        step < MAX_STEPS - 1 &&
        narrationRetries < MAX_NARRATION_RETRIES
      ) {
        narrationRetries++;
        await logStep(runId, "NARRATION_DETECTED", {
          step,
          retry: narrationRetries,
          text: responseText.slice(0, 200),
        });

        // Inject correction — tell the model to actually call the tool
        session.scratchpad.push({
          role: "user",
          content:
            "Do NOT describe what you will do. You MUST call the tool right now. Make the tool call immediately.",
        });
        session.scratchpad = trimScratchpad(session.scratchpad);
        await setSession(userId, session);
        continue;
      }

      // If narration limit reached, force the model to synthesize from existing results
      if (
        isNarration &&
        narrationRetries >= MAX_NARRATION_RETRIES &&
        step < MAX_STEPS - 1
      ) {
        narrationRetries++;
        await logStep(runId, "NARRATION_LIMIT_REACHED", {
          step,
          retries: narrationRetries,
        });

        session.scratchpad.push({
          role: "user",
          content:
            "STOP searching. Give me the best answer you can from the information you already have. Summarize what you found so far. Do NOT say you will search more.",
        });
        session.scratchpad = trimScratchpad(session.scratchpad);
        await setSession(userId, session);
        continue;
      }

      // Genuine final response
      await sendToUser(userId, responseText);
      await logStep(runId, "FINAL_RESPONSE", { text: responseText });

      // Background: log the conversation episode
      logEpisode(userId, {
        type: "conversation",
        data: { userMessage: message, agentResponse: responseText },
      });

      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "success",
          summary: responseText.slice(0, 200),
          durationMs: Date.now() - startTime,
        },
      });

      return responseText;
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
