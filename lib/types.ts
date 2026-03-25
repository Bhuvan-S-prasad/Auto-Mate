// Shape of each entry in AgentRun.actionsLog (Json field in Prisma)
export type ActionLogEntry = {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  status: "success" | "error";
  summary?: string;
  priority?: string;
  category?: string;
  needsReply?: boolean;
  draftReply?: string | null;
  actionItems?: {
    title: string;
    description: string;
    dueDate: string | null;
  }[];
  tasksCreated?: number;
  draftCreated?: boolean;
  eventsCreated?: number;
  error?: string;
}

export type ProcessedEmail = ActionLogEntry & { processedAt: Date };
