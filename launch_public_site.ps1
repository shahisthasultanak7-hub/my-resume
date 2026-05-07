param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPidFile = Join-Path $root "http_server.pid"
$tunnelPidFile = Join-Path $root "cloudflared.pid"
$logOutFile = Join-Path $root "cloudflared.out.log"
$logErrFile = Join-Path $root "cloudflared.err.log"
$urlFile = Join-Path $root "public_url.txt"
$cloudflaredExe = Join-Path $root "cloudflared.exe"

if (!(Test-Path $cloudflaredExe)) {
    throw "cloudflared.exe not found at $cloudflaredExe"
}

if (Test-Path $serverPidFile) { Remove-Item -LiteralPath $serverPidFile -Force }
if (Test-Path $tunnelPidFile) { Remove-Item -LiteralPath $tunnelPidFile -Force }
if (Test-Path $logOutFile) { Remove-Item -LiteralPath $logOutFile -Force }
if (Test-Path $logErrFile) { Remove-Item -LiteralPath $logErrFile -Force }
if (Test-Path $urlFile) { Remove-Item -LiteralPath $urlFile -Force }

# Static file server for this folder
$serverProc = Start-Process -FilePath python `
    -ArgumentList "-m http.server $Port --bind 127.0.0.1" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

$serverProc.Id | Set-Content -Path $serverPidFile

# Public tunnel
$tunnelProc = Start-Process -FilePath $cloudflaredExe `
    -ArgumentList "tunnel --no-autoupdate --url http://127.0.0.1:$Port" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logOutFile `
    -RedirectStandardError $logErrFile `
    -PassThru

$tunnelProc.Id | Set-Content -Path $tunnelPidFile

# Wait for URL to appear in logs
$publicUrl = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $logOutFile) {
        $match = Select-String -Path $logOutFile -Pattern "https://[-a-z0-9]+\.trycloudflare\.com" -AllMatches -ErrorAction SilentlyContinue
        if ($match -and $match.Matches.Count -gt 0) {
            $publicUrl = $match.Matches[0].Value
            break
        }
    }
}

if (!$publicUrl) {
    throw "Could not detect public URL. Check $logOutFile and $logErrFile"
}

$publicUrl | Set-Content -Path $urlFile
Write-Output $publicUrl
