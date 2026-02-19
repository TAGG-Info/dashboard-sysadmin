<#
.SYNOPSIS
  Veeam PowerShell HTTP Bridge — exposes Get-VBRJob/Get-VBRBackupSession as REST JSON.

.DESCRIPTION
  Lightweight HTTP server that runs on the VBR server (e.g. TAGGSRVBAK02).
  Caches data internally every 2 minutes to avoid hammering VBR on every request.
  Authenticates via Basic auth (same credentials as VBEM).

  Endpoints:
    GET /api/jobs              → all VBR jobs (normalized to dashboard VeeamJob type)
    GET /api/sessions?limit=50 → recent backup sessions (normalized to VeeamSession type)
    GET /api/health            → { status: "ok" }

.PARAMETER Port
  HTTP port to listen on. Default: 9420.

.PARAMETER CacheRefreshSeconds
  How often to refresh data from VBR. Default: 120 (2 min).

.PARAMETER Username
  Expected Basic auth username.

.PARAMETER Password
  Expected Basic auth password.

.EXAMPLE
  .\veeam-ps-bridge.ps1 -Port 9420 -Username "TAGGINFO\test.veeam" -Password "P@ssw0rd73410"
#>

param(
    [int]$Port = 9420,
    [int]$CacheRefreshSeconds = 120,
    [string]$Username = "",
    [string]$Password = ""
)

# Require Veeam PowerShell module (Veeam 12+)
if (-not (Get-Module -Name Veeam.Backup.PowerShell -ErrorAction SilentlyContinue)) {
    try {
        Import-Module Veeam.Backup.PowerShell -ErrorAction Stop
    } catch {
        # Fallback: try legacy snap-in (Veeam 9.x/10.x)
        try {
            Add-PSSnapin VeeamPSSnapin -ErrorAction Stop
        } catch {
            Write-Error "Veeam PowerShell module not found. Run this on the VBR server with Veeam B&R installed."
            exit 1
        }
    }
}

# --- Cache ---
$script:jobsCache = "[]"
$script:sessionsCache = "[]"
$script:lastRefresh = [datetime]::MinValue

function Refresh-Cache {
    try {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Refreshing VBR data cache..."

        # Get standard VM jobs (exclude agent jobs to avoid deprecation warning)
        $jobs = @()
        $jobs += Get-VBRJob -WarningAction SilentlyContinue | Where-Object { $_.JobType -ne 'EpAgentBackup' } | ForEach-Object {
            $lastSession = $_.FindLastSession()
            @{
                id         = $_.Id.ToString()
                name       = $_.Name
                type       = $_.JobType.ToString()
                isDisabled = (-not $_.IsScheduleEnabled)
                schedule   = @{ isEnabled = $_.IsScheduleEnabled }
                lastRun    = if ($lastSession) { $lastSession.CreationTime.ToUniversalTime().ToString("o") } else { $null }
                lastResult = if ($lastSession) { $lastSession.Result.ToString() } else { "None" }
            }
        }
        # Get agent/computer backup jobs (Veeam 12+ recommended cmdlet)
        try {
            $jobs += Get-VBRComputerBackupJob | ForEach-Object {
                $lastSession = $_.FindLastSession()
                @{
                    id         = $_.Id.ToString()
                    name       = $_.Name
                    type       = $_.JobType.ToString()
                    isDisabled = (-not $_.IsScheduleEnabled)
                    schedule   = @{ isEnabled = $_.IsScheduleEnabled }
                    lastRun    = if ($lastSession) { $lastSession.CreationTime.ToUniversalTime().ToString("o") } else { $null }
                    lastResult = if ($lastSession) { $lastSession.Result.ToString() } else { "None" }
                }
            }
        } catch {
            Write-Warning "Get-VBRComputerBackupJob failed: $_"
        }
        $script:jobsCache = ($jobs | ConvertTo-Json -Depth 5 -Compress)
        if (-not $jobs) { $script:jobsCache = "[]" }

        # Get sessions (last 50 by default)
        $sessions = Get-VBRBackupSession |
            Sort-Object CreationTimeUTC -Descending |
            Select-Object -First 50 |
            ForEach-Object {
                @{
                    id           = $_.Id.ToString()
                    name         = $_.JobName
                    sessionType  = $_.JobType.ToString()
                    state        = $_.State.ToString()
                    result       = @{
                        result  = $_.Result.ToString()
                        message = $_.Description
                    }
                    progress     = $_.Progress.Percents
                    creationTime = $_.CreationTimeUTC.ToString("o")
                    endTime      = if ($_.EndTimeUTC -gt [datetime]::MinValue) { $_.EndTimeUTC.ToString("o") } else { $null }
                    statistics   = @{
                        processedSize   = $_.Progress.ProcessedSize
                        readSize        = $_.Progress.ReadSize
                        transferredSize = $_.Progress.TransferedSize
                        duration        = [int]($_.Progress.Duration.TotalSeconds)
                    }
                }
            }
        $script:sessionsCache = ($sessions | ConvertTo-Json -Depth 5 -Compress)
        if (-not $sessions) { $script:sessionsCache = "[]" }

        $script:lastRefresh = Get-Date
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Cache refreshed: $($jobs.Count) jobs, $($sessions.Count) sessions"
    } catch {
        Write-Warning "Cache refresh failed: $_"
    }
}

