import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

// Send message
async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("📩 Telegram Update:", JSON.stringify(body, null, 2));

    const message = body.message;
    const text: string | undefined = message?.text;
    const chatId: number | undefined = message?.chat?.id;
    const username: string | undefined = message?.from?.username;

    if (!chatId || !text) {
      return NextResponse.json({ status: "ignored" });
    }

    // /start <code> (ACCOUNT LINKING)
    if (text.startsWith("/start")) {
      const code = text.split(" ")[1];

      if (!code) {
        await sendMessage(chatId, "Invalid connection code.");
        return NextResponse.json({ status: "ok" });
      }

      const link = await prisma.telegramLink.findUnique({
        where: { code },
      });

      if (!link || link.expiresAt < new Date()) {
        await sendMessage(chatId, "Code expired or invalid.");
        return NextResponse.json({ status: "ok" });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { clerkId: link.clerkId },
      });

      if (!user) {
        await sendMessage(chatId, "User not found.");
        return NextResponse.json({ status: "ok" });
      }

      // Save Telegram integration
      await prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: user.id,
            provider: "telegram",
          },
        },
        update: {
          telegramChatId: String(chatId),
          telegramUsername: username,
        },
        create: {
          userId: user.id,
          provider: "telegram",
          telegramChatId: String(chatId),
          telegramUsername: username,
          scope: [],
        },
      });

      // Delete used code
      await prisma.telegramLink.delete({
        where: { code },
      });

      await sendMessage(chatId, "Telegram connected successfully!");

      return NextResponse.json({ status: "linked" });
    }

    // HANDLE NORMAL MESSAGES

    // Find user from chatId
    const integration = await prisma.integration.findFirst({
      where: {
        provider: "telegram",
        telegramChatId: String(chatId),
      },
    });

    if (!integration) {
      await sendMessage(
        chatId,
        "⚠️ Please connect your account first from the dashboard.",
      );
      return NextResponse.json({ status: "no_user" });
    }

    const user = await prisma.user.findUnique({
      where: { id: integration.userId },
    });

    if (!user) {
      await sendMessage(chatId, "User not found.");
      return NextResponse.json({ status: "error" });
    }

    console.log("👤 User:", user.id);
    console.log("💬 Message:", text);

    // Agent Call

    // TODO:  runAgent()
    const responseText = `You said: ${text}`;

    // SEND RESPONSE
    await sendMessage(chatId, responseText);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
