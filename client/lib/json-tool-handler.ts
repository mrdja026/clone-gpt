/**
 * Client-side JSON Tool Handler
 * Handles parsing and execution of JSON tool calls from LLM responses
 */

interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface ParsedResponse {
  isToolCall: boolean;
  toolCalls: ToolCall[];
  textResponse?: string;
}

/**
 * Parse LLM response for JSON tool calls
 */
export function parseToolCallResponse(content: string): ParsedResponse {
  if (!content?.trim()) {
    return { isToolCall: false, toolCalls: [], textResponse: content };
  }

  // Try to extract JSON from markdown code blocks first
  const jsonBlockMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  let jsonString = jsonBlockMatch ? jsonBlockMatch[1] : content.trim();

  // Try direct JSON parsing
  try {
    const parsed = JSON.parse(jsonString);

    if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
      return {
        isToolCall: true,
        toolCalls: parsed.tool_calls.map((call: any) => ({
          name: call.name,
          arguments: call.arguments || {},
        })),
      };
    }
  } catch (error) {
    // Not valid JSON, continue to text parsing
  }

  // Fallback: try to find JSON-like structures
  const jsonMatch = content.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        return {
          isToolCall: true,
          toolCalls: parsed.tool_calls.map((call: any) => ({
            name: call.name,
            arguments: call.arguments || {},
          })),
        };
      }
    } catch (error) {
      // Still not valid, continue to text response
    }
  }

  return { isToolCall: false, toolCalls: [], textResponse: content };
}

/**
 * Convert tool calls to MCP actions for existing system
 */
export function convertToolCallsToMCPActions(toolCalls: ToolCall[]) {
  return toolCalls.map((call) => ({
    toolName: call.name,
    args: call.arguments,
    description: `Calling ${call.name}`,
    type: "tool" as const,
  }));
}
