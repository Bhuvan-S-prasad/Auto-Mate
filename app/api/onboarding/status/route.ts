import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, onboardingCompleted: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const integrations = await prisma.integration.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });

  const providers = integrations.map((i) => i.provider);

  return NextResponse.json({
    gmail: providers.includes("gmail"),
    calendar: providers.includes("google_calendar"),
    telegram: providers.includes("telegram"),
    completed: user.onboardingCompleted,
  });
}