function Test-BasicAuth {
    param([string]$AuthHeader)
    if (-not $Username -or -not $Password) { return $true } # no auth required
    if (-not $AuthHeader) { return $false }
    if (-not $AuthHeader.StartsWith("Basic ")) { return $false }
    try {
        $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($AuthHeader.Substring(6)))
        $parts = $decoded -split ":", 2
        # Strip domain prefix (DOMAIN\user, .\user) for comparison
        $incomingUser = ($parts[0] -split '\\')[-1]
        $expectedUser = ($Username -split '\\')[-1]
        return ($incomingUser -eq $expectedUser -and $parts[1] -eq $Password)
    } catch { return $false }
}

# --- HTTP Listener ---
$prefix = "http://+:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Veeam PS Bridge listening on port $Port"
    Write-Host "Press Ctrl+C to stop."

    # Initial cache fill
    Refresh-Cache

    while ($listener.IsListening) {
        $contextTask = $listener.GetContextAsync()

        # While waiting for request, check if cache needs refresh
        while (-not $contextTask.AsyncWaitHandle.WaitOne(1000)) {
            if ((Get-Date) - $script:lastRefresh -gt [TimeSpan]::FromSeconds($CacheRefreshSeconds)) {
                Refresh-Cache
            }
        }

        $context = $contextTask.Result
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.AbsolutePath
        $response.ContentType = "application/json; charset=utf-8"
        $response.AddHeader("Access-Control-Allow-Origin", "*")

        # Auth check
        $authHeader = $request.Headers["Authorization"]
        if (-not (Test-BasicAuth -AuthHeader $authHeader)) {
            $response.StatusCode = 401
            $body = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Unauthorized"}')
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.Close()
            continue
        }

        # Refresh cache if stale
        if ((Get-Date) - $script:lastRefresh -gt [TimeSpan]::FromSeconds($CacheRefreshSeconds)) {
            Refresh-Cache
        }

        $responseBody = switch -Wildcard ($path) {
            "/api/jobs"     { $script:jobsCache }
            "/api/sessions" {
                $query = $request.Url.Query
                # limit param is handled at cache level (already 50)
                $script:sessionsCache
            }
            "/api/health"   { '{"status":"ok"}' }
            default         { $response.StatusCode = 404; '{"error":"Not found"}' }
        }

        $body = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
        $response.OutputStream.Write($body, 0, $body.Length)
        $response.Close()
    }
} catch {
    Write-Error "Listener error: $_"
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Listener stopped."
}
