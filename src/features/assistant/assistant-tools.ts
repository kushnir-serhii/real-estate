import "server-only";

import type { LlmToolCall, LlmToolDefinition } from "@/lib/llm";

import type { AssistantEvent } from "./assistant-events";
import { PROPOSE_LEAD_TOOL, proposeLeadDefinition, runProposeLead } from "./propose-lead-tool";
import { runSearchProperties, searchPropertiesDefinition, SEARCH_PROPERTIES_TOOL } from "./search-properties-tool";

/** Tools offered to the model. */
export const ASSISTANT_TOOLS: LlmToolDefinition[] = [searchPropertiesDefinition, proposeLeadDefinition];

export type ToolRun = { content: string; event?: AssistantEvent };

/** What a tool may need to know about the turn it runs in. */
export type ToolContext = { conversationId: string };

/** Runs one model tool call. Only known tools run; anything else gets an error result. Never throws. */
export const runAssistantTool = async (call: LlmToolCall, context: ToolContext): Promise<ToolRun> => {
  switch (call.name) {
    case SEARCH_PROPERTIES_TOOL:
      return runSearchProperties(call.arguments);
    case PROPOSE_LEAD_TOOL:
      return runProposeLead(call.arguments, context.conversationId);
    default:
      return { content: JSON.stringify({ error: "unknown_tool", hint: `There is no tool "${call.name}".` }) };
  }
};
