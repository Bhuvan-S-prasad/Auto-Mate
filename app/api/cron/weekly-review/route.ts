import { prisma } from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/cron/guard";
import { embed } from "@/lib/agents/embed";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ROUTE_MODEL = "google/gemini-2.0-flash-lite-001";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const weekAgo = new Date(today);
  weekAgo.setUTCDate(today.getUTCDate() - 7);

  const userIds = await prisma.journalEntry
    .findMany({
      where: { date: { gte: weekAgo }, type: "auto_daily_summary" },
      select: { userId: true },
      distinct: ["userId"],
    })
    .then((rows) => rows.map((r) => r.userId));

  await Promise.allSettled(
    userIds.map(async (userId) => {
      const existing = await prisma.journalEntry.findFirst({
        where: { userId, date: today, type: "weekly_review" },
      });
      if (existing) return;

      const dailies = await prisma.journalEntry.findMany({
        where: {
          userId,
          date: { gte: weekAgo },
          type: "auto_daily_summary",
        },
        orderBy: { date: "asc" },
        select: { date: true, content: true },
      });

      if (dailies.length < 3) return;

      const prompt = `Write a weekly reflection based on these daily summaries.

${dailies
  .map(
    (d) =>
      `${d.date.toLocaleDateString("en-IN", {
        weekday: "long",
      })}: ${d.content}`,
  )
  .join("\n\n")}

Write 4-6 sentences in second person. Identify patterns, themes, and the overall arc of the week.
End with one forward-looking sentence about the week ahead. Plain text only.`;

      // OpenRouter call
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Journal Agent",
          },
          body: JSON.stringify({
            model: ROUTE_MODEL,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        },
      );

      if (!response.ok) {
        console.error("OpenRouter error:", await response.text());
        return;
      }

      const data = await response.json();

      const content = data?.choices?.[0]?.message?.content?.trim() || "";

      if (!content) return;

      const embedding = await embed(content);

      await prisma.$executeRaw`
        INSERT INTO journal_entries
          (id, user_id, date, type, content, highlights, embedding, created_at)
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${today},
          'weekly_review',
          ${content},
          ${[]}::text[],
          ${`[${embedding.join(",")}]`}::vector,
          NOW()
        )
        ON CONFLICT (user_id, date, type) DO NOTHING
      `;
    }),
  );

  return Response.json({ ok: true });
}
