
export const TOOL_DEFINITIONS = [
  // Gmail
  {
    type: "function" as const,
    function: {
      name: "fetchUnreadEmails",
      description:
        "Use this when the user asks about their inbox, unread messages, recent emails, or wants a summary of what arrived. Returns a list of unread emails with id, threadId, from, to, subject, snippet, body, and date.",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description:
              "Maximum number of emails to return. Defaults to 10 if not specified.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getEmailById",
      description:
        "Use this to retrieve the full content of a single email by its ID. Useful when the user asks to read a specific email, see the full body, or when you need more detail on a previously fetched email.",
      parameters: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            description: "The Gmail message ID to retrieve.",
          },
        },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createDraft",
      description:
        "Use this to draft a reply or a new email in the user's Gmail. This creates a draft — it does NOT send the email. Use when the user says 'draft a reply', 'write an email to…', or after analyzing an email that needs a response. Requires user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address.",
          },
          subject: {
            type: "string",
            description: "Email subject line.",
          },
          body: {
            type: "string",
            description: "Plain text body of the email.",
          },
          threadId: {
            type: "string",
            description:
              "Optional Gmail thread ID. Include this when replying to an existing conversation so the draft appears in the same thread.",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sendEmail",
      description:
        "Use this to immediately send an email from the user's Gmail account. Use when the user explicitly says 'send', not 'draft'. Requires user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address.",
          },
          subject: {
            type: "string",
            description: "Email subject line.",
          },
          body: {
            type: "string",
            description: "Plain text body of the email.",
          },
          threadId: {
            type: "string",
            description:
              "Optional Gmail thread ID for replying within an existing conversation.",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sendDraft",
      description:
        "Use this to send a previously created draft email. Use when the user says 'send the email in my draft', 'send that draft', or similar. Requires user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          draftId: {
            type: "string",
            description: "The Gmail draft ID to send.",
          },
        },
        required: ["draftId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "markAsRead",
      description:
        "Use this to mark a specific email as read. Useful after the user has reviewed an email or asked to dismiss it.",
      parameters: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            description: "The Gmail message ID to mark as read.",
          },
        },
        required: ["messageId"],
      },
    },
  },

  // Calendar
  {
    type: "function" as const,
    function: {
      name: "fetchUpcomingEvents",
      description:
        "Use this when the user asks about their schedule, upcoming meetings, today's agenda, or what's on their calendar. Returns events with id, summary, start, end, location, and description.",
      parameters: {
        type: "object",
        properties: {
          hoursAhead: {
            type: "number",
            description:
              "How many hours ahead to look. Defaults to 24 if not specified. Use 168 for a week.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createCalendarEvent",
      description:
        "Use this to create a new calendar event. Use when the user says 'schedule a meeting', 'add to my calendar', 'remind me on…', or when an email mentions a deadline or meeting time. Requires user approval before execution.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short event title.",
          },
          description: {
            type: "string",
            description: "Event description or context.",
          },
          date: {
            type: "string",
            description: "ISO date string (YYYY-MM-DD).",
          },
          startTime: {
            type: "string",
            description:
              "ISO datetime string for the start time. Omit for all-day events.",
          },
          endTime: {
            type: "string",
            description:
              "ISO datetime string for the end time. Omit for all-day events.",
          },
        },
        required: ["title", "description", "date"],
      },
    },
  },

  // Memory
  {
    type: "function" as const,
    function: {
      name: "recallMemory",
      description:
        'Use this when the user asks about something from the past — "what did I do last week", "who is Sarah", "where is my dentist", "what was that project called". Searches episodic memory and stored user facts using semantic search.',
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A natural-language search query describing what to look up.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "storeUserFact",
      description:
        'Use this to remember an important fact about the user for future reference. Use when the user shares personal info like "I live in Berlin", "my manager is Sarah", "I prefer morning meetings", or when you infer a recurring pattern.',
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              'A short, unique identifier for this fact (e.g. "home_city", "manager_name").',
          },
          value: {
            type: "string",
            description: "The fact value to store.",
          },
          category: {
            type: "string",
            enum: [
              "location",
              "person",
              "preference",
              "routine",
              "relationship",
              "other",
            ],
            description: "Category of the fact.",
          },
        },
        required: ["key", "value", "category"],
      },
    },
  },

  // Telegram
  {
    type: "function" as const,
    function: {
      name: "sendTelegramMessage",
      description:
        "Use this to proactively send a notification or message to the user on Telegram. Useful for alerts, reminders, or when the user asks to be notified about something later.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The message text to send.",
          },
        },
        required: ["text"],
      },
    },
  },
  // Journal
  {
    type: "function" as const,
    function: {
      name: "createJournalEntry",
      description:
        "Use this to write a new journal entry for the user. Useful for auto-daily summaries, weekly reviews, or explicit user journal entries.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "ISO date string (YYYY-MM-DD).",
          },
          type: {
            type: "string",
            enum: ["auto_daily_summary", "user_entry", "weekly_review"],
            description: "The type of the journal entry.",
          },
          content: {
            type: "string",
            description: "The main body/content of the journal entry.",
          },
          highlights: {
            type: "array",
            items: { type: "string" },
            description: "A list of bullet points or key highlights.",
          },
          mood: {
            type: "string",
            description: "An optional mood descriptor for the entry (e.g. 'happy', 'stressed').",
          },
        },
        required: ["date", "type", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetchJournalEntries",
      description:
        "Use this to retrieve the user's past journal entries. Useful when the user wants to reflect on past events, summaries, or moods.",
      parameters: {
        type: "object",
        properties: {
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string", description: "Start date (YYYY-MM-DD)." },
              end: { type: "string", description: "End date (YYYY-MM-DD)." },
            },
            required: ["start", "end"],
            description: "Optional date range to filter entries.",
          },
        },
        required: [],
      },
    },
  },

  // Web Search
  {
    type: "function" as const,
    function: {
      name: "webSearch",
      description: `Search the web for current information not in your training data.

Use when:
- User asks about recent events, news, scores, prices, or current status
- The question is time-sensitive ("latest", "yesterday", "current", "now")
- You need to verify a specific recent fact

Do NOT use when:
- User asks a personal question — use recallMemory instead
- You already know the answer from training knowledge
- The question is about Gmail, Calendar, or the user's data

For quick facts: use this tool once.`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: 'Specific, precise search query. Good: "IPL 2025 match results today". Bad: "sports news".'
          },
          topic: {
            type: "string",
            enum: ["general", "news"],
            description: 'Use "news" for current events and recent developments. Default: "general".'
          },
        },
        required: ["query"],
      },
    },
  },

  // Deep Research -- removed : accessed through direct command --
 
];

// Tools that change state — require user approval before execution
export const MUTATING_TOOLS = new Set([
  "createDraft",
  "sendEmail",
  "sendDraft",
  "createCalendarEvent",
]);

// Read only tools that do not require explicit user approval
export const READ_ONLY_TOOLS = new Set([
  "fetchUnreadEmails",
  "getEmailById",
  "fetchUpcomingEvents",
  "recallMemory",
  "fetchJournalEntries",
  "webSearch",
]);
