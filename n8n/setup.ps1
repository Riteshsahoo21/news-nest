param(
  [Parameter(Mandatory = $true)]
  [string]$GeminiApiKey,
  [switch]$StartContainers,
  [switch]$ImportWorkflows
)

$ErrorActionPreference = 'Stop'
$automationRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $automationRoot
$automationEnvPath = Join-Path $automationRoot '.env'
$backendEnvPath = Join-Path $projectRoot 'news-nests-backend\.env'

function New-SecureHex([int]$byteCount) {
  $bytes = New-Object byte[] $byteCount
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  }
  finally {
    $generator.Dispose()
  }
  return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}

function Set-EnvValue([string]$path, [string]$name, [string]$value) {
  $lines = [System.Collections.Generic.List[string]]::new()
  if (Test-Path -LiteralPath $path) {
    foreach ($existingLine in Get-Content -LiteralPath $path) {
      $lines.Add($existingLine)
    }
  }
  $prefix = "$name="
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index].StartsWith($prefix, [System.StringComparison]::Ordinal)) {
      $lines[$index] = "$prefix$value"
      $updated = $true
      break
    }
  }
  if (-not $updated) { $lines.Add("$prefix$value") }
  Set-Content -LiteralPath $path -Value $lines -Encoding utf8
}

function Get-EnvValue([string]$path, [string]$name) {
  if (-not (Test-Path -LiteralPath $path)) { return '' }
  $prefix = "$name="
  $line = Get-Content -LiteralPath $path | Where-Object { $_.StartsWith($prefix, [System.StringComparison]::Ordinal) } | Select-Object -First 1
  if (-not $line) { return '' }
  return $line.Substring($prefix.Length)
}

$automationKey = Get-EnvValue -path $automationEnvPath -name 'N8N_AUTOMATION_KEY'
$encryptionKey = Get-EnvValue -path $automationEnvPath -name 'N8N_ENCRYPTION_KEY'
if ($automationKey.Length -lt 48) { $automationKey = New-SecureHex 32 }
if ($encryptionKey.Length -lt 48) { $encryptionKey = New-SecureHex 32 }

$envLines = @(
  'N8N_VERSION=latest',
  "N8N_ENCRYPTION_KEY=$encryptionKey",
  "N8N_AUTOMATION_KEY=$automationKey",
  "GEMINI_API_KEY=$GeminiApiKey",
  'GEMINI_EMBEDDING_MODEL=gemini-embedding-2',
  'GEMINI_TEXT_MODEL=gemini-3.8-flash',
  'NEWS_NEST_API_URL=http://host.docker.internal:5000',
  'NEWS_NEST_SCRAPER_URL=http://host.docker.internal:8000',
  'NEWS_NEST_PUBLIC_URL=http://localhost:5174',
  'QDRANT_URL=http://qdrant:6333',
  'QDRANT_COLLECTION=news_nest_articles',
  'QDRANT_API_KEY='
)
Set-Content -LiteralPath $automationEnvPath -Value $envLines -Encoding utf8

Set-EnvValue -path $backendEnvPath -name 'N8N_AUTOMATION_KEY' -value $automationKey
Set-EnvValue -path $backendEnvPath -name 'N8N_ARTICLE_WEBHOOK_URL' -value 'http://127.0.0.1:5678/webhook/article-approved'

Write-Host 'Created n8n/.env and configured the backend automation key.'

if ($StartContainers) {
  docker compose --env-file $automationEnvPath -f (Join-Path $automationRoot 'docker-compose.yml') up -d
  Write-Host 'Started n8n and Qdrant. Open http://localhost:5678 to create the n8n owner account.'
}

if ($ImportWorkflows) {
  docker compose --env-file $automationEnvPath -f (Join-Path $automationRoot 'docker-compose.yml') exec -T n8n n8n import:workflow --separate --input=/workflows
  Write-Host 'Imported the three News Nest workflows. Review a manual execution, then publish each workflow.'
}
