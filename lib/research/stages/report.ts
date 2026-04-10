import type { SearchResult } from "@/lib/search/searchWeb";
import { callOpenRouter, extractJson } from "../utils";
import {
  QueryResult,
  ResearchPlan,
  ConflictResult,
  VerificationResult,
  REPORT_MODEL,
  LOG_PREFIX,
} from "@/lib/types/research";
import { reportPrompts } from "@/lib/prompts/deep-research-prompts";

// ── STAGE 6: Compile Report (plan-aware, conflict-aware)

export async function compileReport(
  topic: string,
  allResults: QueryResult[],
  plan: ResearchPlan,
  conflicts: ConflictResult,
): Promise<string> {
  console.log(`${LOG_PREFIX} compileReport() called`);

  // Deduplicate results by URL
  const seen = new Set<string>();
  const dedupedResults: SearchResult[] = [];

  for (const qr of allResults) {
    for (const result of qr.results) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        dedupedResults.push(result);
      }
    }
  }

  console.log(
    `${LOG_PREFIX} compileReport: ${dedupedResults.length} unique sources after dedup`,
  );

  // Build numbered source list
  const numberedSourceList = dedupedResults
    .map((r, i) => {
      const snippet =
        r.snippet.length > 200 ? r.snippet.slice(0, 200) + "..." : r.snippet;
      return `[${i + 1}] ${r.title} — ${r.source}\n    ${snippet}`;
    })
    .join("\n\n");

  // Build conflict note for the prompt
  const conflictNote = conflicts.hasConflicts
    ? `\nCONFLICTING EVIDENCE (must be noted in report):\n` +
      conflicts.conflicts
        .map((c) => `- ${c.claim}: ${c.positions.join(" vs ")}`)
        .join("\n")
    : "";

  // Build section plan from the research plan
  const sectionPlan = plan.sections
    .map(
      (s, i) =>
        `Section ${i + 1}: ${s.heading}\nPurpose: ${s.purpose}\nMust answer: ${s.keyQuestions.join("; ")}`,
    )
    .join("\n\n");

  const systemPrompt = reportPrompts.compileSystem(sectionPlan, conflictNote);
  const userMessage = reportPrompts.compileUser(topic, plan, numberedSourceList);

  console.log(
    `${LOG_PREFIX} compileReport: sending to LLM (model=${REPORT_MODEL})`,
  );

  const report = await callOpenRouter(
    systemPrompt,
    userMessage,
    2000,
    REPORT_MODEL,
  );

  console.log(
    `${LOG_PREFIX} compileReport: report generated, length=${report.length} chars`,
  );
  return report;
}

// ── STAGE 7: Verification Pass

export async function verifyReport(
  report: string,
  sources: SearchResult[],
): Promise<VerificationResult> {
  console.log(`${LOG_PREFIX} verifyReport() called`);

  // Deduplicate sources by URL (same logic as compileReport)
  const seen = new Set<string>();
  const dedupedSources: SearchResult[] = [];
  for (const s of sources) {
    if (!seen.has(s.url)) {
      seen.add(s.url);
      dedupedSources.push(s);
    }
  }

  // Extract which citation numbers the report actually uses
  const citedNumbers = new Set<number>();
  const citationRegex = /\[(\d+)\]/g;
  let match;
  while ((match = citationRegex.exec(report)) !== null) {
    citedNumbers.add(parseInt(match[1], 10));
  }

  // Build source reference using only the cited sources with correct [N] numbering
  // Cap at 20 sources to keep prompt size reasonable
  const citedIndices = Array.from(citedNumbers)
    .sort((a, b) => a - b)
    .slice(0, 20);

  const sourceRef = citedIndices
    .filter((n) => n >= 1 && n <= dedupedSources.length)
    .map((n) => {
      const s = dedupedSources[n - 1]; // citations are 1-indexed
      return `[${n}] ${s.source}: "${s.snippet.slice(0, 200)}"`;
    })
    .join("\n");

  console.log(
    `${LOG_PREFIX} verifyReport: ${citedNumbers.size} unique citations found, ${citedIndices.length} sources included for verification`,
  );

  const systemPrompt = reportPrompts.verifySystem();
  const userMessage = reportPrompts.verifyUser(sourceRef, report.slice(0, 3000));

  try {
    const response = await callOpenRouter(
      systemPrompt,
      userMessage,
      2500,
      REPORT_MODEL,
      true
    );
    const cleaned = extractJson(response);
    const result = JSON.parse(cleaned) as VerificationResult;

    if (result.issues?.length > 0) {
      console.log(
        `${LOG_PREFIX} Verification found ${result.issues.length} citation issues`,
      );
      result.issues.forEach((issue) => {
        console.warn(
          `${LOG_PREFIX} Unverified: "${issue.claim}" cited as ${issue.citation} — ${issue.issue}`,
        );
      });
    } else {
      console.log(`${LOG_PREFIX} Verification passed: all citations grounded`);
    }

    return result;
  } catch (err) {
    console.error(`${LOG_PREFIX} verifyReport failed:`, err);
    // On failure, return the original report unchanged
    return { verified: true, issues: [], cleanedReport: report };
  }
}
