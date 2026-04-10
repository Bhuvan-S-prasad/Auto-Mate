import { prisma } from "@/lib/prisma";
import sendTelegramMessage from "@/lib/Telegram/send-message";

// Resolve userId to Telegram chatId
export async function getTelegramChatId(userId: string): Promise<number | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: "telegram" },
  });
  if (!integration?.telegramChatId) return null;
  return Number(integration.telegramChatId);
}

// Send a message to the user via Telegram (userId-based)
export async function sendToUser(userId: string, text: string): Promise<void> {
  const chatId = await getTelegramChatId(userId);
  if (chatId) {
    await sendTelegramMessage(chatId, text);
  }
}
