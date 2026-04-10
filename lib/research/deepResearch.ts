import { logEpisode } from "@/lib/agents/agent-tools/memory";
import { sendToUser } from "./utils";
import { LOG_PREFIX } from "../types/research";
import { assessClarification } from "./stages/clarification";
import { createResearchPlan, planQueries } from "./stages/planning";
import { searchAllQueries, detectGaps } from "./stages/search";
import { detectConflicts } from "./stages/analysis";
import { compileReport, verifyReport } from "./stages/report";
import { formatAndDeliver } from "./delivery";

export async function runDeepResearch(
  userId: string,
  topic: string,
): Promise<void> {
  console.log(`${LOG_PREFIX} ========== START: runDeepResearch ==========`);
  console.log(`${LOG_PREFIX} userId=${userId}, topic="${topic}"`);
  const startTime = Date.now();

  try {
    // ── Stage 0: Clarification check
    console.log(`${LOG_PREFIX} Stage 0: Assessing clarification...`);
    const clarification = await assessClarification(topic);

    if (clarification.needsClarification) {
      console.log(`${LOG_PREFIX} Stage 0: Clarification needed, asking user`);
      await sendToUser(
        userId,
        `Before I start researching, one question:\n\n${clarification.question}\n\nPlease reply, and then send the /research command again with more detail.`,
      );
      return;
    }

    const refinedTopic = clarification.refinedTopic || topic;
    const scope = clarification.researchScope || "";
    console.log(
      `${LOG_PREFIX} Stage 0 complete: refinedTopic="${refinedTopic}", scope="${scope}"`,
    );

    // ── Stage 1: Research plan
    console.log(`${LOG_PREFIX} Stage 1: Creating research plan...`);
    await sendToUser(
      userId,
      `🔬 Researching: "${refinedTopic}"\n📋 Creating research plan...`,
    );
    const plan = await createResearchPlan(refinedTopic, scope);
    await sendToUser(
      userId,
      `✅ Plan ready: "${plan.title}"\n📑 ${plan.sections.length} sections · ${plan.searchAngles.length} search angles\n\nStarting searches...`,
    );
    console.log(`${LOG_PREFIX} Stage 1 complete: plan created`);

    // ── Stage 2: Plan queries (guided by research plan angles)
    console.log(`${LOG_PREFIX} Stage 2: Planning queries...`);
    const queries = await planQueries(refinedTopic, plan.searchAngles);
    console.log(
      `${LOG_PREFIX} Stage 2 complete: ${queries.length} queries planned`,
    );

    // ── Stage 3: Search
    console.log(`${LOG_PREFIX} Stage 3: Executing searches...`);
    await sendToUser(
      userId,
      `🔎 Running ${queries.length} searches in parallel...`,
    );
    const queryResults = await searchAllQueries(queries);
    const totalFound = queryResults.reduce((n, qr) => n + qr.results.length, 0);
    console.log(
      `${LOG_PREFIX} Stage 3 complete: ${totalFound} total results from ${queryResults.length} queries`,
    );

    // ── Stage 4: Gap detection
    console.log(`${LOG_PREFIX} Stage 4: Detecting gaps...`);
    const gaps = await detectGaps(refinedTopic, queryResults);
    let allResults = queryResults;

    if (gaps.length > 0) {
      console.log(`${LOG_PREFIX} Stage 4: Filling ${gaps.length} gaps...`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Filling ${gaps.length} research gaps...`,
      );
      const gapResults = await searchAllQueries(gaps);
      allResults = [...queryResults, ...gapResults];
      console.log(
        `${LOG_PREFIX} Stage 4 complete: gap searches done, total query sets=${allResults.length}`,
      );
    } else {
      console.log(`${LOG_PREFIX} Stage 4 complete: no gaps found`);
      await sendToUser(
        userId,
        `🔍 Found ${totalFound} sources. Analysing for conflicts...`,
      );
    }

    // Check for empty results
    const allSources = allResults.flatMap((qr) => qr.results);
    if (allSources.length === 0) {
      console.warn(`${LOG_PREFIX} No sources found — aborting`);
      await sendToUser(
        userId,
        `Research on "${refinedTopic}" found no sources. Try rephrasing the topic or use /research with a more specific query.`,
      );
      return;
    }

    // ── Stage 5: Conflict detection
    console.log(`${LOG_PREFIX} Stage 5: Detecting conflicts...`);
    const conflicts = await detectConflicts(refinedTopic, allResults);
    if (conflicts.hasConflicts) {
      await sendToUser(
        userId,
        `⚠️ Found ${conflicts.conflicts.length} conflicting claims across sources. These will be noted in the report.`,
      );
    }
    console.log(`${LOG_PREFIX} Stage 5 complete`);

    // ── Stage 6: Compile (plan-aware, conflict-aware)
    console.log(
      `${LOG_PREFIX} Stage 6: Compiling report with ${allSources.length} total sources`,
    );
    await sendToUser(userId, `✍️ Compiling report...`);
    const rawReport = await compileReport(
      refinedTopic,
      allResults,
      plan,
      conflicts,
    );
    console.log(
      `${LOG_PREFIX} Stage 6 complete: report compiled (${rawReport.length} chars)`,
    );

    // ── Stage 7: Verification
    console.log(`${LOG_PREFIX} Stage 7: Verifying citations...`);
    await sendToUser(userId, `🔎 Verifying citations against sources...`);
    const verification = await verifyReport(rawReport, allSources);

    if (!verification.verified && verification.issues.length > 0) {
      console.log(
        `${LOG_PREFIX} Stage 7: Report verified with ${verification.issues.length} issues corrected`,
      );
    } else {
      console.log(`${LOG_PREFIX} Stage 7: All citations verified`);
    }

    const finalReport = verification.cleanedReport || rawReport;

    // ── Stage 8: Deliver
    console.log(`${LOG_PREFIX} Stage 8: Delivering report...`);
    await formatAndDeliver(userId, refinedTopic, finalReport, allSources);
    console.log(`${LOG_PREFIX} Stage 8 complete: report delivered`);

    // Log as episode (fire and forget)
    logEpisode(userId, {
      type: "agent_action",
      data: {
        action: "deep_research",
        topic: refinedTopic,
        sourceCount: allSources.length,
        conflictsFound: conflicts.conflicts.length,
        verificationIssues: verification.issues.length,
        planSections: plan.sections.length,
      },
      importance: 3,
    }).catch(() => {});

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${LOG_PREFIX} ========== DONE in ${elapsed}s ==========`);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(
      `${LOG_PREFIX} ========== FAILED after ${elapsed}s ==========`,
    );
    console.error(`${LOG_PREFIX} Error:`, err);
    await sendToUser(
      userId,
      `Research on "${topic}" failed. ${err instanceof Error ? err.message : "Unknown error"}. Try again or use webSearch for a quick overview.`,
    );
  }
}
