param(
    [string]$Destination = "D:\Aayan-Dev\Horizon-Website"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Horizon Tweaks Website - Repo Extraction Tool  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Destination: $Destination" -ForegroundColor Yellow
Write-Host ""

# 1. Create destination directory
if (-not (Test-Path $Destination)) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Write-Host "[OK] Created destination folder" -ForegroundColor Green
} else {
    Write-Host "[!] Destination folder already exists. Files will be merged." -ForegroundColor Yellow
}

# 2. Copy SummitLogo.png into destination public folder first
$pubDir = Join-Path $Destination "public"
if (-not (Test-Path $pubDir)) {
    New-Item -ItemType Directory -Path $pubDir -Force | Out-Null
}

if (Test-Path "SummitLogo.png") {
    Copy-Item "SummitLogo.png" (Join-Path $pubDir "SummitLogo.png") -Force
    Write-Host "[OK] SummitLogo.png copied to public/" -ForegroundColor Green
} else {
    Write-Host "[!] SummitLogo.png not found at project root" -ForegroundColor Red
}

# 3. Copy all website files (excluding node_modules, .next)
Write-Host ""
Write-Host "Copying website files..." -ForegroundColor White
$exclude = @('node_modules', '.next', 'package-lock.json')
Get-ChildItem -Path "website" -Exclude $exclude | Copy-Item -Destination $Destination -Recurse -Force
Write-Host "[OK] Website files copied" -ForegroundColor Green

# 4. Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Extraction Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your new repo is ready at:" -ForegroundColor White
Write-Host "  $Destination" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. cd $Destination" -ForegroundColor Gray
Write-Host "  2. git init" -ForegroundColor Gray
Write-Host "  3. git add ." -ForegroundColor Gray
Write-Host "  4. git commit -m 'Initial commit - Horizon Tweaks Website'" -ForegroundColor Gray
Write-Host "  5. git remote add origin [your-repo-url]" -ForegroundColor Gray
Write-Host "  6. git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  7. copy .env.example .env.local (fill in secrets)" -ForegroundColor Gray
Write-Host "  8. npm install" -ForegroundColor Gray
Write-Host "  9. npm run build" -ForegroundColor Gray
Write-Host "  10. Deploy to Vercel!" -ForegroundColor Gray
pause
