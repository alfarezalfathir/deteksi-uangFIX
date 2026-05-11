# ========================================
# DEPLOY SCRIPT - VaultScan
# Jalankan dari root folder: .\deploy.ps1
# ========================================

Write-Host "🔨 Building React frontend..." -ForegroundColor Cyan

# Build React
Set-Location frontend
npm run build
Set-Location ..

Write-Host "📦 Copying build to backend..." -ForegroundColor Cyan

# Copy build ke backend
Copy-Item -Path "frontend\build" -Destination "backend\build" -Recurse -Force

Write-Host "✅ Done! Sekarang restart server.js manual ya." -ForegroundColor Green
Write-Host "   → Ctrl+C dulu, lalu jalankan: node server.js" -ForegroundColor Yellow
