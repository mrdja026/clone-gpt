Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Allow overriding API base via env API_PORT
$port = $env:API_PORT
if (-not $port) { $port = 3001 }
$apiBase = "http://localhost:$port/api"

. "$PSScriptRoot/mcp.ps1" -ApiBase $apiBase | Out-Null

Write-Host "=== Healthz ==="
$health = Get-Healthz
$summary = [pscustomobject]@{
  port = $health.port
  host = $health.host
  effectiveBaseUrl = $health.effectiveBaseUrl
  fixtures = $health.env.MCP_USE_FIXTURES
  proxyPort = $health.ollamaProxy.port
}
$summary | ConvertTo-Json -Depth 5 | Write-Output

Write-Host "`n=== MCP Tools ==="
$tools = Get-McpTools
$tools | ConvertTo-Json -Depth 10 | Write-Output

Write-Host "`n=== Test 1: SCRUM-8 (fixtures ON) ==="
$resp1 = Invoke-McpTool -Name 'fetch_jira_ticket' -Arguments @{ ticketKey = 'SCRUM-8' }
$payload1 = if ($resp1.PSObject.Properties.Name -contains 'result') { $resp1.result } else { $resp1 }
if (-not ($payload1.PSObject.Properties.Name -contains 'content')) {
  Write-Warning "Unexpected response shape for SCRUM-8:"
  $resp1 | ConvertTo-Json -Depth 10 | Write-Output
  throw "Missing 'content' in response"
}
$text1 = ($payload1.content | Select-Object -First 1).text
try {
  $json1 = $text1 | ConvertFrom-Json
  $out1 = [pscustomobject]@{
    key = $json1.key
    summary = $json1.summary
    status = $json1.status
    assignee = $json1.assignee
    priority = $json1.priority
  }
  Write-Host "SCRUM-8 result:"; $out1 | ConvertTo-Json -Depth 5 | Write-Output
} catch {
  Write-Warning "SCRUM-8 text was not JSON: $text1"
}

Write-Host "`n=== Test 2: ABC-123 (error path) ==="
try {
  $resp2 = Invoke-McpTool -Name 'fetch_jira_ticket' -Arguments @{ ticketKey = 'ABC-123' }
  $payload2 = if ($resp2.PSObject.Properties.Name -contains 'result') { $resp2.result } else { $resp2 }
  if (-not ($payload2.PSObject.Properties.Name -contains 'content')) {
    Write-Warning "Unexpected response shape for ABC-123:"
    $resp2 | ConvertTo-Json -Depth 10 | Write-Output
    throw "Missing 'content' in response"
  }
  $text2 = ($payload2.content | Select-Object -First 1).text
  Write-Host "ABC-123 raw text:"; $text2 | Write-Output
  try {
    $json2 = $text2 | ConvertFrom-Json
    if ($json2.error -or $resp2.isError) {
      Write-Host "ABC-123 parsed error:"; $json2 | ConvertTo-Json -Depth 5 | Write-Output
    }
  } catch {}
} catch {
  $resp = $_.Exception.Response
  if ($resp -and $resp.GetResponseStream) {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "ABC-123 HTTP error body:"; $body | Write-Output
  } else {
    Write-Warning "ABC-123 request failed: $($_.Exception.Message)"
  }
}

Write-Host "`nDone."
