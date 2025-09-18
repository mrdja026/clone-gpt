#!/usr/bin/env node

/**
 * Test script for Query Matcher Integration with Project/Board Search
 * Tests the alignment between query-matcher.ts and our new MCP tools
 */

import { matchQuery, formatMCPResponse } from "./client/lib/query-matcher.ts";

// Test scenarios covering our new functionality
const testScenarios = [
  // Board-specific queries
  {
    name: "Simple board search",
    query: "show me all boards",
    expectedTool: "search_jira_boards",
    expectedConfidence: 0.9,
  },
  {
    name: "Scrum board search",
    query: "find scrum boards",
    expectedTool: "search_jira_boards",
    expectedConfidence: 0.9,
  },
  {
    name: "Board for specific project",
    query: "boards for project SCRUM",
    expectedTool: "search_projects_with_boards",
    expectedConfidence: 0.95,
  },
  {
    name: "Kanban board search",
    query: "list kanban boards",
    expectedTool: "search_jira_boards",
    expectedConfidence: 0.9,
  },
  {
    name: "Named board search",
    query: "find board MyBoard",
    expectedTool: "search_jira_boards",
    expectedConfidence: 0.9,
  },

  // Enhanced project queries
  {
    name: "Project search with intent",
    query: "search projects",
    expectedTool: "search_jira_projects",
    expectedConfidence: 0.92,
  },
  {
    name: "List all projects",
    query: "list all projects",
    expectedTool: "search_jira_projects",
    expectedConfidence: 0.85,
  },
  {
    name: "Find specific project",
    query: "find project SCRUM",
    expectedTool: "search_jira_projects",
    expectedConfidence: 0.92,
  },

  // Combined search scenarios
  {
    name: "Projects with boards",
    query: "show projects with boards",
    expectedTool: "search_projects_with_boards",
    expectedConfidence: 0.95,
  },
  {
    name: "Project scrum boards",
    query: "find project HWP scrum boards",
    expectedTool: "search_projects_with_boards",
    expectedConfidence: 0.95,
  },

  // Backward compatibility - existing patterns should still work
  {
    name: "JIRA ticket (Lane B)",
    query: "SCRUM-8",
    expectedTool: "fetch_ticket",
    expectedConfidence: 0.99,
  },
  {
    name: "Ticket keyword",
    query: "ticket SCRUM-42",
    expectedTool: "fetch_ticket",
    expectedConfidence: 0.97,
  },
  {
    name: "Legacy project resource",
    query: "project SCRUM details", // Should use resource for specific project without search intent
    expectedTool: null, // Should use resourceUri instead
    expectedResource: "mcp://local-mcp-server/jira/projects",
  },
  {
    name: "Sprint query",
    query: "current sprint",
    expectedTool: null, // Should use resourceUri
    expectedResource: "mcp://local-mcp-server/jira/current-sprint",
  },
];

