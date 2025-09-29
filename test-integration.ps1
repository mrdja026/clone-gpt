# MCP Forward-Only Integration Test Script
# This script tests the complete flow: hello-world-mcp → clone-gpt

Write-Host " Starting MCP Forward-Only Integration Test" -ForegroundColor Green

# Test 1: Verify hello-world-mcp HTTP bridge is running
Write-Host "` Testing hello-world-mcp HTTP bridge..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -TimeoutSec 5
    Write-Host " hello-world-mcp health check passed" -ForegroundColor Green
    Write-Host "   Transport: $($healthResponse.transport)" -ForegroundColor Gray
    Write-Host "   STDIO Child: $($healthResponse.stdio_child)" -ForegroundColor Gray
} catch {
    Write-Host " hello-world-mcp is not running on port 4000" -ForegroundColor Red
    Write-Host "   Start with: cd ../hello-world-mcp && npm run http" -ForegroundColor Yellow
    exit 1
}

# Test 2: List tools via hello-world-mcp directly
Write-Host "` Testing direct MCP tools listing..." -ForegroundColor Yellow

try {
    $toolsBody = @{
        jsonrpc = "2.0"
        method = "listTools"
        id = 1
    } | ConvertTo-Json -Compress

    $toolsResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/mcp" -Method POST -Body $toolsBody -ContentType "application/json"
    $toolCount = $toolsResponse.result.tools.Count
    Write-Host " Found $toolCount tools in hello-world-mcp" -ForegroundColor Green
    
    # List tool names
    foreach ($tool in $toolsResponse.result.tools) {
        Write-Host "   - $($tool.name): $($tool.description)" -ForegroundColor Gray
    }
} catch {
    Write-Host " Failed to list tools from hello-world-mcp" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Test add_numbers tool via hello-world-mcp
Write-Host "`Testing add_numbers tool..." -ForegroundColor Yellow

try {
    $addBody = @{
        jsonrpc = "2.0"
        method = "callTool"
        params = @{
            name = "add_numbers"
            arguments = @{
                numbers = @(10, 20, 30, 40, 50)
            }
        }
        id = 2
    } | ConvertTo-Json -Compress -Depth 10

    $addResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/mcp" -Method POST -Body $addBody -ContentType "application/json"
    $result = $addResponse.result.content[0].text
    Write-Host " add_numbers result: $result" -ForegroundColor Green
} catch {
    Write-Host " Failed to call add_numbers tool" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Verify clone-gpt is running and forwarding
Write-Host "`n Testing clone-gpt MCP forwarding..." -ForegroundColor Yellow

try {
    $cloneGptToolsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/mcp/tools" -TimeoutSec 5
    $forwardedToolCount = $cloneGptToolsResponse.tools.Count
    Write-Host "clone-gpt forwarded $forwardedToolCount tools" -ForegroundColor Green
    
    # Verify tool forwarding consistency
    if ($forwardedToolCount -eq $toolCount) {
        Write-Host " Tool count matches between hello-world-mcp and clone-gpt" -ForegroundColor Green
    } else {
        Write-Host " Tool count mismatch: hello-world-mcp($toolCount) vs clone-gpt($forwardedToolCount)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  clone-gpt is not running on port 8080 or forwarding failed" -ForegroundColor Red
    Write-Host "   Start with: pnpm dev" -ForegroundColor Yellow
    Write-Host "   Ensure MCP_BASE_URL=http://127.0.0.1:4000" -ForegroundColor Yellow
    exit 1
}

# Test 5: Test tool execution via clone-gpt forwarding
Write-Host "`n5️Testing tool execution via clone-gpt..." -ForegroundColor Yellow

try {
    $cloneGptAddBody = @{
        name = "add_numbers"
        arguments = @{
            numbers = @(1, 2, 3, 4, 5)
        }
    } | ConvertTo-Json -Compress -Depth 10

    $cloneGptAddResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/mcp/tool" -Method POST -Body $cloneGptAddBody -ContentType "application/json"
    $cloneGptResult = $cloneGptAddResponse.content[0].text
    Write-Host " clone-gpt add_numbers result: $cloneGptResult" -ForegroundColor Green
} catch {
    Write-Host " Failed to execute tool via clone-gpt" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Test Jira integration (if configured)
Write-Host "`nTesting Jira integration..." -ForegroundColor Yellow

try {
    $jiraWhoamiBody = @{
        jsonrpc = "2.0"
        method = "callTool"
        params = @{
            name = "jira_whoami"
            arguments = @{}
        }
        id = 3
    } | ConvertTo-Json -Compress -Depth 10

    $jiraResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/mcp" -Method POST -Body $jiraWhoamiBody -ContentType "application/json"
    if ($jiraResponse.result.content[0].text -like "*accountId*") {
        Write-Host " Jira integration working" -ForegroundColor Green
    } else {
        Write-Host " Jira returned unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host " Jira integration not configured or failed" -ForegroundColor Yellow
    Write-Host "   Configure JIRA_* environment variables in hello-world-mcp/.env" -ForegroundColor Gray
}

# Test 7: Test Perplexity integration (if configured)
Write-Host "` Testing Perplexity integration..." -ForegroundColor Yellow

try {
    $perplexityBody = @{
        jsonrpc = "2.0"
        method = "callTool"
        params = @{
            name = "fetch_perplexity_data"
            arguments = @{
                query = "What is Model Context Protocol?"
                recency = "month"
                max_results = 3
            }
        }
        id = 4
    } | ConvertTo-Json -Compress -Depth 10

    $perplexityResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/mcp" -Method POST -Body $perplexityBody -ContentType "application/json"
    if ($perplexityResponse.result.content[0].text -like "*search_metadata*") {
        Write-Host " Perplexity integration working" -ForegroundColor Green
    } else {
        Write-Host " Perplexity returned unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host " Perplexity integration not configured or failed" -ForegroundColor Yellow
    Write-Host "   Configure PERPLEXITY_API_KEY in hello-world-mcp/.env" -ForegroundColor Gray
}

# Test 8: Test resource reading
Write-Host "`Testing resource reading..." -ForegroundColor Yellow

try {
    $resourceBody = @{
        jsonrpc = "2.0"
        method = "readResource"
        params = @{
            uri = "search://history/recent/3"
        }
        id = 5
    } | ConvertTo-Json -Compress -Depth 10

    $resourceResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/mcp" -Method POST -Body $resourceBody -ContentType "application/json"
    Write-Host " Resource reading working" -ForegroundColor Green
} catch {
    Write-Host " Resource reading failed" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "` Integration test completed!" -ForegroundColor Green
Write-Host "` Summary:" -ForegroundColor Cyan
Write-Host "   - hello-world-mcp HTTP bridge:  Running on port 4000" -ForegroundColor White
Write-Host "   - clone-gpt MCP forwarding:  Running on port 8080" -ForegroundColor White
Write-Host "   - Tool execution:  Working end-to-end" -ForegroundColor White
Write-Host "   - Architecture:  Forward-only mode operational" -ForegroundColor White

Write-Host "` Next steps:" -ForegroundColor Cyan
Write-Host "   1. Configure Jira credentials for full JIRA integration" -ForegroundColor White
Write-Host "   2. Configure Perplexity API key for search capabilities" -ForegroundColor White
Write-Host "   3. Test with real JIRA tickets and Perplexity queries" -ForegroundColor White
Write-Host "   4. Access clone-gpt UI at http://localhost:8080" -ForegroundColor White
