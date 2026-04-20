import { embed } from "@/lib/agents/agent-tools/embed";
import { prisma } from "@/lib/prisma";
import { formatDateIST, formatTimeIST } from "@/lib/utils/istDate";
import { getSession, setSession } from "./session";
import type { EpisodeType, FactCategory, Prisma } from "@/app/generated/prisma";
import { SUMMARY_MODEL } from "@/lib/models";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    const importance = input.importance ?? IMPORTANCE_MAP[input.type] ?? 3;

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

    const MAX_VALUE_LENGTH = 200;
    const INSTRUCTION_PATTERNS = /ignore|previous|instructions|system|prompt|override/i;

    let facts: ExtractedFact[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        facts = parsed.filter(
          (f: ExtractedFact) =>
            f.key && 
            f.value && 
            f.category && 
            f.confidence >= 0.75 &&
            f.value.length <= MAX_VALUE_LENGTH &&
            !INSTRUCTION_PATTERNS.test(f.value)
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
        console.error(
          `[Memory:extractFact] Failed for key="${fact.key}":`,
          err,
        );
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

// TASK 4: buildMemoryContext

interface FactRow {
  key: string;
  value: string;
  category: string;
  last_updated: Date;
}

interface EpisodeRow {
  summary: string;
  type: string;
  occurred_at: Date;
}

interface JournalRow {
  date: Date;
  content: string;
}

export async function buildMemoryContext(
  userId: string,
  message: string,
): Promise<string> {
  try {
    const session = await getSession(userId);
    if (!("error" in session) && session.memoryContext && session.memoryContext.expiresAt > Date.now()) {
      return session.memoryContext.context;
    }

    const embedding = await embed(message);
    const vector = `[${embedding.join(",")}]`;

    const [facts, episodes, journal] = await Promise.all([
      // a) User facts — confidence >= 0.75, most recent first
      prisma.$queryRaw<FactRow[]>`
        SELECT key, value, category, last_updated
        FROM user_facts
        WHERE user_id = ${userId}
          AND confidence >= 0.75
        ORDER BY last_updated DESC
        LIMIT 10
      `,

      // b) Episodes — hybrid: vector similarity (0.7) + recency decay (0.3 cap)
      prisma.$queryRaw<EpisodeRow[]>`
        SELECT summary, type, occurred_at
        FROM episodes
        WHERE user_id = ${userId}
          AND importance > 2
          AND embedding IS NOT NULL
        ORDER BY
          (embedding <=> ${vector}::vector) * 0.7
          + LEAST(
              EXTRACT(EPOCH FROM (NOW() - occurred_at)) / 86400 * 0.005,
              0.3
            )
        LIMIT 5
      `,

      // c) Journal entries — most recent
      prisma.$queryRaw<JournalRow[]>`
        SELECT date, content
        FROM journal_entries
        WHERE user_id = ${userId}
        ORDER BY date DESC
        LIMIT 3
      `,
    ]);

    if (facts.length === 0 && episodes.length === 0 && journal.length === 0) {
      return "";
    }

    const sections: string[] = [];

    if (facts.length > 0) {
      const lines = facts.map((f) => `- ${f.key}: ${f.value}`);
      sections.push(`Known facts about you:\n${lines.join("\n")}`);
    }

    if (episodes.length > 0) {
      const lines = episodes.map((e) => {
        const date = formatDateIST(e.occurred_at);
        const time = formatTimeIST(e.occurred_at);
        return `- [${date} ${time}] ${e.summary}`;
      });
      sections.push(`Relevant past events:\n${lines.join("\n")}`);
    }

    if (journal.length > 0) {
      const lines = journal.map((j) => {
        const date = formatDateIST(j.date);
        const snippet =
          j.content.length > 200 ? j.content.slice(0, 200) + "..." : j.content;
        return `- [${date}] ${snippet}`;
      });
      sections.push(`Recent journal:\n${lines.join("\n")}`);
    }

    const contextStr = sections.join("\n\n");

    if (!("error" in session)) {
      session.memoryContext = {
        context: contextStr,
        expiresAt: Date.now() + 60 * 1000 // Cache for 60 seconds
      };
      await setSession(userId, session);
    }

    return contextStr;
  } catch (err) {
    console.error("[Memory:buildMemoryContext] Failed:", err);
    return "";
  }
}

// TASK 5: recallMemory

interface RecallInput {
  query: string;
  dateRange?: { start: string; end: string };
}

interface RecallFactRow {
  key: string;
  value: string;
  category: string;
  confidence: number;
  similarity: number;
}

interface RecallEpisodeRow {
  summary: string;
  type: string;
  occurred_at: Date;
  similarity: number;
}

interface RecallJournalRow {
  date: Date;
  content: string;
  similarity: number;
}

interface RecallResult {
  facts: RecallFactRow[];
  episodes: RecallEpisodeRow[];
  journal: RecallJournalRow[];
}

export async function recallMemory(
  userId: string,
  input: RecallInput,
): Promise<RecallResult> {
  const queryEmbedding = await embed(input.query);
  const vector = `[${queryEmbedding.join(",")}]`;

  if (input.dateRange) {
    const start = new Date(input.dateRange.start);
    const end = new Date(input.dateRange.end);

    const [facts, episodes, journal] = await Promise.all([
      // Facts: always semantic search (no date filter)
      prisma.$queryRaw<RecallFactRow[]>`
        SELECT key, value, category, confidence,
               1 - (embedding <=> ${vector}::vector) as similarity
        FROM user_facts
        WHERE user_id = ${userId}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vector}::vector
        LIMIT 5
      `,

      // Episodes: date-filtered + semantic
      prisma.$queryRaw<RecallEpisodeRow[]>`
        SELECT summary, type, occurred_at,
               1 - (embedding <=> ${vector}::vector) as similarity
        FROM episodes
        WHERE user_id = ${userId}
          AND embedding IS NOT NULL
          AND occurred_at BETWEEN ${start} AND ${end}
        ORDER BY embedding <=> ${vector}::vector
        LIMIT 5
      `,

      // Journal: semantic search (date is coarse, so semantic is more useful)
      prisma.$queryRaw<RecallJournalRow[]>`
        SELECT date, content,
               1 - (embedding <=> ${vector}::vector) as similarity
        FROM journal_entries
        WHERE user_id = ${userId}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vector}::vector
        LIMIT 3
      `,
    ]);

    return { facts, episodes, journal };
  }

  // No date range: full semantic search
  const [facts, episodes, journal] = await Promise.all([
    prisma.$queryRaw<RecallFactRow[]>`
      SELECT key, value, category, confidence,
             1 - (embedding <=> ${vector}::vector) as similarity
      FROM user_facts
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT 5
    `,

    prisma.$queryRaw<RecallEpisodeRow[]>`
      SELECT summary, type, occurred_at,
             1 - (embedding <=> ${vector}::vector) as similarity
      FROM episodes
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT 5
    `,

    prisma.$queryRaw<RecallJournalRow[]>`
      SELECT date, content,
             1 - (embedding <=> ${vector}::vector) as similarity
      FROM journal_entries
      WHERE user_id = ${userId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT 3
    `,
  ]);

  return { facts, episodes, journal };
}
