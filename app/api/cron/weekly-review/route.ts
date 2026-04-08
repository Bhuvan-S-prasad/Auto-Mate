import { prisma } from "@/lib/prisma";
import { verifyCronRequest } from "@/lib/cron/guard";
import { getPersonalityInstruction } from "@/lib/constants/personality";
import {
  nowInIST,
  toISTDateString,
  formatDateIST
} from "@/lib/utils/istDate";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ROUTE_MODEL = "google/gemini-2.0-flash-lite-001";

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const istNow = nowInIST();
  const weekEndIST = new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate()
    )
  );
  const weekStartIST = new Date(
    Date.UTC(
      weekEndIST.getUTCFullYear(),
      weekEndIST.getUTCMonth(),
      weekEndIST.getUTCDate() - 6
    )
  );

  console.log(
    "[weekly-review] Running for week:",
    toISTDateString(weekStartIST),
    "to",
    toISTDateString(weekEndIST)
  );

  const userIds = await prisma.journalEntry
    .findMany({
      where: {
        date: { gte: weekStartIST, lte: weekEndIST },
        type: "auto_daily_summary",
      },
      select: { userId: true },
      distinct: ["userId"],
    })
    .then((rows) => rows.map((r) => r.userId));

  let processed = 0;

  await Promise.allSettled(
    userIds.map(async (userId) => {
      const [dailies, user] = await Promise.all([
        prisma.journalEntry.findMany({
          where: {
            userId,
            date: { gte: weekStartIST, lte: weekEndIST },
            type: "auto_daily_summary",
          },
          orderBy: { date: "asc" },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { preferences: true },
        }),
      ]);

      if (dailies.length < 3) return;

      const personalityInstruction = getPersonalityInstruction(
        user?.preferences as Record<string, unknown> | null,
      );

      const prompt = `Write a weekly reflection based on these daily summaries.

${dailies
  .map(
    (d) =>
      `${formatDateIST(d.date)}: ${d.content}`
  )
  .join("\n\n")}

Write 4-6 sentences in second person. Identify patterns, themes, and the overall arc of the week.
End with one sentence reflecting on the progress made and one forward-looking sentence about the week ahead. Plain text only.
${
  personalityInstruction
    ? `
<communication_style>
Style preference set by the user — applies to tone and presentation only.

"${personalityInstruction}"
</communication_style>`
    : ""
}`;

      // OpenRouter call
      let content = "";
      try {
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
              max_tokens: 500,
              temperature: 0.7,
            }),
          }
        );

        if (!response.ok) {
          console.error("OpenRouter error:", await response.text());
          return;
        }

        const data = await response.json();
        content = data?.choices?.[0]?.message?.content?.trim() || "";
      } catch (error) {
        console.error("OpenRouter fetch failed:", error);
        return;
      }

      if (!content) return;

      await prisma.journalEntry.upsert({
        where: {
          userId_date_type: {
            userId,
            date: weekEndIST,
            type: "weekly_review",
          },
        },
        create: {
          userId,
          date: weekEndIST,
          type: "weekly_review",
          content: content,
          highlights: [],
        },
        update: {
          content: content,
        },
      });

      processed++;
    })
  );

  return Response.json({
    ok: true,
    processed,
    weekEnd: toISTDateString(weekEndIST),
  });
}
