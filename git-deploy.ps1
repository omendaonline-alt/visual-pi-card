<#
    Visual Pi Card — Git Deploy to Server
    Domain: pivisualcard.online
    Server: 198.54.116.227

    USAGE:
      .\git-deploy.ps1                # Deploy latest commit
      .\git-deploy.ps1 -Message "fix" # Commit with message then deploy
#>

param(
    [string]$Message = ""
)

$DOMAIN = "pivisualcard.online"
$SERVER_IP = "198.54.116.227"
$FTP_HOST = "ftp.$DOMAIN"
$REMOTE_DIR = "/public_html"

# Files to deploy (only what goes to production)
$DEPLOY_FILES = @(
    "index.html",
    ".htaccess",
    "manifest.json",
    "sw.js",
    "setup.html",
    "icon-192.svg"
)

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host "  VISUAL PI CARD - GIT DEPLOY" -ForegroundColor Yellow
Write-Host "  $DOMAIN ($SERVER_IP)" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host ""

# ===== STEP 1: Git commit if message provided =====
if ($Message -ne "") {
    Write-Host "  [GIT] Staging changes..." -ForegroundColor Cyan
    git add -A
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [GIT] Nothing to commit (working tree clean)" -ForegroundColor Yellow
    } else {
        Write-Host "  [GIT] Committed: $Message" -ForegroundColor Green
    }
    Write-Host ""
}

# Show latest commit
$lastCommit = git log --oneline -1 2>$null
Write-Host "  [GIT] Latest commit: $lastCommit" -ForegroundColor Cyan
Write-Host ""

# ===== STEP 2: Sync pi visual card.html =====
Write-Host "  [SYNC] Copying index.html -> pi visual card.html" -ForegroundColor White
Copy-Item "index.html" "pi visual card.html" -Force
Write-Host ""

# ===== STEP 3: Check deploy files =====
Write-Host "  [CHECK] Verifying deploy files..." -ForegroundColor White
$allOk = $true
foreach ($file in $DEPLOY_FILES) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "    OK   $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "    SKIP $file (not found)" -ForegroundColor Yellow
        $allOk = $false
    }
}
Write-Host ""

# ===== STEP 4: FTP Upload =====
Write-Host "  [DEPLOY] Enter cPanel FTP credentials:" -ForegroundColor Cyan
$ftpUser = Read-Host "    FTP Username"
$ftpPassSecure = Read-Host "    FTP Password" -AsSecureString
$ftpPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ftpPassSecure)
)

Write-Host ""
Write-Host "  [DEPLOY] Uploading to $FTP_HOST..." -ForegroundColor White

$success = 0
$failed = 0

foreach ($file in $DEPLOY_FILES) {
    if (-not (Test-Path $file)) { continue }

    $remotePath = "ftp://$FTP_HOST$REMOTE_DIR/$file"
    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create($remotePath)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        $ftpRequest.EnableSsl = $false
        $ftpRequest.KeepAlive = $false

        $fileContent = [System.IO.File]::ReadAllBytes((Resolve-Path $file))
        $ftpRequest.ContentLength = $fileContent.Length

        $stream = $ftpRequest.GetRequestStream()
        $stream.Write($fileContent, 0, $fileContent.Length)
        $stream.Close()

        $response = $ftpRequest.GetResponse()
        $response.Close()

        Write-Host "    UP   $file" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "    FAIL $file - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

# Clear password
$ftpPass = $null

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Gray

if ($failed -eq 0) {
    # Tag this deploy in git
    $tag = "deploy-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    git tag $tag 2>$null

    Write-Host "  DEPLOY SUCCESS! ($success files)" -ForegroundColor Green
    Write-Host "  Tagged: $tag" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  LIVE:  https://$DOMAIN" -ForegroundColor Yellow
    Write-Host "  CHECK: https://$DOMAIN/setup.html" -ForegroundColor Yellow
} else {
    Write-Host "  $success uploaded, $failed failed" -ForegroundColor Red
    Write-Host "  Try cPanel File Manager: https://$SERVER_IP`:2083" -ForegroundColor Yellow
}
Write-Host "  ========================================" -ForegroundColor Gray
Write-Host ""
