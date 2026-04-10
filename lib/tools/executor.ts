import {
  fetchUnreadEmails,
  getEmailById,
  createDraft,
  sendEmail,
  sendDraft,
  markAsRead,
} from "@/lib/agents/agent-tools/gmail";
import {
  fetchUpcomingEvents,
  createCalendarEvent,
} from "@/lib/agents/agent-tools/calendar";
import { storeUserFact, recallMemory } from "@/lib/agents/agent-tools/memory";
import sendMessage from "@/lib/Telegram/send-message";
import { getGmailClient, getCalendarClient } from "@/lib/google-client";
import { prisma } from "@/lib/prisma";
import type { FactCategory, JournalEntryType } from "@/app/generated/prisma";
import {
  createJournalEntry,
  fetchJournalEntries,
} from "@/lib/agents/agent-tools/journal";

// Result returned by every tool execution
export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

export async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // Gmail
      case "fetchUnreadEmails": {
        const gmail = await getGmailClient(userId);
        const maxResults = (args.maxResults as number) ?? 10;
        const emails = await fetchUnreadEmails(gmail, maxResults);
        return { success: true, data: emails };
      }

      case "getEmailById": {
        const gmail = await getGmailClient(userId);
        const email = await getEmailById(gmail, args.messageId as string);
        return { success: true, data: email };
      }

      case "createDraft": {
        const gmail = await getGmailClient(userId);
        const draftId = await createDraft(
          gmail,
          args.to as string,
          args.subject as string,
          args.body as string,
          args.threadId as string | undefined,
        );
        return { success: true, data: { draftId } };
      }

      case "sendEmail": {
        const gmail = await getGmailClient(userId);
        const messageId = await sendEmail(
          gmail,
          args.to as string,
          args.subject as string,
          args.body as string,
          args.threadId as string | undefined,
        );
        return { success: true, data: { messageId } };
      }

      case "sendDraft": {
        const gmail = await getGmailClient(userId);
        const draftId = await sendDraft(gmail, args.draftId as string);
        return { success: true, data: { draftId } };
      }

      case "markAsRead": {
        const gmail = await getGmailClient(userId);
        await markAsRead(gmail, args.messageId as string);
        return { success: true, data: { marked: args.messageId } };
      }

      // Calendar
      case "fetchUpcomingEvents": {
        const calendar = await getCalendarClient(userId);
        const hoursAhead = (args.hoursAhead as number) ?? 24;
        const events = await fetchUpcomingEvents(calendar, hoursAhead);
        return { success: true, data: events };
      }

      case "createCalendarEvent": {
        const calendar = await getCalendarClient(userId);
        const eventId = await createCalendarEvent(calendar, {
          title: args.title as string,
          description: args.description as string,
          date: args.date as string,
          startTime: (args.startTime as string) ?? null,
          endTime: (args.endTime as string) ?? null,
        });
        return { success: true, data: { eventId } };
      }

      // Memory
      case "recallMemory": {
        const query = args.query as string;
        const dateRange = args.dateRange as
          | { start: string; end: string }
          | undefined;
        const result = await recallMemory(userId, { query, dateRange });
        return { success: true, data: result };
      }

      case "storeUserFact": {
        const key = args.key as string;
        const value = args.value as string;
        const category = args.category as FactCategory;
        await storeUserFact(userId, { key, value, category });
        return { success: true, data: { key, value, category } };
      }

      // Telegram
      case "sendTelegramMessage": {
        const integration = await prisma.integration.findFirst({
          where: { userId, provider: "telegram" },
        });

        if (!integration?.telegramChatId) {
          return {
            success: false,
            error: "Telegram is not connected for this user.",
          };
        }

        await sendMessage(
          Number(integration.telegramChatId),
          args.text as string,
        );
        return { success: true, data: { sent: true } };
      }

      // Journal
      case "createJournalEntry": {
        const result = await createJournalEntry(userId, {
          date: args.date as string,
          type: args.type as JournalEntryType,
          content: args.content as string,
          highlights: args.highlights as string[] | undefined,
          mood: args.mood as string | undefined,
        });
        return { success: true, data: result };
      }

      case "fetchJournalEntries": {
        const dateRange = args.dateRange as
          | { start: string; end: string }
          | undefined;
        const result = await fetchJournalEntries(userId, dateRange);
        return { success: true, data: result };
      }

      // Web Search
      case "webSearch": {
        const { runWebSearch } = await import("@/lib/tools/webSearch");
        const result = await runWebSearch({
          query: args.query as string,
          topic: args.topic as "general" | "news" | undefined,
        });
        return { success: true, data: { answer: result } };
      }

      // Deep Research (runs after response via next/server after())
      case "deepResearch": {
        const { runDeepResearch } = await import("@/lib/research/deepResearch");
        const { after } = await import("next/server");
        const topic = args.topic as string;

        // Schedule via after() so Vercel keeps the function alive
        after(() => runDeepResearch(userId, topic).catch(console.error));

        // Return immediately so the ReAct loop can close
        return {
          success: true,
          data: {
            status:
              "Research started. Report will be delivered to Telegram in 60-90 seconds.",
            topic,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Tool:${toolName}] Error:`, message);
    return { success: false, error: message };
  }
}
