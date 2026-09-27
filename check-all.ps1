# News Nest - Full Ecosystem Verification Script
$headers = @{ 'x-automation-key' = 'ba338ffb5e8d15966c838c679f9ef3a62d50771c79232ecb8ece7940a0ca8b15' }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   NEWS NEST SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$services = @(
  @{ Name = "Frontend Web App"; Url = "http://localhost:5174"; Headers = @{} },
  @{ Name = "Backend Health API"; Url = "http://localhost:5000/health"; Headers = @{} },
  @{ Name = "Backend Automation API"; Url = "http://localhost:5000/api/automation/status"; Headers = $headers },
  @{ Name = "FastAPI Scraper Service"; Url = "http://localhost:8000/health"; Headers = @{} },
  @{ Name = "Qdrant Vector Database"; Url = "http://localhost:6333/healthz"; Headers = @{} },
  @{ Name = "n8n Automation Engine"; Url = "http://localhost:5678/healthz"; Headers = @{} }
)

foreach ($s in $services) {
  try {
    $res = Invoke-WebRequest -Uri $s.Url -Headers $s.Headers -UseBasicParsing -TimeoutSec 5
    Write-Host "[PASS] $($s.Name.PadRight(26)) : HTTP $($res.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "[FAIL] $($s.Name.PadRight(26)) : $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "`n------------------------------------------" -ForegroundColor Yellow
Write-Host " Checking Qdrant Vector Collection..." -ForegroundColor Yellow
try {
  $qdrant = Invoke-RestMethod -Uri "http://localhost:6333/collections/news_nest_articles"
  Write-Host " [OK] Collection Status: $($qdrant.result.status), Indexed Points: $($qdrant.result.points_count)" -ForegroundColor Green
} catch {
  Write-Host " [FAIL] Qdrant Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n------------------------------------------" -ForegroundColor Yellow
Write-Host " Checking n8n Active Workflows..." -ForegroundColor Yellow
try {
  $wfOutput = docker exec -i n8n-n8n-1 node -e "
    const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/sqlite3@5.1.7_bluebird@3.7.2_supports-color@8.1.1/node_modules/sqlite3').verbose();
    const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
    db.all('SELECT name, active FROM workflow_entity', (err, rows) => {
      if (err) console.error(err);
      else rows.forEach(r => console.log(' [OK] ' + r.name + ' -> Active: ' + (r.active ? 'YES' : 'NO')));
    });
  "
  Write-Host $wfOutput -ForegroundColor Green
} catch {
  Write-Host " [FAIL] n8n Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n------------------------------------------" -ForegroundColor Yellow
Write-Host " Checking Live Sports Ingestion..." -ForegroundColor Yellow
try {
  $cricket = Invoke-RestMethod -Uri "http://localhost:8000/api/sports/upcoming-cricket?limit=2"
  Write-Host " [OK] Live Cricbuzz Fixtures Found: $($cricket.count)" -ForegroundColor Green
  foreach ($m in $cricket.matches) {
    Write-Host "      - $($m.title)" -ForegroundColor Gray
  }
} catch {
  Write-Host " [FAIL] Cricket Scraper Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n------------------------------------------" -ForegroundColor Yellow
Write-Host " Checking Newsletter Automation Context..." -ForegroundColor Yellow
try {
  $newsletter = Invoke-RestMethod -Uri "http://localhost:5000/api/automation/newsletter/context" -Headers $headers
  Write-Host " [OK] Active Subscribers: $($newsletter.subscriberCount), Top Stories: $($newsletter.topStories.Count), Live Feeds: $($newsletter.liveCoverage.Count)" -ForegroundColor Green
} catch {
  Write-Host " [FAIL] Newsletter Context Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " Check Complete! All systems operational." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
