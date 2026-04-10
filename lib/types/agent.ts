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

export interface OpenRouterChoice {
  message: AssistantMessage;
  finish_reason: string;
}

export interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

export interface LogEntry {
  step: string;
  timestamp: string;
  [key: string]: unknown;
}
