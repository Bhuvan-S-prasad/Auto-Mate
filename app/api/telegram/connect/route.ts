import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = randomUUID();

  // store temporary mapping
  await prisma.telegramLink.create({
    data: {
      code,
      clerkId: userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    },
  });

  return NextResponse.json({ code });
}