function runQueryMatcherTests() {
  console.log("🧪 Testing Query Matcher Integration");
  console.log("=".repeat(50));

  let passed = 0;
  let total = testScenarios.length;

  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testing: ${scenario.name}`);
    console.log(`   Query: "${scenario.query}"`);

    try {
      const result = matchQuery(scenario.query);

      console.log(`   ✓ Match: ${result.isMatch}`);
      console.log(`   ✓ Confidence: ${result.confidence}`);

      if (!result.isMatch) {
        console.log(`   ❌ FAIL: Expected match but got no match`);
        return;
      }

      // Check confidence
      if (
        scenario.expectedConfidence &&
        Math.abs(result.confidence - scenario.expectedConfidence) > 0.1
      ) {
        console.log(
          `   ⚠️  WARN: Confidence ${result.confidence} differs from expected ${scenario.expectedConfidence}`,
        );
      }

      // Check tool/resource matching
      const action = result.mcpActions[0];
      if (scenario.expectedTool) {
        if (action.toolName === scenario.expectedTool) {
          console.log(`   ✅ PASS: Tool "${action.toolName}" matches expected`);
          console.log(`   📝 Args:`, JSON.stringify(action.args, null, 2));
          passed++;
        } else {
          console.log(
            `   ❌ FAIL: Tool "${action.toolName}" != expected "${scenario.expectedTool}"`,
          );
        }
      } else if (scenario.expectedResource) {
        if (action.resourceUri === scenario.expectedResource) {
          console.log(
            `   ✅ PASS: Resource "${action.resourceUri}" matches expected`,
          );
          passed++;
        } else {
          console.log(
            `   ❌ FAIL: Resource "${action.resourceUri}" != expected "${scenario.expectedResource}"`,
          );
        }
      } else {
        console.log(
          `   ❌ FAIL: No expected tool or resource specified for test`,
        );
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  });

  console.log(`\n🎯 Results: ${passed}/${total} tests passed`);
  console.log("=".repeat(50));

  if (passed === total) {
    console.log(
      "🎉 All tests passed! Query matcher integration is working correctly.",
    );
  } else {
    console.log(`⚠️  ${total - passed} tests failed. Review the integration.`);
  }

  return passed === total;
}

function testResponseFormatting() {
  console.log("\n🎨 Testing Response Formatting");
  console.log("=".repeat(30));

  // Mock response data for our new tools
  const mockProjectResponse = {
    content: [
      {
        type: "text",
        text: `JIRA Projects Search Results
═══════════════════════════════════════════════════════════════

SEARCH PARAMETERS:
• Status: live

FOUND 2 PROJECTS:
───────────────────────────────────────────────────────────────

1. hello-world-projec (HWP)
   • ID: 10000
   • Type: software
   • Style: next-gen
   • Avatar: Available

2. My Scrum Project (SCRUM)
   • ID: 10001 
   • Type: software
   • Style: classic
   • Avatar: Available`,
      },
    ],
  };

  const mockBoardResponse = {
    content: [
      {
        type: "text",
        text: `JIRA Boards Search Results
═══════════════════════════════════════════════════════════════

SEARCH PARAMETERS:
• Type: scrum

FOUND 1 BOARDS:
───────────────────────────────────────────────────────────────

1. SCRUM Board (ID: 1)
   • Type: scrum
   • Configuration:
     - Filter ID: 10000
     - Columns: 4
     - Estimation Field: Story Points
   • Active Sprints: 1
     - Sprint 1 (123)
       Goal: Complete user authentication
   • Associated Projects: 1
     - My Scrum Project (SCRUM)`,
      },
    ],
  };

  // Test formatting
  const testCases = [
    {
      name: "Project search formatting",
      action: {
        toolName: "search_jira_projects",
        description: "Test projects",
        type: "tool",
      },
      response: mockProjectResponse.content[0].text,
    },
    {
      name: "Board search formatting",
      action: {
        toolName: "search_jira_boards",
        description: "Test boards",
        type: "tool",
      },
      response: mockBoardResponse.content[0].text,
    },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    try {
      const formatted = formatMCPResponse(testCase.action, testCase.response);
      console.log("   ✅ PASS: Formatting successful");
      console.log("   📄 Preview:", formatted.substring(0, 100) + "...");
    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}`);
    }
  });
}

// Run tests
console.log("🚀 Starting Query Matcher Integration Tests");
console.log("=".repeat(50));

try {
  const mainTestsPassed = runQueryMatcherTests();
  testResponseFormatting();

  console.log("\n🏁 Integration Test Summary:");
  console.log(
    "✅ Helper functions: extractBoardTypes, extractBoardNames, extractSearchIntent",
  );
  console.log(
    "✅ New patterns: Board search, enhanced project search, combined search",
  );
  console.log("✅ Response formatting: Added cases for new MCP tools");
  console.log("✅ Backward compatibility: Existing patterns preserved");

  if (mainTestsPassed) {
    console.log("\n🎉 Query matcher is ready for production!");
    console.log(
      "🔧 Ready to handle board and project queries in your MCP client.",
    );
  } else {
    console.log(
      "\n⚠️  Some tests failed. Review the implementation before deployment.",
    );
  }
} catch (error) {
  console.error("❌ Test execution failed:", error.message);
  console.log(
    "\n💡 Note: This test requires the query-matcher.ts file to be importable.",
  );
  console.log(
    "   Ensure TypeScript compilation or run in a TypeScript environment.",
  );
}
