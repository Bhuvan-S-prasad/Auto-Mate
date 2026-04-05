import { prisma } from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/cron/guard";
import {
  nowInIST,
  istDayBoundsUTC,
  toISTDateString,
  formatTimeIST,
  formatDateIST
} from "@/lib/utils/istDate";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ROUTE_MODEL = "google/gemini-2.0-flash-lite-001";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const istNow = nowInIST();
  // Cron fires at midnight IST — the day to summarise
  // is yesterday in IST (the day that just ended)
  const summaryDateIST = new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate() - 1
    )
  );
  const { dayStartUTC, dayEndUTC } = istDayBoundsUTC(summaryDateIST);

  console.log(
    `[daily-journal] Cron fired. IST time: ${formatTimeIST(new Date())} | ` +
    `Summarising IST date: ${toISTDateString(summaryDateIST)} | ` +
    `UTC bounds: ${dayStartUTC.toISOString()} → ${dayEndUTC.toISOString()}`
  );

  const activeUserIds = await prisma.journalEntry.findMany({
    where: {
      date: summaryDateIST,
      type: "user_entry",
    },
    select: { userId: true },
    distinct: ["userId"],
  }).then((rows) => rows.map((r) => r.userId));

  let processed = 0;

  await Promise.allSettled(
    activeUserIds.map(async (userId) => {
      const [userEntries, episodes] = await Promise.all([
        prisma.journalEntry.findMany({
          where: {
            userId,
            date: summaryDateIST,
            type: "user_entry",
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.episode.findMany({
          where: {
            userId,
            occurredAt: { gte: dayStartUTC, lte: dayEndUTC },
            importance: { gt: 2 },
          },
          orderBy: { occurredAt: "asc" },
        }),
      ]);

      if (!episodes.length && !userEntries.length) return;

      const episodePart = episodes.length
        ? `Agent activity:\n${episodes
            .map((e) => `- [${formatTimeIST(e.occurredAt)}] ${e.summary}`)
            .join("\n")}`
        : "";

      const notesPart = userEntries.length
        ? `User's own notes:\n${userEntries
            .map((n) => `- [${formatTimeIST(n.createdAt)}] ${n.content}`)
            .join("\n")}`
        : "";

      const prompt = `Write a warm, personal diary entry for this person's day on ${formatDateIST(summaryDateIST)}.

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
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[Daily Journal] OpenRouter error ${response.status}: ${errorText}`
          );
          return;
        }

        const data = await response.json();

        if (!data?.choices?.[0]?.message?.content) {
          console.error(
            `[Daily Journal] OpenRouter returned unexpected structure:`,
            JSON.stringify(data).slice(0, 200)
          );
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

      await prisma.journalEntry.upsert({
        where: {
          userId_date_type: {
            userId,
            date: summaryDateIST,
            type: "auto_daily_summary",
          },
        },
        create: {
          userId,
          date: summaryDateIST,
          type: "auto_daily_summary",
          content: content,
          highlights: highlights,
        },
        update: {
          content: content,
          highlights: highlights,
        },
      });

      processed++;
    })
  );

  return Response.json({
    ok: true,
    processed,
    date: toISTDateString(summaryDateIST),
  });
}
