export function formatApprovalPreview(
  toolName: string,
  input: Record<string, unknown>,
): string {
  switch (toolName) {
    case "createDraft":
    case "sendEmail":
      return [
        `📧 ${toolName === "sendEmail" ? "Send Email" : "Create Draft"}`,
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        `Body: ${String(input.body)}`,
        "",
        "Reply YES to confirm, NO to cancel.",
      ].join("\n");

    case "createCalendarEvent": {
      const lines = [
        "📅 Create Calendar Event",
        `Title: ${input.title}`,
        `Date: ${input.date}`,
      ];
      if (input.startTime) lines.push(`Start: ${input.startTime}`);
      if (input.endTime) lines.push(`End: ${input.endTime}`);
      if (input.description) lines.push(`Description: ${input.description}`);
      lines.push("", "Reply YES to confirm, NO to cancel.");
      return lines.join("\n");
    }

    default:
      return `Action: ${toolName}\n${JSON.stringify(input, null, 2)}\n\nReply YES to confirm, NO to cancel.`;
  }
}
