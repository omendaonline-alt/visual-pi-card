<#
    Visual Pi Card — GitHub Deploy
    Domain: omendapipaysglobel.online
    Repo:   github.com/OMENDA/visual-pi-card

    USAGE:
      .\git-deploy.ps1                # Push latest to GitHub
      .\git-deploy.ps1 -Message "fix" # Commit with message then push
#>

param(
    [string]$Message = ""
)

$DOMAIN = "omendapipaysglobel.online"
$REPO = "github.com/chiefutility/visual-pi-card"

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host "  VISUAL PI CARD - GITHUB DEPLOY" -ForegroundColor Yellow
Write-Host "  $REPO" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host ""

# ===== STEP 1: Sync pi visual card.html =====
Write-Host "  [SYNC] index.html -> pi visual card.html" -ForegroundColor White
Copy-Item "index.html" "pi visual card.html" -Force

# ===== STEP 2: Stage & Commit =====
if ($Message -ne "") {
    Write-Host "  [GIT] Staging all changes..." -ForegroundColor Cyan
    git add -A
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [GIT] Nothing to commit (working tree clean)" -ForegroundColor Yellow
    } else {
        Write-Host "  [GIT] Committed: $Message" -ForegroundColor Green
    }
} else {
    # Auto-commit with timestamp if there are changes
    $status = git status --porcelain
    if ($status) {
        git add -A
        $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
        git commit -m "Deploy $ts"
        Write-Host "  [GIT] Auto-committed: Deploy $ts" -ForegroundColor Green
    } else {
        Write-Host "  [GIT] Working tree clean" -ForegroundColor Yellow
    }
}

Write-Host ""
$lastCommit = git log --oneline -1 2>$null
Write-Host "  [GIT] Latest: $lastCommit" -ForegroundColor Cyan
Write-Host ""

# ===== STEP 3: Push to GitHub =====
Write-Host "  [PUSH] Pushing to GitHub..." -ForegroundColor White
git push -u origin main 2>&1 | ForEach-Object { Write-Host "    $_" }

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    $tag = "deploy-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    git tag $tag 2>$null
    git push origin $tag 2>$null

    Write-Host "  ========================================" -ForegroundColor Green
    Write-Host "  DEPLOYED TO GITHUB!" -ForegroundColor Green
    Write-Host "  ========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Repo:   https://$REPO" -ForegroundColor Yellow
    Write-Host "  Tag:    $tag" -ForegroundColor Cyan
    Write-Host "  Domain: https://$DOMAIN" -ForegroundColor Yellow
} else {
    Write-Host "  ========================================" -ForegroundColor Red
    Write-Host "  PUSH FAILED" -ForegroundColor Red
    Write-Host "  ========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Make sure you:" -ForegroundColor Yellow
    Write-Host "  1. Created the repo at https://github.com/new" -ForegroundColor White
    Write-Host "     Name: visual-pi-card" -ForegroundColor White
    Write-Host "  2. Are authenticated with GitHub" -ForegroundColor White
    Write-Host "     Run: git config --global credential.helper manager" -ForegroundColor White
}
Write-Host ""
