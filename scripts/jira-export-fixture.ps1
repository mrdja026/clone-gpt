Param(
  [Parameter(Mandatory=$true)][string]$Key,
  [string]$OutDir = "server/fixtures/jira"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-EnvFromDotEnv {
  param([string]$Path = ".env")
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line) { return }
    if ($line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $k = $line.Substring(0,$idx).Trim()
    $v = $line.Substring($idx+1).Trim()
    # strip surrounding quotes if present
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
    if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Trim("'") }
    if (-not $env:$k) { $env:$k = $v }
  }
}

Ensure-EnvFromDotEnv

if (-not $env:JIRA_BASE_URL -or -not $env:JIRA_EMAIL -or -not $env:JIRA_API_TOKEN) {
  throw "Missing JIRA env. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN (or provide them in .env)."
}

$base = $env:JIRA_BASE_URL.TrimEnd('/')
$uri = "$base/rest/api/3/issue/$( [uri]::EscapeDataString($Key) )?fields=summary,status,assignee,priority,description"

$authBytes = [System.Text.Encoding]::UTF8.GetBytes("$($env:JIRA_EMAIL):$($env:JIRA_API_TOKEN)")
$auth = [Convert]::ToBase64String($authBytes)
$headers = @{ Authorization = "Basic $auth"; Accept = 'application/json' }

Write-Host "Fetching $uri ..."
$issue = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers -ErrorAction Stop

$fields = $issue.fields

function Get-DescriptionText($desc) {
  if ($null -eq $desc) { return "" }
  if ($desc -is [string]) { return $desc }
  # Try simple ADF (Atlassian Document Format) extraction
  try {
    $texts = @()
    if ($desc.content) {
      foreach ($b in $desc.content) {
        if ($b.content) {
          foreach ($n in $b.content) {
            if ($n.text) { $texts += $n.text }
          }
        }
      }
    }
    return ($texts -join " ").Trim()
  } catch { return "" }
}

$out = [pscustomobject]@{
  key = $issue.key
  summary = $fields.summary
  status = $fields.status.name
  assignee = if ($fields.assignee) { $fields.assignee.displayName } else { "" }
  priority = if ($fields.priority) { $fields.priority.name } else { "" }
  description = (Get-DescriptionText $fields.description)
  blockers = @()
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$outPath = Join-Path $OutDir "$Key.json"
$out | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 -FilePath $outPath
Write-Host "Wrote fixture: $outPath"

