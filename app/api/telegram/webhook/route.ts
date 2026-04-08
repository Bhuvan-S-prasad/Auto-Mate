import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sendMessage from "@/lib/Telegram/send-message";
import { runReActAgent } from "@/lib/agents/react-agent";
import { runDeepResearch } from "@/lib/research/deepResearch";
import {
  handleSetPersonality,
  handleMyPersonality,
  handleClearPersonality,
} from "@/lib/Telegram/personalityCommands";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Telegram Update:", JSON.stringify(body, null, 2));

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
        "Please connect your account first from the dashboard.",
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

    console.log("User:", user.id);
    console.log("Message:", text);

    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();

    if (lowerText.startsWith("/setpersonality")) {
      await handleSetPersonality(user.id, cleanText, chatId);
      return NextResponse.json({ status: "ok" });
    }

    if (lowerText === "/mypersonality") {
      await handleMyPersonality(user.id, chatId);
      return NextResponse.json({ status: "ok" });
    }

    if (lowerText === "/clearpersonality") {
      await handleClearPersonality(user.id, chatId);
      return NextResponse.json({ status: "ok" });
    }

    if (lowerText.startsWith("/research ")) {
      const topic = cleanText.slice("/research ".length).trim();
      if (!topic) {
        await sendMessage(
          chatId,
          "Please provide a topic.\nExample: /research impact of AI on software jobs",
        );
        return NextResponse.json({ status: "ok" });
      }
      // Immediate ack, then async
      await sendMessage(
        chatId,
        `Starting deep research on:\n"${topic}"\n\nThis takes 60-90 seconds. I'll send the full report when ready.`,
      );
      runDeepResearch(user.id, topic).catch(console.error); // fire and forget
      return NextResponse.json({ status: "ok" });
    }

    // Run the ReAct agent (handles Telegram response internally)
    await runReActAgent(user.id, text);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
