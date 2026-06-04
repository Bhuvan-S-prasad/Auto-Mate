function getEnv(key: string, fallback?: string) {
  const value = process.env[key] || fallback;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const SUMMARY_MODEL = getEnv("SUMMARY_MODEL");
export const EMBEDDING_MODEL = getEnv("EMBEDDING_MODEL");
export const AGENT_MODEL = getEnv("AGENT_MODEL");
export const RESEARCH_MODEL = getEnv("RESEARCH_MODEL");
export const REPORT_MODEL = getEnv("REPORT_MODEL");
export const TRIAGE_MODEL = getEnv("TRIAGE_MODEL");
export const CHAT_MODEL = getEnv("CHAT_MODEL");
