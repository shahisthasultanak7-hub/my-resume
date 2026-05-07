$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPidFile = Join-Path $root "http_server.pid"
$tunnelPidFile = Join-Path $root "cloudflared.pid"

if (Test-Path $serverPidFile) {
    $serverPid = Get-Content $serverPidFile
    Stop-Process -Id $serverPid -Force
    Remove-Item -LiteralPath $serverPidFile -Force
}

if (Test-Path $tunnelPidFile) {
    $tunnelPid = Get-Content $tunnelPidFile
    Stop-Process -Id $tunnelPid -Force
    Remove-Item -LiteralPath $tunnelPidFile -Force
}

Write-Output "Stopped public resume site processes (if running)."
