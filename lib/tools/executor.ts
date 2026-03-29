import {
  fetchUnreadEmails,
  getEmailById,
  createDraft,
  sendEmail,
  markAsRead,
} from "@/lib/agents/gmail";
import {
  fetchUpcomingEvents,
  createCalendarEvent,
} from "@/lib/agents/calendar";
import { embed } from "@/lib/agents/embed";
import sendMessage from "@/lib/Telegram/send-message";
import { getGmailClient, getCalendarClient } from "@/lib/google-client";
import { prisma } from "@/lib/prisma";
import type { FactCategory } from "@/app/generated/prisma";

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
        const queryEmbedding = await embed(query);
        const vectorStr = `[${queryEmbedding.join(",")}]`;

        // Search episodes by vector similarity
        const episodes = await prisma.$queryRawUnsafe<
          { id: string; type: string; summary: string; occurred_at: Date; similarity: number }[]
        >(
          `SELECT id, type, summary, occurred_at,
                  1 - (embedding <=> $1::vector) as similarity
           FROM episodes
           WHERE user_id = $2
             AND embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector
           LIMIT 5`,
          vectorStr,
          userId,
        );

        // Search user facts by vector similarity
        const facts = await prisma.$queryRawUnsafe<
          { id: string; key: string; value: string; category: string; similarity: number }[]
        >(
          `SELECT id, key, value, category,
                  1 - (embedding <=> $1::vector) as similarity
           FROM user_facts
           WHERE user_id = $2
             AND embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector
           LIMIT 5`,
          vectorStr,
          userId,
        );

        return { success: true, data: { episodes, facts } };
      }

      case "storeUserFact": {
        const key = args.key as string;
        const value = args.value as string;
        const category = args.category as FactCategory;
        const factEmbedding = await embed(`${key}: ${value}`);
        const factVectorStr = `[${factEmbedding.join(",")}]`;

        // Upsert fact
        await prisma.userFact.upsert({
          where: { userId_key: { userId, key } },
          update: {
            value,
            category,
            confidence: 0.9,
            source: "inferred",
          },
          create: {
            userId,
            key,
            value,
            category,
            confidence: 0.9,
            source: "inferred",
          },
        });

        // Store embedding via raw SQL (Prisma can't write Unsupported types)
        await prisma.$executeRawUnsafe(
          `UPDATE user_facts SET embedding = $1::vector WHERE user_id = $2 AND key = $3`,
          factVectorStr,
          userId,
          key,
        );

        return { success: true, data: { key, value, category } };
      }

      // Telegram
      case "sendTelegramMessage": {
        const integration = await prisma.integration.findFirst({
          where: { userId, provider: "telegram" },
        });

        if (!integration?.telegramChatId) {
          return { success: false, error: "Telegram is not connected for this user." };
        }

        await sendMessage(Number(integration.telegramChatId), args.text as string);
        return { success: true, data: { sent: true } };
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
