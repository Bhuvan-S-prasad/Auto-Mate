import type { SearchResult } from "@/lib/search/searchWeb";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";


export const LOG_PREFIX = "[DeepResearch]";

export interface ClarificationResult {
  needsClarification: boolean;
  question?: string;
  refinedTopic?: string;
  researchScope?: string;
}

export interface ResearchPlan {
  title: string;
  objective: string;
  sections: {
    heading: string;
    purpose: string;
    keyQuestions: string[];
  }[];
  searchAngles: string[];
  limitations: string;
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface QueryResult {
  query: string;
  results: SearchResult[];
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: {
    claim: string;
    positions: string[];
    sources: string[];
  }[];
}

export interface VerificationResult {
  verified: boolean;
  issues: {
    claim: string;
    citation: string;
    issue: string;
  }[];
  cleanedReport: string;
}
