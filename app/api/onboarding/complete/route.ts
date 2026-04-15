import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify that all required integrations exist
  const integrations = await prisma.integration.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });

  const providers = integrations.map((i) => i.provider);
  const hasGmail = providers.includes("gmail");
  const hasCalendar = providers.includes("google_calendar");
  const hasTelegram = providers.includes("telegram");

  if (!hasGmail || !hasCalendar || !hasTelegram) {
    return NextResponse.json(
      { error: "Connect Gmail, Google Calendar, and Telegram to continue" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });

  return NextResponse.json({ success: true });
}
