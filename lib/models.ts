function getEnv(key: string, fallback?: string) {
  const value = process.env[key] || fallback;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const SUMMARY_MODEL = getEnv("SUMMARY_MODEL", "google/gemini-2.0-flash-lite-001");
export const EMBEDDING_MODEL = getEnv("EMBEDDING_MODEL", "text-embedding-3-small");
export const AGENT_MODEL = getEnv("AGENT_MODEL", "google/gemini-2.0-flash-lite-001");
export const RESEARCH_MODEL = getEnv("RESEARCH_MODEL", "google/gemini-2.0-flash-001");
export const REPORT_MODEL = getEnv("REPORT_MODEL", "google/gemini-2.0-flash-001");
export const TRIAGE_MODEL = getEnv("TRIAGE_MODEL", "google/gemini-2.0-flash-lite-001");
export const CHAT_MODEL = getEnv("CHAT_MODEL", "google/gemini-2.0-flash-lite-001");
