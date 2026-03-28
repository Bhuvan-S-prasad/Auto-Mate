export interface AgentSession {
  userId: string;

  // message history
  scratchpad: { role: string; content: unknown }[];

  // approval flow
  pendingAction?: {
    type: string;
    payload: Record<string, unknown>;
    summary: string;
  };

  // chat history
  context: string[];
}

const store = new Map<string, AgentSession>();

export const getSession = (userId: string): AgentSession => {
  if (!store.has(userId)) {
    store.set(userId, {
      userId,
      scratchpad: [],
      context: [],
    });
  }
  return store.get(userId)!;
};

export const setSession = (userId: string, session: AgentSession) => {
  store.set(userId, session);
};

export const clearPending = (userId: string) => {
  const s = getSession(userId);
  delete s.pendingAction;
  setSession(userId, s);
};
