Param(
  [string]$ApiBase = "http://localhost:3001/api"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Healthz {
  param()
  $base = ($ApiBase -replace '/api$','')
  $url = "$base/api/healthz"
  $json = Invoke-RestMethod -Method Get -Uri $url -ErrorAction Stop
  return $json
}

function Get-McpTools {
  param()
  $url = "$ApiBase/mcp/tools"
  return (Invoke-RestMethod -Method Get -Uri $url -ErrorAction Stop)
}

function Invoke-McpTool {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][hashtable]$Arguments
  )
  $url = "$ApiBase/mcp/tool"
  $payload = @{ name = $Name; arguments = $Arguments }
  $json = $payload | ConvertTo-Json -Depth 10
  return (Invoke-RestMethod -Method Post -Uri $url -Body $json -ContentType 'application/json' -ErrorAction Stop)
}

function Read-McpResource {
  param(
    [Parameter(Mandatory=$true)][string]$Uri
  )
  $url = "$ApiBase/mcp/resource"
  $payload = @{ uri = $Uri }
  $json = $payload | ConvertTo-Json -Depth 5
  return (Invoke-RestMethod -Method Post -Uri $url -Body $json -ContentType 'application/json' -ErrorAction Stop)
}

# Note: When dot-sourced, functions become available to caller.
