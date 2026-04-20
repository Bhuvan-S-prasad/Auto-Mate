import { redis } from "@/lib/redis";
import type { AgentMessage } from "@/lib/types/agent";

export const MAX_SCRATCHPAD = 20;
const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours
const LOCK_TTL_SECONDS = 120; // realistic tail to prevent lock drops
const LOG_PREFIX = "[Session]";

export interface PendingAction {
  type: string;
  toolUseId: string;
  payload: Record<string, unknown>;
  summary: string;
}

export interface AgentSession {
  userId: string;
  scratchpad: AgentMessage[];
  pendingAction?: PendingAction;
  lastActiveAt: number;
  memoryContext?: {
    queryMsg: string;
    context: string;
    expiresAt: number;
  };
}

// ── Key helpers ──────────────────────────────────────────────────

function sessionKey(userId: string): string {
  return `session:${userId}`;
}

function lockKey(userId: string): string {
  return `lock:${userId}`;
}

// ── Core session operations ──────────────────────────────────────

function createSession(userId: string): AgentSession {
  return {
    userId,
    scratchpad: [],
    lastActiveAt: Date.now(),
  };
}

export async function getSession(
  userId: string,
): Promise<AgentSession | { error: "redis_unavailable" }> {
  try {
    const data = await redis.get<AgentSession>(sessionKey(userId));
    if (!data) {
      return createSession(userId);
    }
    return data;
  } catch (err) {
    console.error(`${LOG_PREFIX} getSession failed for ${userId}:`, err);
    return { error: "redis_unavailable" };
  }
}

export async function setSession(
  userId: string,
  session: AgentSession,
): Promise<void> {
  try {
    session.lastActiveAt = Date.now();
    await redis.set(sessionKey(userId), session, { ex: SESSION_TTL_SECONDS });
  } catch (err) {
    console.error(`${LOG_PREFIX} setSession failed for ${userId}:`, err);
    // Do not throw — a failed session write is recoverable
  }
}

export async function clearPendingAction(userId: string): Promise<void> {
  try {
    const session = await getSession(userId);
    if ("error" in session) return;
    delete session.pendingAction;
    await setSession(userId, session);
  } catch (err) {
    console.error(
      `${LOG_PREFIX} clearPendingAction failed for ${userId}:`,
      err,
    );
  }
}

export async function resetSession(userId: string): Promise<void> {
  try {
    await redis.del(sessionKey(userId));
  } catch (err) {
    console.error(`${LOG_PREFIX} resetSession failed for ${userId}:`, err);
  }
}

// ── Per-user lock ────────────────────────────────────────────────
//
// Uses Redis SET NX EX (set if not exists, with TTL) as a mutex.
// If the lock key exists, another invocation is already running.
// We wait with exponential backoff and retry up to MAX_RETRIES times.
// The LOCK_TTL_SECONDS ensures locks are released even if the function
// crashes before explicitly releasing.

const LOCK_MAX_RETRIES = 8;
const LOCK_RETRY_BASE_MS = 100;

export class LockAcquisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockAcquisitionError";
  }
}

export async function withUserLock<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = lockKey(userId);
  const token = crypto.randomUUID();
  let acquired = false;

  // Try to acquire lock with retries
  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    const result = await redis.set(key, token, {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });

    if (result === "OK") {
      acquired = true;
      break;
    }

    // Bounded exponential backoff with jitter
    const delay =
      Math.min(LOCK_RETRY_BASE_MS * Math.pow(2, attempt), 2000) +
      Math.random() * 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (!acquired) {
    throw new LockAcquisitionError(
      `Could not acquire lock for ${userId} after ${LOCK_MAX_RETRIES} retries.`,
    );
  }

  try {
    return await fn();
  } finally {
    // Safe compare-and-delete to avoid deleting another invocation's lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, [key], [token]).catch((err: unknown) => {
      console.error(
        `${LOG_PREFIX} Failed to release lock safely for ${userId}:`,
        err,
      );
    });
  }
}

// ── Scratchpad trimming ──────────────────────────────────────────
// Pure function — no Redis call. Operates on in-memory array.

export function trimScratchpad(scratchpad: AgentMessage[]): AgentMessage[] {
  if (scratchpad.length <= MAX_SCRATCHPAD) return scratchpad;
  // Always preserve index 0 (system prompt) + most recent messages
  return [scratchpad[0], ...scratchpad.slice(-(MAX_SCRATCHPAD - 1))];
}
