# Quick Database Fix Script
# Run this to add missing columns to production database

Write-Host "🔧 Database Migration Fix Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will guide you to fix the missing database columns" -ForegroundColor Yellow
Write-Host ""

# SQL to run
$sql = @"
-- Add missing meta fields to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
"@

Write-Host "📋 SQL to execute on your production database:" -ForegroundColor Green
Write-Host ""
Write-Host $sql -ForegroundColor White
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "How to apply this fix:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Copy the SQL above (it's also in your clipboard now)" -ForegroundColor White
Write-Host "2. Go to Neon console: https://console.neon.tech" -ForegroundColor White
Write-Host "3. Open SQL Editor for your database" -ForegroundColor White
Write-Host "4. Paste and run the SQL" -ForegroundColor White
Write-Host "5. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "6. Refresh your dashboard - error should be gone! ✅" -ForegroundColor White
Write-Host ""

# Copy to clipboard
$sql | Set-Clipboard
Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Open browser to Neon console
$openBrowser = Read-Host "Open Neon console in browser? (y/n)"
if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
    Start-Process "https://console.neon.tech"
    Write-Host "🌐 Opening Neon console..." -ForegroundColor Green
}

Write-Host ""
Write-Host "After applying the fix, test here:" -ForegroundColor Yellow
Write-Host "https://manis-core-dashboard.vercel.app/categories" -ForegroundColor Cyan
Write-Host ""
