import { prisma } from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/cron/guard";
import { embed } from "@/lib/agents/embed";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ROUTE_MODEL = "google/gemini-2.0-flash-lite-001";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(yesterday.toDateString());

  const dayStart = new Date(date);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [episodeUsers, entryUsers] = await Promise.all([
    prisma.episode.findMany({
      where: { occurredAt: { gte: dayStart, lte: dayEnd } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.journalEntry.findMany({
      where: { date: { gte: dayStart, lte: dayEnd }, type: "user_entry" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const activeUserIds = Array.from(new Set([
    ...episodeUsers.map((r) => r.userId),
    ...entryUsers.map((r) => r.userId)
  ]));

  let processed = 0;

  await Promise.allSettled(
    activeUserIds.map(async (userId) => {
      const existing = await prisma.journalEntry.findFirst({
        where: { userId, date, type: "auto_daily_summary" },
      });
      if (existing) return;

      const [userEntries, episodes] = await Promise.all([
        prisma.journalEntry.findMany({
          where: {
            userId,
            date: { gte: dayStart, lte: dayEnd },
            type: "user_entry",
          },
          orderBy: { createdAt: "asc" },
          select: { content: true, createdAt: true },
        }),
        prisma.episode.findMany({
          where: {
            userId,
            occurredAt: { gte: dayStart, lte: dayEnd },
            importance: { gt: 2 },
          },
          orderBy: { occurredAt: "asc" },
          select: { summary: true, occurredAt: true }
        }),
      ]);

      if (!episodes.length && !userEntries.length) return;

      const episodePart = episodes.length
        ? `Agent activity:\n${episodes
            .map(
              (e) =>
                `- [${e.occurredAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}] ${e.summary}`,
            )
            .join("\n")}`
        : "";

      const notesPart = userEntries.length
        ? `User's own notes:\n${userEntries
            .map(
              (n) =>
                `- [${n.createdAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}] ${n.content}`,
            )
            .join("\n")}`
        : "";

      const prompt = `Write a warm, personal diary entry for this person's day on ${date.toLocaleDateString(
        "en-IN",
        { weekday: "long", day: "numeric", month: "long" },
      )}.

${episodePart}
${notesPart}

Rules:
- Write in second person ("You started your day...")
- 3-5 sentences. Be specific, use names and times if present.
- Weave together the agent actions and their own notes naturally.
- End with one sentence reflecting the overall feel of the day.
- Plain text only, no bullet points.`;

      // 🔥 OpenRouter call
      let content = "";
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: ROUTE_MODEL,
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens: 400,
              temperature: 0.7,
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Daily Journal] OpenRouter error ${response.status}: ${errorText}`);
          return;
        }

        const data = await response.json();
        
        if (!data?.choices?.[0]?.message?.content) {
          console.error(`[Daily Journal] OpenRouter returned unexpected structure:`, JSON.stringify(data).slice(0, 200));
          return;
        }

        content = data.choices[0].message.content.trim();
        
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.error(`[Daily Journal] OpenRouter request timed out after 15s`);
        } else {
          console.error(`[Daily Journal] OpenRouter fetch failed:`, error);
        }
        return;
      }

      if (!content) return;

      const highlights = episodes.slice(0, 4).map((e) => e.summary);
      const embedding = await embed(content);

      await prisma.$executeRaw`
        INSERT INTO journal_entries
          (id, user_id, date, type, content, highlights, embedding, created_at)
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${date},
          'auto_daily_summary',
          ${content},
          ${highlights}::text[],
          ${`[${embedding.join(",")}]`}::vector,
          NOW()
        )
        ON CONFLICT (user_id, date, type) 
        DO UPDATE SET 
          content = EXCLUDED.content,
          highlights = EXCLUDED.highlights,
          embedding = EXCLUDED.embedding
      `;

      processed++;
    }),
  );

  return Response.json({ ok: true, processed, date: date.toISOString() });
}
