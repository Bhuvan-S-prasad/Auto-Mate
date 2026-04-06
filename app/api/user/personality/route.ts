import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getPersonalityInstruction } from "@/lib/constants/personality";
import { Prisma } from "@/app/generated/prisma";

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

    const body = await req.json();
    const { instruction, label } = body;

    if (!instruction || typeof instruction !== "string" || instruction.trim() === "") {
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

    const existingPreferences = (user.preferences as Record<string, unknown>) || {};

    const newPersonality = {
      instruction: sanitizedInstruction,
      label: label?.trim() || "Custom",
      updatedAt: new Date().toISOString(),
    };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: {
          ...existingPreferences,
          personality: newPersonality,
        },
      },
    });

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

    const existingPreferences = (user.preferences as Record<string, unknown>) || {};

    const rest = { ...existingPreferences };
    delete rest.personality;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: rest as unknown as Prisma.InputJsonObject,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Personality Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
