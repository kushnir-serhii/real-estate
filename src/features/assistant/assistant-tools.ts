import "server-only";

import type { LlmToolCall, LlmToolDefinition } from "@/lib/llm";

import type { AssistantEvent } from "./assistant-events";
import { runSearchProperties, searchPropertiesDefinition, SEARCH_PROPERTIES_TOOL } from "./search-properties-tool";

/** Tools offered to the model. Slice 3 adds `propose_lead` here. */
export const ASSISTANT_TOOLS: LlmToolDefinition[] = [searchPropertiesDefinition];

export type ToolRun = { content: string; event?: AssistantEvent };

/** Runs one model tool call. Only known tools run; anything else gets an error result. Never throws. */
export const runAssistantTool = async (call: LlmToolCall): Promise<ToolRun> => {
  switch (call.name) {
    case SEARCH_PROPERTIES_TOOL:
      return runSearchProperties(call.arguments);
    default:
      return { content: JSON.stringify({ error: "unknown_tool", hint: `There is no tool "${call.name}".` }) };
  }
};
