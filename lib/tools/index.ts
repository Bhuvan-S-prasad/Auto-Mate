// lib/tools/index.ts
export const TOOLS = [
  {
    name: "fetchUnreadEmails",
    description:
      "Fetch unread emails from Gmail. Returns list of emails with id, threadId, from, to, subject, snippet, body, and date.",
    input_schema: {
      type: "object",
      properties: { maxResults: { type: "number", description: "Maximum number of emails to fetch (default: 10)" } },
      required: [],
    },
  },
  {
    name: "createDraft",
    description: "Create a draft email. Use ONLY after user approval. Optionally pass a threadId to reply.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        threadId: { type: "string", description: "Optional Gmail thread ID to reply to" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "markAsRead",
    description: "Mark a specific email as read.",
    input_schema: {
      type: "object",
      properties: {
        messageId: { type: "string", description: "The ID of the email message to mark as read" },
      },
      required: ["messageId"],
    },
  },
  {
    name: "fetchUpcomingEvents",
    description:
      "Fetch upcoming calendar events. Returns list of events with id, summary, start, end, location, and description.",
    input_schema: {
      type: "object",
      properties: {
        hoursAhead: { type: "number", description: "How many hours ahead to look (default 24)" },
      },
      required: [],
    },
  },
  {
    name: "createCalendarEvent",
    description: "Create a calendar event. Use ONLY after user approval.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the calendar event" },
        description: { type: "string", description: "Description or context for the event" },
        date: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
        startTime: { type: "string", description: "ISO datetime string. Null or empty for all-day events." },
        endTime: { type: "string", description: "ISO datetime string. Null or empty for all-day events." },
      },
      required: ["title", "description", "date"],
    },
  },
  {
    name: "analyzeEmail",
    description:
      "Analyze an email using AI to extract structured information like summary, priority, action items, and draft replies.",
    input_schema: {
      type: "object",
      properties: { emailId: { type: "string", description: "The ID of the email to analyze" } },
      required: ["emailId"],
    },
  },
  {
    name: "recallMemory",
    description:
      'Search episodic memory and user facts. Use for "what did I do", "where is my X", "who is Y".',
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "sendTelegramMessage",
    description: "Send a message to the user on Telegram.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
];

// Mutating tools require approval before execution
export const MUTATING_TOOLS = new Set([
  "createDraft",
  "createCalendarEvent",
  "markAsRead",
]);
