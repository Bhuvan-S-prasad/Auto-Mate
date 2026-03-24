import { CalendarEvent } from "./calendar";
import { ParsedEmail } from "./gmail";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";

import { z } from "zod";

const emailAnalysisSchema = z.object({
  summary: z.string().describe("A 1-2 sentence summary of the email"),
  priority: z
    .enum(["low", "medium", "high"])
    .describe(
      "Priority level: high = urgent/time-sensitive, medium = requires action soon, low = informational",
    ),
  actionItems: z
    .array(
      z.object({
        title: z.string().describe("Short task title"),
        description: z
          .string()
          .describe("More detail about what needs to be done"),
        dueDate: z
          .string()
          .nullable()
          .describe(
            "ISO date string if a deadline is mentioned, otherwise null",
          ),
      }),
    )
    .describe("Concrete action items extracted from the email"),
  needsReply: z.boolean().describe("Whether this email requires a response"),
  draftReply: z
    .string()
    .nullable()
    .describe(
      "A professional draft reply if needsReply is true, otherwise null",
    ),
  calendarEvents: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            'Short event title, e.g. "Review proposal" or "Meeting with Sarah"',
          ),
        description: z
          .string()
          .describe("Brief event description with context from the email"),
        date: z
          .string()
          .describe(
            "ISO date string for the event (e.g. deadline day or meeting day)",
          ),
        startTime: z
          .string()
          .nullable()
          .describe(
            "ISO datetime string if a specific time is mentioned, otherwise null for all-day event",
          ),
        endTime: z
          .string()
          .nullable()
          .describe("ISO datetime string for event end, otherwise null"),
      }),
    )
    .describe(
      'Calendar events to create from this email. Create events for deadlines, meetings, reminders, or any time-sensitive items mentioned. If someone says "by Friday", create a reminder event on that day.',
    ),
  category: z
    .enum(["work", "personal", "newsletter", "notification", "spam", "other"])
    .describe("Email category for organization"),
});

export type EmailAnalysis = z.infer<typeof emailAnalysisSchema>;

// ── Build the prompt ──────────────────────────────────────────────────
function buildPrompt(
  email: ParsedEmail,
  upcomingEvents: CalendarEvent[],
): string {
  const today = new Date().toISOString().split("T")[0];

  let calendarContext = "";
  if (upcomingEvents.length > 0) {
    const eventsList = upcomingEvents
      .map(
        (e) =>
          `- ${e.summary} (${e.start} to ${e.end}${e.location ? `, at ${e.location}` : ""})`,
      )
      .join("\n");
    calendarContext = `\n\nUpcoming calendar events (next 24 hours):\n${eventsList}\n\nUse these events to inform your analysis. For example, if the email mentions a meeting that's already on the calendar, don't create a duplicate task. If someone proposes a time that conflicts with an existing event, note the conflict in the draft reply.`;
  }

  return `You are an AI assistant analyzing emails. Today's date is ${today}.

Analyze the following email and extract structured information:

From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${email.date}

Body:
${email.body}${calendarContext}

Instructions:
- Extract action items for any tasks or requests mentioned.
- If the email mentions ANY deadline, meeting, or time-sensitive event (e.g. "by Friday", "next Tuesday", "schedule a call"), you MUST create a calendar event for it. Convert relative dates like "Friday" to actual ISO dates based on today's date (${today}).
- If a reply is needed, draft a professional response.
- Categorize the email and set priority based on urgency.

Respond ONLY with valid JSON matching the required schema.`;
}

// ── OpenRouter fallback (free-tier model) ─────────────────────────────
async function analyzeWithOpenRouter(prompt: string): Promise<EmailAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Auto-Mate",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          {
            role: "system",
            content:
              "You are a JSON-only assistant. Respond with ONLY valid JSON, no markdown fences or extra text.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenRouter request failed (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return emailAnalysisSchema.parse(parsed);
}

// ── Main export ───────────────────────────────────────────────────────
export async function analyzeWithAI(
  email: ParsedEmail,
  upcomingEvents: CalendarEvent[],
): Promise<EmailAnalysis> {
  const prompt = buildPrompt(email, upcomingEvents);
  let primaryError: unknown;

  // Primary: Gemini 2.5 Flash via AI SDK
  try {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      output: Output.object({ schema: emailAnalysisSchema }),
    });
    return result.output;
  } catch (err) {
    primaryError = err;
    console.error("Gemini analysis failed, falling back to OpenRouter:", err);
  }

  // Fallback: Llama 3.3 70B via OpenRouter (free tier)
  try {
    return await analyzeWithOpenRouter(prompt);
  } catch (fallbackError) {
    console.error("OpenRouter fallback also failed:", fallbackError);
    const msg1 =
      primaryError instanceof Error
        ? primaryError.message
        : String(primaryError);
    const msg2 =
      fallbackError instanceof Error
        ? fallbackError.message
        : String(fallbackError);
    throw new Error(
      `Email analysis failed on both providers. Primary: ${msg1}. Fallback: ${msg2}`,
    );
  }
}
