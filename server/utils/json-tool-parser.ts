/**
 * JSON Tool Parser for OSS Models
 * Handles structured JSON output parsing for tool calls without OpenAI function calling
 */

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ParsedResponse {
  isToolCall: boolean;
  toolCalls: ToolCall[];
  textResponse?: string;
}

/**
 * Extracts JSON tool calls from LLM response
 * Supports both direct JSON and markdown code blocks
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
    // Not valid JSON, treat as regular text response
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
 * Generates system prompt for JSON tool calling
 */
export function createToolCallSystemPrompt(availableTools: string[]): string {
  const toolList = availableTools.map((tool) => `- ${tool}`).join("\n");

  return `You are a helpful assistant. When the user request matches available tools, respond ONLY with a JSON object like:

{"tool_calls": [{"name": "<tool_name>", "arguments": {...}}]}

Available tools:
${toolList}

For tool calls:
- Use exact tool names from the list above
- Provide arguments as a JSON object
- Multiple tools can be called in one response
- Respond with ONLY the JSON object, no additional text

For any other requests, respond normally with helpful text.`;
}
