#!/usr/bin/env node

/**
 * Test script for Third Lane implementation
 * Tests the sequential AI processing architecture
 */

import axios from "axios";

const BASE_URL = "http://localhost:8080";

async function testThirdLane() {
  console.log("🧪 Testing Third Lane Implementation\n");

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing Third Lane health check...");
    const healthResponse = await axios.get(`${BASE_URL}/third-lane/health`);
    console.log("✅ Health check passed:", healthResponse.data);

    // Test 2: Simple query processing
    console.log("\n2️⃣ Testing simple query processing...");
    const simpleQuery = "What is SCRUM-8?";
    const simpleResponse = await axios.post(`${BASE_URL}/third-lane/query`, {
      query: simpleQuery,
    });
    console.log("✅ Simple query response:", {
      mode: simpleResponse.data.mode,
      hasAnalysis: !!simpleResponse.data.analysis,
      hasRawData: !!simpleResponse.data.rawData,
      responseLength: simpleResponse.data.response.length,
    });

    // Test 3: Chat integration
    console.log("\n3️⃣ Testing chat integration...");
    const chatResponse = await axios.post(
      `${BASE_URL}/chat/third-lane/simple`,
      {
        query: "Tell me about project management",
      },
    );
    console.log("✅ Chat integration response:", {
      mode: chatResponse.data.mode,
      responseLength: chatResponse.data.response.length,
    });

    // Test 4: JIRA ticket query
    console.log("\n4️⃣ Testing JIRA ticket query...");
    const jiraQuery = "Show me details for SCRUM-8";
    const jiraResponse = await axios.post(
      `${BASE_URL}/chat/third-lane/simple`,
      {
        query: jiraQuery,
      },
    );
    console.log("✅ JIRA query response:", {
      mode: jiraResponse.data.mode,
      hasAnalysis: !!jiraResponse.data.analysis,
      responseLength: jiraResponse.data.response.length,
    });

    console.log("\n🎉 All Third Lane tests passed!");
  } catch (error) {
    console.error(
      "\n❌ Third Lane test failed:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 404) {
      console.log("\n💡 Make sure the server is running with: pnpm dev");
    } else if (error.response?.status === 500) {
      console.log(
        "\n💡 Check that the llama-3.1-8b-tool:latest model is running in Ollama",
      );
    }
  }
}

// Run the test
testThirdLane().catch(console.error);
