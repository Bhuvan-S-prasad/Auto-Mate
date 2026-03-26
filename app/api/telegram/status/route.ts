import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find Internal User ID first
  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return NextResponse.json({ connected: false });
  }

  const integration = await prisma.integration.findUnique({
    where: {
      userId_provider: {
        userId: user.id,
        provider: "telegram",
      },
    },
  });

  return NextResponse.json({ connected: !!integration });
}
