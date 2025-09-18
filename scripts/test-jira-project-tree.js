#!/usr/bin/env node

/**
 * Test script for the new JIRA project tree functionality
 * This script tests the implementation of FINAL_BOSS.MD functionality
 */

import dotenv from "dotenv";
import axios from "axios";

// Load environment variables
dotenv.config();

const JIRA_CONFIG = {
  baseUrl: process.env.JIRA_BASE_URL || "https://username.atlassian.net",
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,
};

const SERVER_CONFIG = {
  baseUrl: process.env.SERVER_BASE_URL || "http://localhost:3001",
};

async function testDirectJiraProjectTree(projectKey) {
  console.log("\n🌳 Testing Direct JIRA Project Tree...");
  console.log("═══════════════════════════════════════");

  try {
    const response = await axios.get(
      `${SERVER_CONFIG.baseUrl}/api/jira/project-tree/${projectKey}?pageSize=50`,
    );

    const projectTree = response.data;
    console.log(`✅ Successfully fetched project tree for ${projectKey}`);
    console.log(`📊 Stats:`);
    console.log(`   • Epics: ${projectTree.stats.epics}`);
    console.log(`   • Children: ${projectTree.stats.children}`);
    console.log(`   • Subtasks: ${projectTree.stats.subtasks}`);
    console.log(`   • Levels: ${projectTree.levels}`);

    if (projectTree.epics.length > 0) {
      const firstEpic = projectTree.epics[0];
      console.log(`\n📋 First Epic Details:`);
      console.log(`   • Key: ${firstEpic.key}`);
      console.log(`   • Summary: ${firstEpic.summary}`);
      console.log(`   • Status: ${firstEpic.status}`);
      console.log(`   • Children: ${firstEpic.children.length}`);

      if (firstEpic.children.length > 0) {
        const firstChild = firstEpic.children[0];
        console.log(`\n📝 First Child Issue:`);
        console.log(`   • Key: ${firstChild.key}`);
        console.log(`   • Summary: ${firstChild.summary}`);
        console.log(`   • Status: ${firstChild.status}`);
        console.log(`   • Story Points: ${firstChild.storyPoints || "None"}`);
        console.log(`   • Assignee: ${firstChild.assignee || "Unassigned"}`);
        console.log(`   • Subtasks: ${firstChild.subtasks?.length || 0}`);

        if (firstChild.subtasks && firstChild.subtasks.length > 0) {
          const firstSubtask = firstChild.subtasks[0];
          console.log(`\n📌 First Subtask:`);
          console.log(`   • Key: ${firstSubtask.key}`);
          console.log(`   • Summary: ${firstSubtask.summary}`);
          console.log(`   • Status: ${firstSubtask.status}`);
          console.log(
            `   • Assignee: ${firstSubtask.assignee || "Unassigned"}`,
          );
        }
      }
    }

    return projectTree;
  } catch (error) {
    console.error(
      "❌ Direct project tree test failed:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function testMcpProjectTree(projectKey) {
  console.log("\n🔌 Testing MCP Project Tree Integration...");
  console.log("═══════════════════════════════════════");

  try {
    const response = await axios.post(
      `${SERVER_CONFIG.baseUrl}/api/mcp/jira-project-tree`,
      {
        projectKeyOrId: projectKey,
        pageSize: 50,
      },
    );

    const projectTree = response.data;
    console.log(
      `✅ Successfully fetched project tree via MCP for ${projectKey}`,
    );
    console.log(`📊 MCP Stats:`);
    console.log(`   • Epics: ${projectTree.stats.epics}`);
    console.log(`   • Children: ${projectTree.stats.children}`);
    console.log(`   • Subtasks: ${projectTree.stats.subtasks}`);

    return projectTree;
  } catch (error) {
    console.error(
      "❌ MCP project tree test failed:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function testProjectTreePost(projectKey) {
  console.log("\n📮 Testing POST Project Tree Endpoint...");
  console.log("═══════════════════════════════════════");

  try {
    const response = await axios.post(
      `${SERVER_CONFIG.baseUrl}/api/jira/project-tree`,
      {
        projectKeyOrId: projectKey,
        pageSize: 25,
      },
    );

    const projectTree = response.data;
    console.log(
      `✅ Successfully fetched project tree via POST for ${projectKey}`,
    );
    console.log(`📊 POST Stats:`);
    console.log(`   • Epics: ${projectTree.stats.epics}`);
    console.log(`   • Children: ${projectTree.stats.children}`);
    console.log(`   • Subtasks: ${projectTree.stats.subtasks}`);

    return projectTree;
  } catch (error) {
    console.error(
      "❌ POST project tree test failed:",
      error.response?.data || error.message,
    );
    return null;
  }
}

async function testServerHealth() {
  console.log("\n🏥 Testing Server Health...");
  console.log("═══════════════════════════════════════");

  try {
    const response = await axios.get(`${SERVER_CONFIG.baseUrl}/api/healthz`);
    console.log("✅ Server is healthy");
    console.log(`📡 Server response:`, response.data);
    return true;
  } catch (error) {
    console.error("❌ Server health check failed:", error.message);
    return false;
  }
}

async function discoverProjects() {
  console.log("\n🔍 Discovering Available Projects...");
  console.log("═══════════════════════════════════════");

  // This is a simple approach - in a real scenario you might want to
  // implement a project discovery endpoint
  const commonProjectKeys = ["WEB", "PROJ", "TEST", "DEV", "SCRUM"];

  for (const key of commonProjectKeys) {
    try {
      const response = await axios.get(
        `${SERVER_CONFIG.baseUrl}/api/jira/project-tree/${key}?pageSize=1`,
      );
      console.log(`✅ Found project: ${key}`);
      return key;
    } catch (error) {
      console.log(`❌ Project ${key} not found or accessible`);
    }
  }

  console.log("⚠️  No common project keys found. Using 'WEB' as default.");
  return "WEB";
}

async function runAllTests() {
  console.log("🚀 Starting JIRA Project Tree Integration Tests");
  console.log("===============================================");

  // Check configuration
  if (!JIRA_CONFIG.email || !JIRA_CONFIG.apiToken) {
    console.log("⚠️  Warning: JIRA credentials not configured");
    console.log("   Set JIRA_EMAIL and JIRA_API_TOKEN in .env file");
    console.log("   Testing server health only...\n");

    await testServerHealth();
    return;
  }

  console.log(`🔗 JIRA Instance: ${JIRA_CONFIG.baseUrl}`);
  console.log(`👤 Email: ${JIRA_CONFIG.email}`);
  console.log(`🖥️  Server: ${SERVER_CONFIG.baseUrl}`);

  // Test server health first
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log("❌ Server is not healthy. Aborting tests.");
    return;
  }

  // Discover a project to test with
  const projectKey = await discoverProjects();

  // Test all endpoints
  const directResult = await testDirectJiraProjectTree(projectKey);
  const mcpResult = await testMcpProjectTree(projectKey);
  const postResult = await testProjectTreePost(projectKey);

  console.log("\n🎉 All tests completed!");
  console.log("===============================================");

  if (directResult) {
    console.log("✅ Direct JIRA project tree endpoint working");
  }
  if (mcpResult) {
    console.log("✅ MCP project tree integration working");
  }
  if (postResult) {
    console.log("✅ POST project tree endpoint working");
  }

  console.log("\n📋 Available Endpoints:");
  console.log(`   • GET  /api/jira/project-tree/:projectKeyOrId`);
  console.log(`   • POST /api/jira/project-tree`);
  console.log(`   • POST /api/mcp/jira-project-tree`);

  console.log("\n🔧 Ready for use in applications!");
  console.log("   This implements the FINAL_BOSS.MD 3-level tree:");
  console.log("   Project → Epics → Issues (Story/Task/Bug) → Subtasks");
}

// Run tests
runAllTests().catch(console.error);
