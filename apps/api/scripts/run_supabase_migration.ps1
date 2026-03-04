Param()

# Creates logs and runs Supabase CLI `db query` then falls back to `psql`.
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logDir = Join-Path $PSScriptRoot '..\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir "supabase-migrate-$timestamp.log"

"Starting Supabase migration: $(Get-Date)" | Tee-Object -FilePath $logFile

# Path to migration SQL
$sqlFile = Join-Path $PSScriptRoot '..\supabase\migration_supabase.sql'
if (-not (Test-Path $sqlFile)) {
  "Migration file not found: $sqlFile" | Tee-Object -FilePath $logFile
  exit 2
}

"Using DATABASE_URL: $env:DATABASE_URL" | Tee-Object -FilePath $logFile -Append

try {
  "Running: supabase db query --file $sqlFile" | Tee-Object -FilePath $logFile -Append
  supabase db query --file $sqlFile 2>&1 | Tee-Object -FilePath $logFile -Append
  $code = $LASTEXITCODE
  "supabase exit code: $code" | Tee-Object -FilePath $logFile -Append
} catch {
  "Supabase CLI run failed: $_" | Tee-Object -FilePath $logFile -Append
}

"Attempting psql fallback" | Tee-Object -FilePath $logFile -Append
try {
  psql "$env:DATABASE_URL" -f $sqlFile 2>&1 | Tee-Object -FilePath $logFile -Append
  $pcode = $LASTEXITCODE
  "psql exit code: $pcode" | Tee-Object -FilePath $logFile -Append
} catch {
  "psql run failed: $_" | Tee-Object -FilePath $logFile -Append
}

"Migration finished: $(Get-Date)" | Tee-Object -FilePath $logFile -Append

Write-Output "Logs written to: $logFile"
