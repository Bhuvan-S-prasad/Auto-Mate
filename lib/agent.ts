import { CalendarEvent, fetchUpcomingEvents } from "./agents/calendar";
import { fetchUnreadEmails } from "./agents/gmail";
import { getCalendarClient, getGmailClient } from "./google-client";
import { prisma } from "./prisma";
import { ActionLogEntry } from "./types";

export async function runAgent(userId: string) {
  try {
    const startTime = Date.now();
    // agent run by user ID
    const agentRun = await prisma.agentRun.create({
      data: {
        userId,
        status: "running",
      },
    });

    // gmail client
    const gmailClient = await getGmailClient(userId);
    if (!gmailClient) {
      const run = await prisma.agentRun.update({
        where: {
          id: agentRun.id,
        },
        data: {
          status: "failed",
          summary: "Gmail not connected",
          actionsLog: [],
          emailsProcessed: 0,
          tasksCreated: 0,
          errorMessage: "Gmail integration not found or token expired",
          durationMs: Date.now() - startTime,
        },
      });

      return {
        runId: run.id,
        status: "failed",
        summary: "Gmail not connected",
      };
    }

    // fetch unread emails
    const emails = await fetchUnreadEmails(gmailClient, 10);

    if (emails.length === 0) {
      const run = await prisma.agentRun.update({
        where: {
          id: agentRun.id,
        },
        data: {
          status: "success",
          summary: "No unread emails found",
          actionsLog: [],
          emailsProcessed: 0,
          tasksCreated: 0,
          draftsCreated: 0,
          durationMs: Date.now() - startTime,
        },
      });

      return {
        runId: run.id,
        status: "success",
        summary: "No unread emails found",
      };
    }

    // fetch calendar events
    const calendarClient = await getCalendarClient(userId);
    let upcomingEvents: CalendarEvent[] = [];
    if (calendarClient) {
      try {
        upcomingEvents = await fetchUpcomingEvents(calendarClient, 24);
      } catch (error) {
        console.log("Error fetching calendar events:", error);
      }
    }

    // process each email with AI

    const actionLog: ActionLogEntry[] = [];

    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try { 
          //analyse
        } catch (error) {
          console.log("Error processing email:", error);
        }
      }),
    );
  } catch (error) {
    console.log(error);
  }
}
