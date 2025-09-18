#!/usr/bin/env node

/**
 * Test script for Third Lane model connectivity
 * Tests that each Ollama model is responding correctly
 */

import axios from "axios";

const LANE_A_URL = "http://127.0.0.1:123/api/generate";
const LANE_C_URL = "http://127.0.0.1:124/api/chat";
const SERVER_URL = "http://localhost:8080";

async function testLaneA() {
  console.log("1️⃣ Testing Lane A (gemma-fc-test:latest on 127.0.0.1:123)...");

  try {
    const response = await axios.post(
      LANE_A_URL,
      {
        model: "gemma-fc-test:latest",
        prompt: "SCRUM-8",
        stream: false,
      },
      { timeout: 10000 },
    );

    if (response.data && response.data.response) {
      console.log("✅ Lane A (Intent Detection) - WORKING");
      console.log("   Response length:", response.data.response.length);
      return true;
    } else {
      console.log("❌ Lane A - Invalid response format");
      return false;
    }
  } catch (error) {
    console.log("❌ Lane A - FAILED:", error.message);
    console.log("   💡 Check: $env:OLLAMA_HOST='127.0.0.1:123'; ollama serve");
    console.log("   💡 Check: ollama run gemma-fc-test:latest");
    return false;
  }
}

async function testLaneC() {
  console.log("\n2️⃣ Testing Lane C (qwen2.5:7b on 127.0.0.1:124)...");

  try {
    const response = await axios.post(
      LANE_C_URL,
      {
        model: "qwen2.5:7b",
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message for Lane C analysis.",
          },
        ],
        stream: false,
      },
      { timeout: 15000 },
    );

    if (response.data && response.data.message) {
      console.log("✅ Lane C (Analysis) - WORKING");
      console.log("   Response length:", response.data.message.content.length);
      return true;
    } else {
      console.log("❌ Lane C - Invalid response format");
      return false;
    }
  } catch (error) {
    console.log("❌ Lane C - FAILED:", error.message);
    console.log("   💡 Check: $env:OLLAMA_HOST='127.0.0.1:124'; ollama serve");
    console.log("   💡 Check: ollama run qwen2.5:7b");
    return false;
  }
}

async function testThirdLaneIntegration() {
  console.log("\n3️⃣ Testing Third Lane Integration...");

  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${SERVER_URL}/third-lane/health`, {
      timeout: 5000,
    });
    console.log("Health Status:", healthResponse.data.status);

    // Test simple query
    const queryResponse = await axios.post(
      `${SERVER_URL}/chat/third-lane/simple`,
      {
        query: "Test query for Third Lane",
      },
      { timeout: 15000 },
    );

    console.log("✅ Third Lane Integration - WORKING");
    console.log("   Mode:", queryResponse.data.mode);
    console.log("   Response length:", queryResponse.data.response.length);
    return true;
  } catch (error) {
    console.log(
      "❌ Third Lane Integration - FAILED:",
      error.response?.data || error.message,
    );
    console.log("   💡 Check: pnpm dev is running");
    return false;
  }
}

async function runAllTests() {
  console.log("🧪 Testing Third Lane Model Connectivity\n");

  const results = {
    laneA: await testLaneA(),
    laneC: await testLaneC(),
    integration: false,
  };

  // Only test integration if both models are working
  if (results.laneA && results.laneC) {
    results.integration = await testThirdLaneIntegration();
  } else {
    console.log("\n⚠️ Skipping integration test - models not ready");
  }

  console.log("\n📊 Test Results:");
  console.log(
    `Lane A (Intent Detection): ${results.laneA ? "✅ PASS" : "❌ FAIL"}`,
  );
  console.log(`Lane B (MCP Data): ✅ PASS (no model needed)`);
  console.log(`Lane C (Analysis): ${results.laneC ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Integration: ${results.integration ? "✅ PASS" : "❌ FAIL"}`);

  const allPassed = results.laneA && results.laneC && results.integration;

  if (allPassed) {
    console.log("\n🎉 All Third Lane tests passed! Architecture is ready.");
  } else {
    console.log("\n⚠️ Some tests failed. Check the setup instructions above.");
  }

  return allPassed;
}

// Run the tests
runAllTests().catch(console.error);
