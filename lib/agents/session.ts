

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface PendingAction {
  type: string;
  toolUseId: string;
  payload: Record<string, unknown>;
  summary: string;
}

export interface AgentSession {
  userId: string;
  scratchpad: { role: string; content: unknown }[];
  pendingAction?: PendingAction;
  lastActiveAt: number;
}

const store = new Map<string, AgentSession>();

// Create session
function createSession(userId: string): AgentSession {
  return {
    userId,
    scratchpad: [],
    lastActiveAt: Date.now(),
  };
}

// Check if session is expired
function isExpired(session: AgentSession): boolean {
  return Date.now() - session.lastActiveAt > SESSION_TTL_MS;
}

export const getSession = (userId: string): AgentSession => {
  const existing = store.get(userId);

  if (!existing || isExpired(existing)) {
    const fresh = createSession(userId);
    store.set(userId, fresh);
    return fresh;
  }

  return existing;
};

// Save session
export const setSession = (userId: string, session: AgentSession): void => {
  session.lastActiveAt = Date.now();
  store.set(userId, session);
};

// Clear pending action
export const clearPendingAction = (userId: string): void => {
  const session = getSession(userId);
  delete session.pendingAction;
  store.set(userId, session);
};

// Reset session
export const resetSession = (userId: string): void => {
  store.delete(userId);
};
