import type { gmail_v1 } from "googleapis";

export interface ParsedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: Date;
}

export async function fetchUnreadEmails(
  gmail: gmail_v1.Gmail,
  maxResults: number = 10,
): Promise<ParsedEmail[]> {
  const response = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread newer_than:7d",
    maxResults,
  });

  console.log(
    `Gmail: found ${response.data.messages?.length ?? 0} unread emails`,
  );

  const messageIds = response.data.messages || [];

  if (messageIds.length === 0) {
    return [];
  }

  // fetch full message
  const emails = await Promise.all(
    messageIds.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      return parseGmailMessage(detail.data);
    }),
  );

  return emails;
}

export function parseGmailMessage(
  message: gmail_v1.Schema$Message,
): ParsedEmail {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  let body = "";
  const payload = message.payload;

  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload?.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");

    const part = textPart ?? htmlPart;

    if (part?.body?.data) {
      body = Buffer.from(part.body.data, "base64").toString("utf-8");
    }

    if (body.length > 5000) {
      body = body.substring(0, 5000) + "\n\n[Email truncated]";
    }
  }

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeader("from"),
    to: getHeader("to"),
    subject: getHeader("subject"),
    body,
    date: new Date(parseInt(getHeader("date"))),
    snippet: message.snippet ?? "",
  };
}

export async function markAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"],
    },
  });
}

export async function createDraft(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
): Promise<string> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: RE: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawEmail).toString("base64");

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodedMessage,
        threadId,
      },
    },
  });

  return response.data.id ?? "";
}

export async function getEmailById(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<ParsedEmail> {
  const detail = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseGmailMessage(detail.data);
}

export async function sendEmail(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
): Promise<string> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawEmail).toString("base64url");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  return response.data.id ?? "";
}

export async function sendDraft(
  gmail: gmail_v1.Gmail,
  draftId: string,
): Promise<string> {
  const response = await gmail.users.drafts.send({
    userId: "me",
    requestBody: {
      id: draftId,
    },
  });

  return response.data.id ?? "";
}

export async function directReply(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  threadId: string,
  messageIdHeader: string, // IMPORTANT
): Promise<string> {
  const rawEmail = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    `In-Reply-To: ${messageIdHeader}`,
    `References: ${messageIdHeader}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawEmail).toString("base64url");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  return response.data.id ?? "";
}

export async function searchEmails(
  gmail: gmail_v1.Gmail,
  from: string,
  maxResults: number = 5,
): Promise<ParsedEmail[]> {
  // Gmail supports "from:" search operator for both names and addresses
  const query = `from:${from}`;

  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = response.data.messages || [];

  if (messageIds.length === 0) {
    return [];
  }

  const emails = await Promise.all(
    messageIds.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });
      return parseGmailMessage(detail.data);
    }),
  );

  return emails;
}
