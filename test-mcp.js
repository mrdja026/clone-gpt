#!/usr/bin/env node

/**
 * Test script for MCP integration
 * 
 * This script verifies:
 * 1. MCP server can be started
 * 2. Environment variables are properly passed
 * 3. API endpoints can be successfully called
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Set debug mode for verbose output
const DEBUG = true;

// Load environment variables
dotenv.config();

// Define the API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// API endpoints to test
const ENDPOINTS = {
  PING: `${API_BASE_URL}/ping`,
  MCP_TOOLS: `${API_BASE_URL}/mcp/tools`,
  MCP_RESOURCES: `${API_BASE_URL}/mcp/resources`,
};

// Path to the start script
const START_SCRIPT = path.join(__dirname, 'start-with-mcp.mjs');

let serverProcess;

async function main() {
  try {
    console.log('Starting MCP integration test...');
    
    // Start the server
    await startServer();
    
    // Wait for server to be ready
    await waitForServerReady();
    
    // Test API endpoints
    await testAPIEndpoints();
    
    // Success!
    console.log('✅ MCP integration test completed successfully!');
  } catch (error) {
    console.error('❌ MCP integration test failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up
    if (serverProcess) {
      console.log('Shutting down server...');
      serverProcess.kill();
    }
  }
}

/**
 * Starts the server using the start-with-mcp.mjs script
 */
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting server with:', START_SCRIPT);
    
    serverProcess = spawn('node', [START_SCRIPT], { 
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutBuffer += output;
      
      if (DEBUG) {
        console.log(`[SERVER STDOUT] ${output.trim()}`);
      }
      
      // Check for specific output indicating server is ready
      if (output.includes('Services started') || 
          output.includes('MCP_SERVER_READY') ||
          output.includes('started at')) {
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrBuffer += output;
      
      if (DEBUG) {
        console.error(`[SERVER STDERR] ${output.trim()}`);
      }
      
      // Check for MCP configuration in stderr
      if (output.includes('MCP_CONFIG_LOADED')) {
        console.log('Detected MCP configuration output');
        
        // Check if API token was loaded
        if (output.includes('hasToken: true')) {
          console.log('✅ MCP server detected API token');
        } else {
          console.warn('⚠️ MCP server did not detect API token');
        }
      }
    });
    
    serverProcess.on('error', (error) => {
      reject(new Error(`Failed to start server: ${error.message}`));
    });
    
    serverProcess.on('close', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
    
    // Give the server some time to start up
    setTimeout(() => {
      if (stdoutBuffer.includes('error') || stderrBuffer.includes('error')) {
        reject(new Error('Server reported errors during startup'));
      }
    }, 2000);
  });
}

/**
 * Wait for the server to be ready by polling the ping endpoint
 */
async function waitForServerReady() {
  console.log('Waiting for server to be ready...');
  
  let attempts = 0;
  const maxAttempts = 30;
  const delay = 1000;
  
  while (attempts < maxAttempts) {
    try {
      await axios.get(ENDPOINTS.PING);
      console.log('✅ Server is ready!');
      return;
    } catch (error) {
      attempts++;
      if (DEBUG) {
        console.log(`Attempt ${attempts}/${maxAttempts} - Server not ready yet...`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Server failed to become ready within timeout period');
}

/**
 * Test various API endpoints to verify MCP integration
 */
async function testAPIEndpoints() {
  // Test ping endpoint
  console.log('Testing ping endpoint...');
  const pingResult = await axios.get(ENDPOINTS.PING);
  if (pingResult.status !== 200 || !pingResult.data) {
    throw new Error('Ping endpoint failed');
  }
  console.log('✅ Ping endpoint: OK');
  
  // Test MCP tools endpoint
  console.log('Testing MCP tools endpoint...');
  const toolsResult = await axios.get(ENDPOINTS.MCP_TOOLS);
  if (toolsResult.status !== 200 || !toolsResult.data) {
    throw new Error('MCP tools endpoint failed');
  }
  
  const tools = toolsResult.data.tools || [];
  console.log(`✅ MCP tools endpoint: Found ${tools.length} tools`);
  console.log('Available tools:', tools.map(t => t.name).join(', '));
  
  // Test MCP resources endpoint
  console.log('Testing MCP resources endpoint...');
  const resourcesResult = await axios.get(ENDPOINTS.MCP_RESOURCES);
  if (resourcesResult.status !== 200 || !resourcesResult.data) {
    throw new Error('MCP resources endpoint failed');
  }
  
  const resources = resourcesResult.data.resources || [];
  console.log(`✅ MCP resources endpoint: Found ${resources.length} resources`);
  console.log('Available resources:', resources.map(r => r.name).join(', '));
  
  // Check if we have the expected JIRA tools and resources
  const hasJiraTicketTool = tools.some(t => t.name === 'fetch_jira_ticket');
  const hasJiraProjectsList = resources.some(r => r.name === 'jira_projects_list');
  const hasCurrentSprintSummary = resources.some(r => r.name === 'current_sprint_summary');
  
  if (hasJiraTicketTool) {
    console.log('✅ JIRA ticket tool is available');
  } else {
    console.warn('⚠️ JIRA ticket tool is NOT available');
  }
  
  if (hasJiraProjectsList) {
    console.log('✅ JIRA projects resource is available');
  } else {
    console.warn('⚠️ JIRA projects resource is NOT available');
  }
  
  if (hasCurrentSprintSummary) {
    console.log('✅ Current sprint summary resource is available');
  } else {
    console.warn('⚠️ Current sprint summary resource is NOT available');
  }
}

// Run the main function
main();
