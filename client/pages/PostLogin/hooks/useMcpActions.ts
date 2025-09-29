import { matchQuery, formatMCPResponse } from "@/lib/query-matcher";
import { mcpClient } from "@/lib/mcp-client";

export interface McpResult {
  enhancedPrompt: string;
  mcpResults: string;
}

export function useMcpActions() {
  const run = async (text: string): Promise<McpResult> => {
    const cleanedText = text.trim();
    const queryMatch = matchQuery(cleanedText);

    if (!queryMatch.isMatch || queryMatch.mcpActions.length === 0) {
      return {
        enhancedPrompt: cleanedText,
        mcpResults: "",
      };
    }

    try {
      const mcpPromises = queryMatch.mcpActions.map(async (action) => {
        try {
          const response = await mcpClient.executeAction(action);
          const responseText =
            ("content" in response
              ? response.content?.[0]?.text
              : response.contents?.[0]?.text) || "No data returned";
          return formatMCPResponse(action, responseText);
        } catch (err) {
          return `Failed to execute ${action.description}: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
      });

      const mcpResultsArray = await Promise.all(mcpPromises);
      const mcpResults = mcpResultsArray.join("\n\n");

      const enhancedPrompt = queryMatch.enhancedPrompt
        ? `${queryMatch.enhancedPrompt}\n\nRetrieved Data:\n${mcpResults}`
        : `${cleanedText}\n\nRetrieved Data:\n${mcpResults}`;

      return {
        enhancedPrompt,
        mcpResults,
      };
    } catch (err) {
      const mcpResults = `Failed to retrieve data: ${err instanceof Error ? err.message : "Unknown error"}`;
      return {
        enhancedPrompt: cleanedText,
        mcpResults,
      };
    }
  };

  return { run };
}
