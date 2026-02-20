<#
.SYNOPSIS
  Installe veeam-ps-bridge.ps1 en tant que service Windows via NSSM.

.DESCRIPTION
  - Telecharge NSSM si absent
  - Cree le service "VeeamPSBridge"
  - Configure auto-restart, logging, et credentials
  - Le service demarre automatiquement au boot du serveur

  Prerequis : executer en tant qu'Administrateur sur le serveur VBR.

.PARAMETER Port
  Port HTTP du bridge. Default: 9421 (9420 est utilise par Veeam lui-meme).

.PARAMETER Username
  Username Basic auth (ex: "TAGGINFO\test.veeam").

.PARAMETER Password
  Password Basic auth.

.PARAMETER ServiceName
  Nom du service Windows. Default: "VeeamPSBridge".

.PARAMETER NssmPath
  Chemin vers nssm.exe. Si absent, telecharge automatiquement.

.EXAMPLE
  .\install-veeam-bridge-service.ps1 -Username "TAGGINFO\test.veeam" -Password "MonMotDePasse"
#>

param(
    [int]$Port = 9421,
    [Parameter(Mandatory)][string]$Username,
    [Parameter(Mandatory)][string]$Password,
    [string]$ServiceName = "VeeamPSBridge",
    [string]$NssmPath = ""
)

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# --- Locate or download NSSM ---
if ($NssmPath -and (Test-Path $NssmPath)) {
    $nssm = $NssmPath
} elseif (Get-Command nssm -ErrorAction SilentlyContinue) {
    $nssm = (Get-Command nssm).Source
} else {
    Write-Host "NSSM non trouve. Telechargement..." -ForegroundColor Yellow
    $nssmDir = Join-Path $PSScriptRoot "nssm"
    $nssmZip = Join-Path $env:TEMP "nssm.zip"

    # Download NSSM 2.24 (derniere version stable)
    $url = "https://nssm.cc/release/nssm-2.24.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $nssmZip -UseBasicParsing

    Expand-Archive -Path $nssmZip -DestinationPath $env:TEMP -Force
    $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
    $nssmExe = Join-Path $env:TEMP "nssm-2.24\$arch\nssm.exe"

    if (-not (Test-Path $nssmExe)) {
        Write-Error "NSSM introuvable apres extraction: $nssmExe"
        exit 1
    }

    # Copy to scripts folder for persistence
    if (-not (Test-Path $nssmDir)) { New-Item -ItemType Directory -Path $nssmDir | Out-Null }
    Copy-Item $nssmExe (Join-Path $nssmDir "nssm.exe") -Force
    $nssm = Join-Path $nssmDir "nssm.exe"
    Write-Host "NSSM installe: $nssm" -ForegroundColor Green
}

# --- Check if service already exists ---
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Service '$ServiceName' existe deja (Status: $($existing.Status))." -ForegroundColor Yellow
    $choice = Read-Host "Supprimer et recreer? (O/N)"
    if ($choice -ne "O" -and $choice -ne "o") {
        Write-Host "Abandon." -ForegroundColor Red
        exit 0
    }
    if ($existing.Status -eq "Running") {
        & $nssm stop $ServiceName
        Start-Sleep -Seconds 2
    }
    & $nssm remove $ServiceName confirm
    Start-Sleep -Seconds 1
}

# --- Paths ---
$bridgeScript = Join-Path $PSScriptRoot "veeam-ps-bridge.ps1"
if (-not (Test-Path $bridgeScript)) {
    Write-Error "Script bridge introuvable: $bridgeScript"
    exit 1
}

$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$pwsh = (Get-Command powershell.exe).Source

# --- Install service ---
Write-Host "`nInstallation du service '$ServiceName'..." -ForegroundColor Cyan

& $nssm install $ServiceName $pwsh "-ExecutionPolicy Bypass -NoProfile -File `"$bridgeScript`" -Port $Port -Username `"$Username`" -Password `"$Password`""

# Display name & description
& $nssm set $ServiceName DisplayName "Veeam PowerShell Bridge"
& $nssm set $ServiceName Description "HTTP bridge exposant les jobs/sessions Veeam B&R en REST JSON (port $Port)"

# Auto-start
& $nssm set $ServiceName Start SERVICE_AUTO_START

# Logging (stdout + stderr to files)
& $nssm set $ServiceName AppStdout (Join-Path $logDir "veeam-bridge-stdout.log")
& $nssm set $ServiceName AppStderr (Join-Path $logDir "veeam-bridge-stderr.log")
& $nssm set $ServiceName AppStdoutCreationDisposition 4  # append
& $nssm set $ServiceName AppStderrCreationDisposition 4  # append
& $nssm set $ServiceName AppRotateFiles 1
& $nssm set $ServiceName AppRotateSeconds 86400          # rotate daily
& $nssm set $ServiceName AppRotateBytes 10485760         # rotate at 10 MB

# Restart on failure (wait 10s between retries)
& $nssm set $ServiceName AppRestartDelay 10000

# Graceful shutdown (send Ctrl+C, wait 15s before kill)
& $nssm set $ServiceName AppStopMethodSkip 0
& $nssm set $ServiceName AppStopMethodConsole 15000

# --- Start service ---
Write-Host "`nDemarrage du service..." -ForegroundColor Cyan
& $nssm start $ServiceName
Start-Sleep -Seconds 3

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "`n=== Service '$ServiceName' installe et demarre avec succes ===" -ForegroundColor Green
    Write-Host "  Port:    $Port"
    Write-Host "  Logs:    $logDir"
    Write-Host "  Health:  http://localhost:$Port/api/health"
    Write-Host ""
    Write-Host "Commandes utiles:" -ForegroundColor Cyan
    Write-Host "  Statut:     Get-Service $ServiceName"
    Write-Host "  Arreter:    nssm stop $ServiceName"
    Write-Host "  Demarrer:   nssm start $ServiceName"
    Write-Host "  Redemarrer: nssm restart $ServiceName"
    Write-Host "  Logs live:  Get-Content '$logDir\veeam-bridge-stdout.log' -Tail 20 -Wait"
    Write-Host "  Supprimer:  nssm remove $ServiceName confirm"
} else {
    Write-Warning "Le service n'a pas demarre correctement. Verifiez les logs:"
    Write-Host "  $logDir\veeam-bridge-stderr.log"
}
