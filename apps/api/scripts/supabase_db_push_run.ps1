#!/usr/bin/env pwsh
# Safe runner for `supabase db push` that loads env from .env if present
param()

function Load-DotEnv($path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $line = $_ -replace "`r", ""
    if ($line -and ($line -notmatch '^\s*#')) {
      $parts = $line -split '=',2
      if ($parts.Length -eq 2) {
        $k = $parts[0].Trim()
        $v = $parts[1]
        if ($k -and -not [string]::IsNullOrEmpty($v)) {
          if (-not (Get-ChildItem env: | Where-Object { $_.Name -eq $k })) {
            Set-Item -Path env:$k -Value $v
          }
        }
      }
    }
  }
}

Load-DotEnv (Join-Path $PSScriptRoot '..\.env')

# Derive project ref from SUPABASE_URL if not explicitly set
if (-not $env:SUPABASE_PROJECT_REF -or $env:SUPABASE_PROJECT_REF -eq '') {
  try {
    if ($env:SUPABASE_URL) {
      $u = [uri]$env:SUPABASE_URL
      # host is like twsoill...supabase.co -> project ref is left-most label
      $hostParts = $u.Host -split '\\.'
      if ($hostParts.Length -gt 0) { $env:SUPABASE_PROJECT_REF = $hostParts[0] }
    }
  } catch {
    # ignore
  }
}

# If SUPABASE_ACCESS_TOKEN missing, try SUPABASE_SERVICE_KEY
if (-not $env:SUPABASE_ACCESS_TOKEN -or $env:SUPABASE_ACCESS_TOKEN -eq '') {
  if ($env:SUPABASE_SERVICE_KEY) { $env:SUPABASE_ACCESS_TOKEN = $env:SUPABASE_SERVICE_KEY }
}

if (-not $env:SUPABASE_PROJECT_REF) {
  Write-Error "SUPABASE_PROJECT_REF is not set and could not be derived from SUPABASE_URL"
  exit 2
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI not found on PATH. Install it before running this script."
  exit 3
}

if (-not (Test-Path (Join-Path $PSScriptRoot '..\logs'))) { New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot '..\logs') | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $PSScriptRoot "..\logs\supabase-db-push-$ts.log"

Write-Output "Running: supabase db push --project-ref $env:SUPABASE_PROJECT_REF --yes"
Write-Output "Log file: $log"

try {
  supabase db push --project-ref $env:SUPABASE_PROJECT_REF --yes 2>&1 | Tee-Object -FilePath $log
  $code = $LASTEXITCODE
  Write-Output "supabase db push exit code: $code"
  exit $code
} catch {
  Write-Output "supabase db push failed: $_"
  exit 4
}
