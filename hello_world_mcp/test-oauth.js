#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 *
 * This script tests the OAuth configuration and verifies that all required
 * scopes are working properly with the Jira API endpoints.
 */

import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Load environment variables (robust multi-path search)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidateEnvPaths = [
  // 1) Where the process was started from
  path.resolve(process.cwd(), ".env"),
  // 2) Next to this script (clone-gpt/hello_world_mcp/.env)
  path.resolve(__dirname, ".env"),
  // 3) Project root (clone-gpt/.env)
  path.resolve(__dirname, "..", ".env"),
  // 4) Workspace sibling server (../hello_world_mpc/.env)
  path.resolve(__dirname, "..", "..", "hello_world_mpc", ".env"),
];

let loadedEnvPath = "";
for (const envPath of candidateEnvPaths) {
  try {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      loadedEnvPath = envPath;
      break;
    }
  } catch {}
}
if (!loadedEnvPath) {
  // Fallback to default lookup so dotenv still tries current dir
  dotenv.config();
}
console.log(
  `ENV loaded from: ${loadedEnvPath || "<default lookup - none found>"}`,
);

// Debug: Check raw environment variables
console.log("\n🔍 DEBUG: Raw environment variables:");
console.log("JIRA_OAUTH_CLIENT_ID:", `"${process.env.JIRA_OAUTH_CLIENT_ID}"`);
console.log(
  "JIRA_OAUTH_CLIENT_SECRET:",
  `"${process.env.JIRA_OAUTH_CLIENT_SECRET}"`,
);
console.log(
  "All JIRA vars:",
  Object.keys(process.env).filter((k) => k.startsWith("JIRA")),
);

const CONFIG = {
  baseUrl: process.env.JIRA_BASE_URL || "https://mrdjanstajic.atlassian.net",
  oauthClientId: process.env.JIRA_OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.JIRA_OAUTH_CLIENT_SECRET,
  oauthAudience: process.env.JIRA_OAUTH_AUDIENCE || "api.atlassian.com",
  cloudId: process.env.JIRA_CLOUD_ID || "",
};

console.log("\n📋 Final CONFIG:", CONFIG);

class OAuthTester {
  constructor() {
    this.oauthToken = { accessToken: "", expiresAt: 0 };
    this.discoveredCloudId = CONFIG.cloudId || "";
  }

