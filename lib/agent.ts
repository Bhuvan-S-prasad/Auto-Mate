import {
  CalendarEvent,
  createCalendarEvent,
  fetchUpcomingEvents,
} from "./agents/calendar";
import { createDraft, fetchUnreadEmails, markAsRead } from "./agents/gmail";
import { analyzeWithAI } from "./agents/process-email";
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
    let totalTasksCreated = 0;
    let totalDraftsCreated = 0;
    let totalEventsCreated = 0;

    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try {
          //analyse
          const analysis = await analyzeWithAI(email, upcomingEvents);
          let emailTaskCreated = 0;

          for (const item of analysis.actionItems) {
            await prisma.task.create({
              data: {
                userId,
                title: item.title,
                description: item.description,
                priority: analysis.priority,
                dueDate: item.dueDate ? new Date(item.dueDate) : null,
              },
            });
            emailTaskCreated++;
          }

          // create gmail draft
          let draftCreated = false;
          if (analysis.needsReply && analysis.draftReply) {
            await createDraft(
              gmailClient,
              email.from,
              email.subject,
              analysis.draftReply,
              email.threadId,
            );
            draftCreated = true;
          }

          // create calendar events
          let emailEventsCreated = 0;
          if (calendarClient && analysis.calendarEvents.length > 0) {
            for (const event of analysis.calendarEvents) {
              try {
                await createCalendarEvent(calendarClient, event);
                emailEventsCreated++;
              } catch (error) {
                console.log("Error creating calendar event:", error);
              }
            }
          }

          // mark email as read

          await markAsRead(gmailClient, email.id);

          return {
            emailId: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date.toISOString(),
            status: "success" as const,
            summary: analysis.summary,
            priority: analysis.priority,
            category: analysis.category,
            needsReply: analysis.needsReply,
            draftReply: analysis.draftReply,
            calendarEvents: analysis.calendarEvents ?? [],
            tasksCreated: emailTaskCreated,
            draftCreated: draftCreated,
            eventsCreated: emailEventsCreated,
          };
        } catch (error) {
          console.log("Error processing email:", error);
          return {
            emailId: email.id,
            subject: email.subject,
            from: email.from,
            date: email.date.toISOString(),
            status: "error" as const,
            error: error instanceof Error ? error.message : "unknown error",
          };
        }
      }),
    );

    // aggregate results
    for (const result of results) {
      if(result.status == "fulfilled") {
        const entry = result.value;
        actionLog.push(entry);
        if (entry.status === "success") {
          totalTasksCreated += entry.tasksCreated ?? 0;
          totalDraftsCreated += entry.draftCreated ? 1 : 0;
          totalEventsCreated += entry.eventsCreated ?? 0;
        }
      }
    }

    const sucessCount = actionLog.filter(
      (entry) => entry.status === "success"
    ).length;

    const errorCount = actionLog.filter(
      (entry) => entry.status === "error"
    ).length;

   const overallStatus = sucessCount > 0 ? "success" : "failed";

   const summary = [
    `processed ${sucessCount} email${sucessCount === 1 ? "" : "s"}`,
    totalTasksCreated > 0 ? `created ${totalTasksCreated} task${totalTasksCreated === 1 ? "" : "s"}` : "no tasks created",
    totalDraftsCreated > 0 ? `created ${totalDraftsCreated} draft${totalDraftsCreated === 1 ? "" : "s"}` : "no drafts created",
    totalEventsCreated > 0 ? `created ${totalEventsCreated} event${totalEventsCreated === 1 ? "" : "s"}` : "no events created",
    errorCount > 0 ? `failed to process ${errorCount} email${errorCount === 1 ? "" : "s"}` : "",
    upcomingEvents.length > 0 ? `upcoming events: ${upcomingEvents.length}` : "no upcoming events",
   ].filter(Boolean).join(", ");


   // update agent run
   const run = await prisma.agentRun.update({
    where: {
      id: agentRun.id,
    },
    data: {
      status: overallStatus,
      summary: summary,
      actionsLog: actionLog,
      emailsProcessed: emails.length,
      tasksCreated: totalTasksCreated,
      draftsCreated: totalDraftsCreated,
      errorMessage: errorCount > 0 ? `Failed to process ${errorCount} emails` : null,
      durationMs: Date.now() - startTime,
    },
   });

   return {
    runId: run.id,
    status: overallStatus,
    summary,
   };
     


  } catch (error) {
    console.log(error);
  }
}
