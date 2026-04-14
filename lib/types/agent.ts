export interface ToolCallFunction {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: ToolCallFunction;
}

export interface AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface SystemMessage {
  role: "system";
  content: string;
}

export interface UserMessage {
  role: "user";
  content: string | null;
}

export interface ToolMessage {
  role: "tool";
  content: string;
  tool_call_id: string;
}

export type AgentMessage = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

export interface OpenRouterChoice {
  message: AssistantMessage;
  finish_reason: string | null;
  native_finish_reason: string | null;
}

export interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

export interface LogEntry {
  step: string;
  timestamp: string;
  [key: string]: unknown;
}