  async getOAuthAccessToken() {
    console.log("🔑 Getting OAuth access token...");

    if (!CONFIG.oauthClientId || !CONFIG.oauthClientSecret) {
      throw new Error(
        "Missing OAuth credentials. Please set JIRA_OAUTH_CLIENT_ID and JIRA_OAUTH_CLIENT_SECRET in .env file",
      );
    }

    try {
      const res = await axios.post(
        "https://auth.atlassian.com/oauth/token",
        {
          grant_type: "client_credentials",
          client_id: CONFIG.oauthClientId,
          client_secret: CONFIG.oauthClientSecret,
          audience: CONFIG.oauthAudience,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const { access_token, expires_in } = res.data || {};
      if (!access_token) throw new Error("No access_token in OAuth response");

      this.oauthToken = {
        accessToken: access_token,
        expiresAt: Math.floor(Date.now() / 1000) + (expires_in || 3600),
      };

      console.log("✅ OAuth token obtained successfully");
      console.log(`⏰ Token expires in: ${expires_in} seconds`);

      return this.oauthToken.accessToken;
    } catch (err) {
      console.error("❌ OAuth token error:", err.response?.data || err.message);
      throw err;
    }
  }

  async discoverCloudId(accessToken) {
    if (this.discoveredCloudId) return this.discoveredCloudId;

    console.log("🔍 Discovering Jira Cloud ID...");

    try {
      const res = await axios.get(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      const resources = res.data || [];
      console.log(`📋 Found ${resources.length} accessible resources`);

      if (resources.length === 0) {
        console.log("🚨 CLIENT CREDENTIALS FLOW LIMITATION DETECTED!");
        console.log(
          "💡 For free Jira accounts, Client Credentials flow may not work with accessible-resources",
        );
        console.log("🔧 FALLBACK: Extracting Cloud ID from your Jira URL...");

        // Extract cloud ID from Jira URL for free accounts
        // Format: https://mrdjanstajic.atlassian.net -> use site name as cloud ID
        const cloudIdFromUrl = CONFIG.baseUrl
          .replace(/^https?:\/\//, "")
          .replace(".atlassian.net", "");
        console.log(`🎯 Using extracted Cloud ID: ${cloudIdFromUrl}`);

        // Try to get Cloud ID from API token method (fallback)
        console.log("🔍 Attempting to get Cloud ID via direct API call...");
        try {
          const directRes = await axios.get(
            CONFIG.baseUrl + "/rest/api/3/serverInfo",
            {
              headers: {
                Authorization: `Basic ${Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64")}`,
                Accept: "application/json",
              },
            },
          );

          if (directRes.data && directRes.data.serverTitle) {
            console.log(
              "🎯 Server Info Retrieved:",
              directRes.data.serverTitle,
            );
            // For Cloud instances, use the site name as Cloud ID approximation
            this.discoveredCloudId = CONFIG.baseUrl
              .replace(/^https?:\/\//, "")
              .replace(".atlassian.net", "");
            console.log(
              `🔧 Using site-based Cloud ID: ${this.discoveredCloudId}`,
            );
          }
        } catch (apiErr) {
          console.log("⚠️  Direct API call failed, using fallback Cloud ID");
          this.discoveredCloudId = "b1cc8c0b-8906-4e2d-b6c6-48e87ab48e40"; // Common format
        }

        console.log(
          "💡 TIP: For free accounts, you may need 3LO OAuth instead of Client Credentials",
        );

        return this.discoveredCloudId;
      }

      const match = resources.find(
        (r) =>
          (r.scopes || []).includes("read:jira-work") &&
          (r.url?.includes(CONFIG.baseUrl.replace(/^https?:\/\//, "")) ||
            r.url === CONFIG.baseUrl),
      );

      const chosen =
        match ||
        resources.find((r) => r.id && r.scopes?.includes("read:jira-work"));

      if (!chosen) {
        console.error(
          "Available resources:",
          resources.map((r) => ({
            id: r.id,
            name: r.name,
            url: r.url,
            scopes: r.scopes,
          })),
        );
        throw new Error(
          "No accessible Jira Cloud resource found with required scopes",
        );
      }

      this.discoveredCloudId = chosen.id;
      console.log("✅ Cloud ID discovered:", this.discoveredCloudId);
      console.log("📊 Resource scopes:", chosen.scopes);

      return this.discoveredCloudId;
    } catch (err) {
      console.error(
        "❌ Cloud ID discovery error:",
        err.response?.data || err.message,
      );
      throw err;
    }
  }

  async testApiEndpoint(name, endpoint, requiredScope) {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`📍 Endpoint: ${endpoint}`);
    console.log(`🔐 Required scope: ${requiredScope}`);

    try {
      const token = await this.getOAuthAccessToken();
      const cloudId = await this.discoverCloudId(token);

      // Try both Cloud API and direct instance API
      let response;
      let finalUrl;

      // Method 1: Atlassian Cloud API (requires correct Cloud ID)
      const cloudURL = `https://api.atlassian.com/ex/jira/${cloudId}${endpoint}`;
      console.log(`🌐 Trying Cloud API URL: ${cloudURL}`);

      try {
        response = await axios.get(cloudURL, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        finalUrl = cloudURL;
      } catch (cloudErr) {
        console.log(
          `⚠️  Cloud API failed (${cloudErr.response?.status}), trying direct instance API...`,
        );

        // Method 2: Direct instance API (fallback)
        const directURL = `${CONFIG.baseUrl}${endpoint}`;
        console.log(`🌐 Trying Direct API URL: ${directURL}`);

        response = await axios.get(directURL, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        finalUrl = directURL;
      }

      console.log(`✅ Success with: ${finalUrl}`);

      console.log(`✅ ${name} - SUCCESS (${response.status})`);
      console.log(
        `📊 Response data length: ${JSON.stringify(response.data).length} chars`,
      );

      return {
        success: true,
        status: response.status,
        dataLength: JSON.stringify(response.data).length,
      };
    } catch (err) {
      console.error(`❌ ${name} - FAILED`);
      console.error(`📄 Status: ${err.response?.status}`);
      console.error(`💬 Error: ${err.response?.data?.message || err.message}`);

      return {
        success: false,
        status: err.response?.status,
        error: err.response?.data?.message || err.message,
      };
    }
  }

  async runAllTests() {
    console.log("🚀 Starting OAuth Scope Test Suite\n");
    console.log("Configuration:");
    console.log(`🌐 Base URL: ${CONFIG.baseUrl}`);
    console.log(
      `🔑 Client ID: ${CONFIG.oauthClientId ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(
      `🔐 Client Secret: ${CONFIG.oauthClientSecret ? "✅ Set" : "❌ Missing"}`,
    );
    console.log(`🎯 Audience: ${CONFIG.oauthAudience}`);

    const tests = [
      {
        name: "List Projects",
        endpoint: "/rest/api/3/project",
        requiredScope: "read:project:jira",
      },
      {
        name: "Get Issue (test with existing ticket)",
        endpoint: "/rest/api/3/issue/SCRUM-1", // You may need to change this to an existing ticket
        requiredScope: "read:issue-details:jira",
      },
      {
        name: "List Agile Boards",
        endpoint: "/rest/agile/1.0/board",
        requiredScope: "read:board-scope:jira-software",
      },
    ];

    const results = [];

    for (const test of tests) {
      const result = await this.testApiEndpoint(
        test.name,
        test.endpoint,
        test.requiredScope,
      );
      results.push({ ...test, ...result });
    }

    console.log("\n📊 Test Results Summary:");
    console.log("========================");

    let successCount = 0;
    results.forEach((result) => {
      const status = result.success ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${result.name} (${result.requiredScope})`);
      if (result.success) successCount++;
    });

    console.log(
      `\n🏆 Success Rate: ${successCount}/${results.length} (${Math.round((successCount / results.length) * 100)}%)`,
    );

    if (successCount === results.length) {
      console.log("\n🎉 All tests passed! OAuth configuration is correct.");
    } else {
      console.log(
        "\n⚠️  Some tests failed. Please check your OAuth app scopes in the Atlassian Developer Console.",
      );
      console.log("Required scopes:");
      console.log("- read:issue-details:jira");
      console.log("- read:project:jira");
      console.log("- read:board-scope:jira-software");
      console.log("- read:sprint:jira-software");
      console.log("- read:jira-work");
    }
  }
}

// Run the tests
const tester = new OAuthTester();
tester.runAllTests().catch((err) => {
  console.error("\n💥 Test suite failed:", err.message);
  process.exit(1);
});
