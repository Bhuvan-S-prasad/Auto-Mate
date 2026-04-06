import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getPersonalityInstruction } from "@/lib/constants/personality";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { preferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const preferences = user.preferences as Record<string, unknown> | null;
    const instruction = getPersonalityInstruction(preferences);

    if (!instruction || !preferences) {
      return NextResponse.json({
        instruction: null,
        label: null,
        updatedAt: null,
      });
    }

    const p = preferences.personality as Record<string, unknown>;
    return NextResponse.json({
      instruction,
      label: p.label || null,
      updatedAt: p.updatedAt || null,
    });
  } catch (error) {
    console.error("GET Personality Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const instruction = typeof body.instruction === "string" ? body.instruction : undefined;
    const label = typeof body.label === "string" ? body.label : undefined;

    if (!instruction || instruction.trim() === "") {
      return NextResponse.json(
        { error: "Instruction must be a non-empty string" },
        { status: 400 }
      );
    }

    if (instruction.length > 500) {
      return NextResponse.json(
        { error: "Instruction cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    const sanitizedInstruction = instruction.trim().replace(/\n{2,}/g, "\n");

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, preferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newPersonality = {
      instruction: sanitizedInstruction,
      label: label?.trim() || "Custom",
      updatedAt: new Date().toISOString(),
    };

    await prisma.$executeRaw`
      UPDATE users
      SET preferences = jsonb_set(
        COALESCE(preferences::jsonb, '{}'::jsonb),
        '{personality}',
        CAST(${JSON.stringify(newPersonality)} AS jsonb),
        true
      )
      WHERE id = ${user.id}
    `;

    return NextResponse.json(newPersonality);
  } catch (error) {
    console.error("POST Personality Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, preferences: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE users
      SET preferences = preferences::jsonb - 'personality'
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Personality Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
