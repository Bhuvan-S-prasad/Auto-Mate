import { embed } from "@/lib/agents/embed";
import { prisma } from "@/lib/prisma";
import type { EpisodeType, FactCategory, Prisma } from "@/app/generated/prisma";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SUMMARY_MODEL = "google/gemini-2.0-flash-lite-001";

// Importance 
const IMPORTANCE_MAP: Record<string, number> = {
  email_sent: 4,
  event_created: 4,
  createCalendarEvent: 4,
  sendEmail: 4,
  email_drafted: 3,
  createDraft: 3,
  email_received: 3,
  task_created: 3,
  task_completed: 3,
  conversation: 2,
  agent_action: 3,
};

// Call OpenRouter for a short text completion (fire-and-forget safe)
async function callOpenRouter(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Auto-Mate",
    },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

// TASK 1: logEpisode

interface LogEpisodeInput {
  type: EpisodeType;
  data: Prisma.InputJsonValue;
  occurredAt?: Date;
  importance?: number;
}

export async function logEpisode(
  userId: string,
  input: LogEpisodeInput,
): Promise<void> {
  try {
    // 1. Generate one-sentence summary via LLM
    let summary: string;
    try {
      summary = await callOpenRouter(
        "Summarize the following event in one concise sentence.",
        JSON.stringify(input.data),
      );
    } catch {
      // Fallback: use type as summary if LLM fails
      summary = `${input.type} event occurred`;
    }

    // 2. Generate embedding
    let vectorStr: string | null = null;
    try {
      const embedding = await embed(summary);
      vectorStr = `[${embedding.join(",")}]`;
    } catch {
      // Continue without embedding
    }

    // 3. Determine importance
    const importance =
      input.importance ?? IMPORTANCE_MAP[input.type] ?? 3;

    // 4. Insert episode
    const episode = await prisma.episode.create({
      data: {
        userId,
        type: input.type,
        summary,
        rawData: input.data,
        tags: [],
        importance,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });

    // 5. Store embedding via raw SQL
    if (vectorStr) {
      await prisma.$executeRaw`
        UPDATE episodes
        SET embedding = ${vectorStr}::vector
        WHERE id = ${episode.id}
      `;
    }
  } catch (err) {
    // Fire-and-forget
    console.error("[Memory:logEpisode] Failed silently:", err);
  }
}

// TASK 2: extractAndStoreFacts

interface ExtractedFact {
  key: string;
  value: string;
  category: FactCategory;
  confidence: number;
}

export async function extractAndStoreFacts(
  userId: string,
  message: string,
): Promise<void> {
  try {
    // 1. Fetch existing facts for context
    const existingFacts = await prisma.userFact.findMany({
      where: { userId },
      select: { key: true, value: true, category: true },
    });

    // 2. Ask LLM to extract facts
    const raw = await callOpenRouter(
      `Extract structured facts about the user from their message.
Return ONLY a JSON array: [{ "key": string, "value": string, "category": string, "confidence": number }]
Valid categories: location, person, preference, routine, relationship, other.
Only include facts with confidence >= 0.75.
Return [] if no clear facts found.`,
      `User message: ${message}

Existing facts (do not duplicate): ${JSON.stringify(existingFacts)}`,
    );

    // 3. Parse response safely
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let facts: ExtractedFact[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        facts = parsed.filter(
          (f: ExtractedFact) =>
            f.key && f.value && f.category && f.confidence >= 0.75,
        );
      }
    } catch {
      // Malformed LLM output — skip
      return;
    }

    // 4. Upsert each fact with embedding
    for (const fact of facts) {
      try {
        const embedding = await embed(`${fact.key}: ${fact.value}`);
        const vectorStr = `[${embedding.join(",")}]`;

        await prisma.userFact.upsert({
          where: { userId_key: { userId, key: fact.key } },
          update: {
            value: fact.value,
            category: fact.category,
            confidence: fact.confidence,
            source: "inferred",
          },
          create: {
            userId,
            key: fact.key,
            value: fact.value,
            category: fact.category,
            confidence: fact.confidence,
            source: "inferred",
          },
        });

        await prisma.$executeRaw`
          UPDATE user_facts
          SET embedding = ${vectorStr}::vector
          WHERE user_id = ${userId} AND key = ${fact.key}
        `;
      } catch (err) {
        console.error(`[Memory:extractFact] Failed for key="${fact.key}":`, err);
      }
    }
  } catch (err) {
    // Fire-and-forget: never throw
    console.error("[Memory:extractAndStoreFacts] Failed silently:", err);
  }
}

// TASK 3: storeUserFact

interface UserFactInput {
  key: string;
  value: string;
  category: FactCategory;
}

export async function storeUserFact(
  userId: string,
  fact: UserFactInput,
): Promise<void> {
  // 1. Generate embedding
  const embedding = await embed(`${fact.key}: ${fact.value}`);
  const vectorStr = `[${embedding.join(",")}]`;

  // 2. Upsert with source = "user", confidence = 1.0
  await prisma.userFact.upsert({
    where: { userId_key: { userId, key: fact.key } },
    update: {
      value: fact.value,
      category: fact.category,
      confidence: 1.0,
      source: "user",
    },
    create: {
      userId,
      key: fact.key,
      value: fact.value,
      category: fact.category,
      confidence: 1.0,
      source: "user",
    },
  });

  // 3. Store embedding via raw SQL
  await prisma.$executeRaw`
    UPDATE user_facts
    SET embedding = ${vectorStr}::vector
    WHERE user_id = ${userId} AND key = ${fact.key}
  `;
}
