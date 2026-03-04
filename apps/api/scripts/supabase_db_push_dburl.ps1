#!/usr/bin/env pwsh
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

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set"
  exit 2
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI not found on PATH. Install it before running this script."
  exit 3
}

if (-not (Test-Path (Join-Path $PSScriptRoot '..\logs'))) { New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot '..\logs') | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $PSScriptRoot "..\logs\supabase-db-push-dburl-$ts.log"

Write-Output "Running: supabase db push --db-url <DATABASE_URL> --yes"
Write-Output "Log file: $log"

try {
  supabase db push --db-url "$env:DATABASE_URL" --yes 2>&1 | Tee-Object -FilePath $log
  $code = $LASTEXITCODE
  Write-Output "supabase db push exit code: $code"
  exit $code
} catch {
  Write-Output "supabase db push failed: $_"
  exit 4
}
