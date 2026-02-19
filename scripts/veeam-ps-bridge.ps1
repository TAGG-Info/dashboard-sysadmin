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

        # Pre-fetch all sessions once (reused for session cache + job lookups)
        $allSessions = @(Get-VBRBackupSession | Sort-Object CreationTimeUTC -Descending)

        # --- JOBS ---
        $jobs = @()
        $now = Get-Date

        # Standard VBR jobs (VMware, Hyper-V, tape, etc.) — exclude EpAgentBackup
        $vbrJobs = @(Get-VBRJob -WarningAction SilentlyContinue | Where-Object { $_.JobType -ne 'EpAgentBackup' })
        foreach ($j in $vbrJobs) {
            $lastSession = $null
            try { $lastSession = $j.FindLastSession() } catch {}

            $objectsCount = 0
            try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}

            $status = "Stopped"
            try { if ($j.IsRunning) { $status = "Working" } } catch {}

            # Compute next run from schedule options
            $nextRunStr = $null
            try {
                $opts = $j.GetScheduleOptions()
                if ($opts.OptionsScheduleAfterJob.IsEnabled) {
                    $afterId = $opts.OptionsScheduleAfterJob.Id
                    $afterJob = $vbrJobs | Where-Object { $_.Id -eq $afterId } | Select-Object -First 1
                    if ($afterJob) { $nextRunStr = "Apres [$($afterJob.Name)]" }
                } elseif ($j.IsScheduleEnabled) {
                    # Daily schedule: compute next occurrence from time of day
                    try {
                        $timeOfDay = $opts.OptionsDaily.TimeLocal
                        if ($timeOfDay) {
                            $nextRun = [datetime]::Today.Add($timeOfDay)
                            if ($nextRun -le $now) { $nextRun = $nextRun.AddDays(1) }
                            $nextRunStr = $nextRun.ToUniversalTime().ToString("o")
                        }
                    } catch {
                        # Fallback: StartDateTime
                        try {
                            $start = $opts.StartDateTime
                            if ($start -and $start.TimeOfDay) {
                                $nextRun = [datetime]::Today.Add($start.TimeOfDay)
                                if ($nextRun -le $now) { $nextRun = $nextRun.AddDays(1) }
                                $nextRunStr = $nextRun.ToUniversalTime().ToString("o")
                            }
                        } catch {}
                    }
                }
            } catch {}

            $target = ""
            try { $target = $j.GetTargetRepository().Name } catch {}

            # Distinguish Hyper-V from VMware (both have JobType=Backup)
            $typeStr = $j.JobType.ToString()
            try {
                if ($typeStr -eq 'Backup' -and "$($j.BackupPlatform)" -eq 'EHyperV') {
                    $typeStr = 'HyperVBackup'
                }
            } catch {}

            $jobs += @{
                id         = $j.Id.ToString()
                name       = $j.Name
                type       = $typeStr
                isDisabled = (-not $j.IsScheduleEnabled)
                schedule   = @{ isEnabled = $j.IsScheduleEnabled }
                lastRun    = if ($lastSession) { $lastSession.CreationTimeUTC.ToString("o") } else { $null }
                lastResult = if ($lastSession) { $lastSession.Result.ToString() } else { "None" }
                objects    = $objectsCount
                status     = $status
                nextRun    = $nextRunStr
                target     = $target
            }
        }

        # Agent/computer backup jobs (Veeam 12+)
        try {
            $agentJobs = @(Get-VBRComputerBackupJob)
            foreach ($j in $agentJobs) {
                try {
                    # Find last session by job name from pre-fetched sessions
                    $lastRun = $null
                    $lastResult = "None"
                    $lastSession = $allSessions | Where-Object { $_.JobName -eq $j.Name } | Select-Object -First 1
                    if ($lastSession) {
                        $lastRun = $lastSession.CreationTimeUTC.ToString("o")
                        $lastResult = "$($lastSession.Result)"
                    }

                    $objectsCount = 0
                    try { $objectsCount = @($j.BackupObject).Count } catch {
                        try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}
                    }

                    $status = "Stopped"
                    try { if ($j.IsRunning) { $status = "Working" } } catch {}

                    $nextRunStr = $null
                    try {
                        $opts = $j.GetScheduleOptions()
                        if ($opts -and $j.IsScheduleEnabled) {
                            $timeOfDay = $opts.OptionsDaily.TimeLocal
                            if ($timeOfDay) {
                                $nextRun = [datetime]::Today.Add($timeOfDay)
                                if ($nextRun -le $now) { $nextRun = $nextRun.AddDays(1) }
                                $nextRunStr = $nextRun.ToUniversalTime().ToString("o")
                            }
                        }
                    } catch {}

                    $target = ""
                    try { $target = "$($j.BackupRepository.Name)" } catch {
                        try { $target = "$($j.GetTargetRepository().Name)" } catch {}
                    }

                    # Resolve agent job type (JobType may be empty on VBRComputerBackupJob)
                    $typeStr = "$($j.JobType)"
                    if (-not $typeStr) {
                        try { $typeStr = "$($j.Type)" } catch {}
                    }
                    if (-not $typeStr) { $typeStr = "EpAgentBackup" }

                    $jobs += @{
                        id         = "$($j.Id)"
                        name       = "$($j.Name)"
                        type       = $typeStr
                        isDisabled = (-not $j.IsScheduleEnabled)
                        schedule   = @{ isEnabled = [bool]$j.IsScheduleEnabled }
                        lastRun    = $lastRun
                        lastResult = $lastResult
                        objects    = $objectsCount
                        status     = $status
                        nextRun    = $nextRunStr
                        target     = $target
                    }
                } catch {
                    Write-Warning "Agent job '$($j.Name)' skipped: $_"
                }
            }
        } catch {
            Write-Warning "Get-VBRComputerBackupJob failed: $_"
        }

        # Tape jobs (Veeam 12+: Get-VBRTapeJob)
        try {
            $tapeJobs = @(Get-VBRTapeJob)
            foreach ($j in $tapeJobs) {
                try {
                    $lastRun = $null
                    $lastResult = "None"
                    $lastSession = $allSessions | Where-Object { $_.JobName -eq $j.Name } | Select-Object -First 1
                    if ($lastSession) {
                        $lastRun = $lastSession.CreationTimeUTC.ToString("o")
                        $lastResult = "$($lastSession.Result)"
                    }

                    $objectsCount = 0
                    try { $objectsCount = @($j.Object).Count } catch {
                        try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}
                    }

                    $status = "Stopped"
                    try { if ($j.LastState -eq 'Working' -or $j.IsRunning) { $status = "Working" } } catch {}

                    $nextRunStr = $null
                    try {
                        $opts = $j.GetScheduleOptions()
                        if ($opts) {
                            if ($opts.OptionsScheduleAfterJob.IsEnabled) {
                                $afterId = $opts.OptionsScheduleAfterJob.Id
                                # Search in all job lists (vbrJobs + tapeJobs)
                                $afterJob = $vbrJobs | Where-Object { $_.Id -eq $afterId } | Select-Object -First 1
                                if (-not $afterJob) {
                                    $afterJob = $tapeJobs | Where-Object { $_.Id -eq $afterId } | Select-Object -First 1
                                }
                                if ($afterJob) { $nextRunStr = "Apres [$($afterJob.Name)]" }
                            } elseif ($j.Enabled) {
                                try {
                                    $timeOfDay = $opts.OptionsDaily.TimeLocal
                                    if ($timeOfDay) {
                                        $nextRun = [datetime]::Today.Add($timeOfDay)
                                        if ($nextRun -le $now) { $nextRun = $nextRun.AddDays(1) }
                                        $nextRunStr = $nextRun.ToUniversalTime().ToString("o")
                                    }
                                } catch {}
                            }
                        }
                    } catch {}

                    $target = ""
                    try { $target = "$($j.Target.Name)" } catch {
                        try { $target = "$($j.GetTargetRepository().Name)" } catch {}
                    }

                    # Tape job type resolution
                    $typeStr = "$($j.Type)"
                    if (-not $typeStr) { $typeStr = "BackupToTape" }

                    $isDisabled = $true
                    try { $isDisabled = (-not $j.Enabled) } catch {
                        try { $isDisabled = (-not $j.IsScheduleEnabled) } catch {}
                    }

                    $jobs += @{
                        id         = "$($j.Id)"
                        name       = "$($j.Name)"
                        type       = $typeStr
                        isDisabled = $isDisabled
                        schedule   = @{ isEnabled = (-not $isDisabled) }
                        lastRun    = $lastRun
                        lastResult = $lastResult
                        objects    = $objectsCount
                        status     = $status
                        nextRun    = $nextRunStr
                        target     = $target
                    }
                } catch {
                    Write-Warning "Tape job '$($j.Name)' skipped: $_"
                }
            }
        } catch {
            Write-Warning "Get-VBRTapeJob failed: $_"
        }

        $script:jobsCache = ($jobs | ConvertTo-Json -Depth 5 -Compress)
        if (-not $jobs) { $script:jobsCache = "[]" }

        # --- SESSIONS (last 50 from pre-fetched) ---
        $sessions = $allSessions | Select-Object -First 50 | ForEach-Object {
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

        try {
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
                "/api/sessions" { $script:sessionsCache }
                "/api/health"   { '{"status":"ok"}' }
                default         { $response.StatusCode = 404; '{"error":"Not found"}' }
            }

            $body = [System.Text.Encoding]::UTF8.GetBytes($responseBody)
            $response.OutputStream.Write($body, 0, $body.Length)
            $response.Close()
        } catch {
            # Client disconnected or network error — log and continue serving
            Write-Warning "Request error: $($_.Exception.Message)"
            try { $response.Close() } catch {}
        }
    }
} catch {
    Write-Error "Listener error: $_"
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Listener stopped."
}
