# rebuild.ps1
# Rebuild ecommerce-operation-assistant images and restart all services.
# Source code is NOT volume-mounted, so every code change must be rebuilt into an image to take effect.
# Run from project root:  D:\ruanjian\ecommerce-operation-assistant
# Usage (PowerShell):     .\rebuild.ps1
$ErrorActionPreference = "Stop"

function Build-WithRetry {
    param(
        [string]$Service,
        [int]$MaxTries = 6
    )
    for ($i = 1; $i -le $MaxTries; $i++) {
        Write-Host "[$Service] build attempt $i/$MaxTries ..." -ForegroundColor Cyan
        docker compose build $Service
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[$Service] build OK" -ForegroundColor Green
            return $true
        }
        Write-Host "[$Service] build failed (exit $LASTEXITCODE); retrying in 6s (uv base image pull often hits TLS timeout) ..." -ForegroundColor Yellow
        Start-Sleep -Seconds 6
    }
    return $false
}

Write-Host "==> STEP 1/3: build api + worker (two independent images, both pull ghcr.io uv base image)" -ForegroundColor White
$okApi = Build-WithRetry -Service api
$okWorker = Build-WithRetry -Service worker

Write-Host "==> STEP 2/3: build web (settings page provider alignment)" -ForegroundColor White
$okWeb = Build-WithRetry -Service web

Write-Host "==> STEP 3/3: bring up all services" -ForegroundColor White
docker compose up -d
docker compose ps

if ($okApi -and $okWorker -and $okWeb) {
    Write-Host "DONE: all images rebuilt. Pending code changes (settings provider, competitor-monitor beat, course-stage removal) are now LIVE." -ForegroundColor Green
} else {
    Write-Host "WARN: some builds failed after retries. Check Docker Desktop status / network, then re-run .\rebuild.ps1" -ForegroundColor Red
}
