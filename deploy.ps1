<#
    Visual Pi Card - Auto Deploy to cPanel
    Domain: omendapipaysglobel.online
    Server: 198.54.116.227

    This script uploads all required files to your cPanel hosting.
    Run: .\deploy.ps1
#>

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host "  VISUAL PI CARD - AUTO DEPLOY" -ForegroundColor Yellow
Write-Host "  omendapipaysglobel.online (198.54.116.227)" -ForegroundColor Yellow
Write-Host "  ========================================" -ForegroundColor Yellow
Write-Host ""

# ===== CONFIGURATION =====
$DOMAIN = "omendapipaysglobel.online"
$SERVER_IP = "198.54.116.227"
$FTP_HOST = "ftp.$DOMAIN"
$REMOTE_DIR = "/public_html"

# Files to deploy
$DEPLOY_FILES = @(
    "index.html",
    ".htaccess",
    ".env",
    "manifest.json",
    "sw.js",
    "server.js",
    "package.json",
    "setup.html",
    "pi visual card.html",
    "card-visa.html",
    "card-mastercard.html",
    "card-gold.html",
    "card-platinum.html",
    "card-black.html",
    "card-amex.html",
    "icon-192.svg"
)

# Source directory (this folder)
$SOURCE_DIR = $PSScriptRoot
if (-not $SOURCE_DIR) { $SOURCE_DIR = Get-Location }

Write-Host "  Source: $SOURCE_DIR" -ForegroundColor Cyan
Write-Host "  Target: $FTP_HOST$REMOTE_DIR" -ForegroundColor Cyan
Write-Host ""

# ===== CHECK FILES EXIST =====
Write-Host "  [1/4] Checking files..." -ForegroundColor White
$missing = @()
foreach ($file in $DEPLOY_FILES) {
    $path = Join-Path $SOURCE_DIR $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        $msg = "    OK  $file - $size bytes"
        Write-Host $msg -ForegroundColor Green
    } else {
        $msg = "    MISSING  $file"
        Write-Host $msg -ForegroundColor Red
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "  ERROR: Missing files! Cannot deploy." -ForegroundColor Red
    exit 1
}
Write-Host ""

# ===== DNS CHECK =====
Write-Host "  [2/4] Checking DNS for $DOMAIN..." -ForegroundColor White
try {
    $dns = Resolve-DnsName $DOMAIN -Type A -ErrorAction SilentlyContinue
    if ($dns) {
        $resolvedIP = ($dns | Where-Object { $_.QueryType -eq 'A' } | Select-Object -First 1).IPAddress
        if ($resolvedIP -eq $SERVER_IP) {
            Write-Host "    OK  $DOMAIN -> $resolvedIP" -ForegroundColor Green
        } else {
            Write-Host "    WARN  $DOMAIN -> $resolvedIP [expected $SERVER_IP]" -ForegroundColor Yellow
            Write-Host "    DNS may need updating. Set A record to $SERVER_IP" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    WARN  Cannot resolve $DOMAIN - DNS not set up yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    WARN  DNS lookup failed. Set A record: $DOMAIN -> $SERVER_IP" -ForegroundColor Yellow
    Write-Host "" 
}
Write-Host ""

# ===== FTP UPLOAD =====
Write-Host "  [3/4] Ready to upload via FTP" -ForegroundColor White
Write-Host ""
Write-Host "  Enter your cPanel FTP credentials:" -ForegroundColor Cyan

$ftpUser = Read-Host "    FTP Username"
$ftpPassSecure = Read-Host "    FTP Password" -AsSecureString
$ftpPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ftpPassSecure)
)

Write-Host ""
Write-Host "  Uploading files to $FTP_HOST..." -ForegroundColor White

$success = 0
$failed = 0

foreach ($file in $DEPLOY_FILES) {
    $localPath = Join-Path $SOURCE_DIR $file
    $remotePath = "ftp://$FTP_HOST$REMOTE_DIR/$file"

    try {
        $ftpRequest = [System.Net.FtpWebRequest]::Create($remotePath)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        $ftpRequest.EnableSsl = $false
        $ftpRequest.KeepAlive = $false

        $fileContent = [System.IO.File]::ReadAllBytes($localPath)
        $ftpRequest.ContentLength = $fileContent.Length

        $stream = $ftpRequest.GetRequestStream()
        $stream.Write($fileContent, 0, $fileContent.Length)
        $stream.Close()

        $response = $ftpRequest.GetResponse()
        $response.Close()

        Write-Host "    UPLOADED  $file" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "    FAILED   $file - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

# Clear password from memory
$ftpPass = $null

Write-Host ""

# ===== SUMMARY =====
Write-Host "  [4/4] Deploy Summary" -ForegroundColor White
Write-Host "  ----------------------------------------" -ForegroundColor Gray
Write-Host "    Uploaded: $success files" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "    Failed:   $failed files" -ForegroundColor Red
}
Write-Host ""

if ($failed -eq 0) {
    Write-Host "  ========================================" -ForegroundColor Green
    Write-Host "  DEPLOY COMPLETE!" -ForegroundColor Green
    Write-Host "  ========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Your site is live at:" -ForegroundColor Cyan
    Write-Host "    https://$DOMAIN" -ForegroundColor Yellow
    Write-Host "    https://$DOMAIN/setup.html  (verify setup)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  DNS Settings (set in your domain registrar):" -ForegroundColor Cyan
    Write-Host "    A Record:  `@    -> $SERVER_IP" -ForegroundColor White
    Write-Host "    A Record:  www  -> $SERVER_IP" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  Some files failed to upload." -ForegroundColor Red
    Write-Host "  Try uploading manually via cPanel File Manager:" -ForegroundColor Yellow
    Write-Host "    1. Go to cPanel File Manager" -ForegroundColor White
    Write-Host "    2. Open public_html folder" -ForegroundColor White
    Write-Host "    3. Upload all project files" -ForegroundColor White
    Write-Host ""
}
