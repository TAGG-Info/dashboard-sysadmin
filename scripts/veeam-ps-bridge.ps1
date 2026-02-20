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
  .\veeam-ps-bridge.ps1 -Port 9421 -Username "TAGGINFO\test.veeam" -Password "P@ssw0rd73410"
#>

param(
    [int]$Port = 9421,
    [int]$CacheRefreshSeconds = 45,
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
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Refreshing VBR data cache..."

        # --- 1. Sessions: only last 7 days, build hashtable for O(1) lookups ---
        $cutoff = (Get-Date).AddDays(-7)
        $allSessions = @(Get-VBRBackupSession | Where-Object { $_.CreationTimeUTC -gt $cutoff } | Sort-Object CreationTimeUTC -Descending)

        # Hashtable: job name → most recent session (first match since sorted desc)
        $latestByJob = @{}
        foreach ($s in $allSessions) {
            if (-not $latestByJob.ContainsKey($s.JobName)) {
                $latestByJob[$s.JobName] = $s
            }
        }

        # Job ID → name lookup for "after job" chains
        $jobIdToName = @{}

        # --- 2. JOBS ---
        $jobs = [System.Collections.Generic.List[hashtable]]::new()
        $now = Get-Date

        # Standard VBR jobs — exclude EpAgentBackup
        $vbrJobs = @(Get-VBRJob -WarningAction SilentlyContinue | Where-Object { $_.JobType -ne 'EpAgentBackup' })

        # Pre-build ID→Name map for after-job lookups
        foreach ($j in $vbrJobs) { $jobIdToName[$j.Id.ToString()] = $j.Name }

        foreach ($j in $vbrJobs) {
            # Last session from hashtable (no VBR API call)
            $ls = $latestByJob[$j.Name]

            $objectsCount = 0
            try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}

            $status = "Stopped"
            try { if ($j.IsRunning) { $status = "Working" } } catch {}

            # Next run — each level independent (never skip $j.NextRun if GetScheduleOptions throws)
            $nextRunStr = $null
            # 1. Direct NextRun property (Veeam 12+, most reliable)
            try { $nr = $j.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
            # 2-5. Schedule options fallbacks
            if (-not $nextRunStr) {
                try {
                    $opts = $j.GetScheduleOptions()
                    try {
                        if ($opts.OptionsScheduleAfterJob -and $opts.OptionsScheduleAfterJob.IsEnabled) {
                            $aName = $jobIdToName[$opts.OptionsScheduleAfterJob.Id.ToString()]
                            if ($aName) { $nextRunStr = "Apres [$aName]" }
                        }
                    } catch {}
                    if (-not $nextRunStr) {
                        try { $nr = $opts.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                    }
                    if (-not $nextRunStr -and $j.IsScheduleEnabled) {
                        try { $td = $opts.OptionsDaily.TimeLocal; if ($td -and $td -ne [TimeSpan]::Zero) { $nr = [datetime]::Today.Add($td); if ($nr -le $now) { $nr = $nr.AddDays(1) }; $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                    }
                    if (-not $nextRunStr -and $j.IsScheduleEnabled) {
                        try { $st = $opts.StartDateTime; if ($st -and $st -gt [datetime]::MinValue) { $nr = [datetime]::Today.Add($st.TimeOfDay); if ($nr -le $now) { $nr = $nr.AddDays(1) }; $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                    }
                } catch {}
            }

            $target = ""
            try { $target = $j.GetTargetRepository().Name } catch {}

            $typeStr = $j.JobType.ToString()
            try { if ($typeStr -eq 'Backup' -and "$($j.BackupPlatform)" -eq 'EHyperV') { $typeStr = 'HyperVBackup' } } catch {}

            $jobs.Add(@{
                id         = $j.Id.ToString()
                name       = $j.Name
                type       = $typeStr
                isDisabled = (-not $j.IsScheduleEnabled)
                schedule   = @{ isEnabled = $j.IsScheduleEnabled }
                lastRun    = if ($ls) { $ls.CreationTimeUTC.ToString("o") } else { $null }
                lastResult = if ($ls) { $ls.Result.ToString() } else { "None" }
                objects    = $objectsCount
                status     = $status
                nextRun    = $nextRunStr
                target     = $target
            })
        }

        # Agent/computer backup jobs (Veeam 12+)
        try {
            $agentJobs = @(Get-VBRComputerBackupJob)
            foreach ($j in $agentJobs) {
                try {
                    $ls = $latestByJob["$($j.Name)"]

                    $objectsCount = 0
                    try { $objectsCount = @($j.BackupObject).Count } catch {
                        try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}
                    }

                    $status = "Stopped"
                    try { if ($j.IsRunning) { $status = "Working" } } catch {}

                    $nextRunStr = $null
                    try {
                        try { $nr = $j.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                        if (-not $nextRunStr) {
                            $opts = $j.GetScheduleOptions()
                            if ($opts) {
                                try { $nr = $opts.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                            }
                            if (-not $nextRunStr -and $opts -and $j.IsScheduleEnabled) {
                                try { $td = $opts.OptionsDaily.TimeLocal; if ($td -and $td -ne [TimeSpan]::Zero) { $nr = [datetime]::Today.Add($td); if ($nr -le $now) { $nr = $nr.AddDays(1) }; $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                            }
                        }
                    } catch {}

                    $target = ""
                    try { $target = "$($j.BackupRepository.Name)" } catch {
                        try { $target = "$($j.GetTargetRepository().Name)" } catch {}
                    }

                    $typeStr = "$($j.JobType)"
                    if (-not $typeStr) { try { $typeStr = "$($j.Type)" } catch {} }
                    if (-not $typeStr) { $typeStr = "EpAgentBackup" }

                    $jobs.Add(@{
                        id         = "$($j.Id)"
                        name       = "$($j.Name)"
                        type       = $typeStr
                        isDisabled = (-not $j.IsScheduleEnabled)
                        schedule   = @{ isEnabled = [bool]$j.IsScheduleEnabled }
                        lastRun    = if ($ls) { $ls.CreationTimeUTC.ToString("o") } else { $null }
                        lastResult = if ($ls) { "$($ls.Result)" } else { "None" }
                        objects    = $objectsCount
                        status     = $status
                        nextRun    = $nextRunStr
                        target     = $target
                    })
                } catch {
                    Write-Warning "Agent job '$($j.Name)' skipped: $_"
                }
            }
        } catch {
            Write-Warning "Get-VBRComputerBackupJob failed: $_"
        }

        # Tape jobs (Veeam 12+)
        try {
            $tapeJobs = @(Get-VBRTapeJob)
            foreach ($j in $tapeJobs) {
                $jobIdToName["$($j.Id)"] = "$($j.Name)"
            }
            foreach ($j in $tapeJobs) {
                try {
                    $ls = $latestByJob["$($j.Name)"]

                    $objectsCount = 0
                    try { $objectsCount = @($j.Object).Count } catch {
                        try { $objectsCount = @($j.GetObjectsInJob()).Count } catch {}
                    }

                    $status = "Stopped"
                    try { if ($j.LastState -eq 'Working' -or $j.IsRunning) { $status = "Working" } } catch {}

                    $nextRunStr = $null
                    try { $nr = $j.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                    if (-not $nextRunStr) {
                        try {
                            $opts = $j.GetScheduleOptions()
                            try {
                                if ($opts -and $opts.OptionsScheduleAfterJob -and $opts.OptionsScheduleAfterJob.IsEnabled) {
                                    $aName = $jobIdToName[$opts.OptionsScheduleAfterJob.Id.ToString()]
                                    if ($aName) { $nextRunStr = "Apres [$aName]" }
                                }
                            } catch {}
                            if (-not $nextRunStr -and $opts) {
                                try { $nr = $opts.NextRun; if ($nr -and $nr -gt [datetime]::MinValue) { $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                            }
                            if (-not $nextRunStr -and $j.Enabled -and $opts) {
                                try { $td = $opts.OptionsDaily.TimeLocal; if ($td -and $td -ne [TimeSpan]::Zero) { $nr = [datetime]::Today.Add($td); if ($nr -le $now) { $nr = $nr.AddDays(1) }; $nextRunStr = $nr.ToUniversalTime().ToString("o") } } catch {}
                            }
                        } catch {}
                    }

                    $target = ""
                    try { $target = "$($j.Target.Name)" } catch {
                        try { $target = "$($j.GetTargetRepository().Name)" } catch {}
                    }

                    $typeStr = "$($j.Type)"
                    if (-not $typeStr) { $typeStr = "BackupToTape" }

                    $isDisabled = $true
                    try { $isDisabled = (-not $j.Enabled) } catch {
                        try { $isDisabled = (-not $j.IsScheduleEnabled) } catch {}
                    }

                    $jobs.Add(@{
                        id         = "$($j.Id)"
                        name       = "$($j.Name)"
                        type       = $typeStr
                        isDisabled = $isDisabled
                        schedule   = @{ isEnabled = (-not $isDisabled) }
                        lastRun    = if ($ls) { $ls.CreationTimeUTC.ToString("o") } else { $null }
                        lastResult = if ($ls) { "$($ls.Result)" } else { "None" }
                        objects    = $objectsCount
                        status     = $status
                        nextRun    = $nextRunStr
                        target     = $target
                    })
                } catch {
                    Write-Warning "Tape job '$($j.Name)' skipped: $_"
                }
            }
        } catch {
            Write-Warning "Get-VBRTapeJob failed: $_"
        }

        $script:jobsCache = if ($jobs.Count -gt 0) { ($jobs.ToArray() | ConvertTo-Json -Depth 5 -Compress) } else { "[]" }

        # --- 3. SESSIONS (last 50, filter out failed retries) ---
        # Sessions are sorted desc (most recent first).
        # If a job has a Success/Warning AFTER a Failed within 2h, the Failed is a retry → skip it.
        $jobSuccessTime = @{} # job name → CreationTimeUTC of most recent non-failed session
        $filteredSessions = [System.Collections.Generic.List[object]]::new()
        foreach ($s in $allSessions) {
            $result = $s.Result.ToString()
            if ($result -ne 'Failed') {
                if (-not $jobSuccessTime.ContainsKey($s.JobName)) {
                    $jobSuccessTime[$s.JobName] = $s.CreationTimeUTC
                }
                $filteredSessions.Add($s)
            } else {
                # Failed — skip if same job had a more recent success within 2h
                if ($jobSuccessTime.ContainsKey($s.JobName)) {
                    $gap = ($jobSuccessTime[$s.JobName] - $s.CreationTimeUTC).TotalHours
                    if ($gap -ge 0 -and $gap -lt 2) { continue }
                }
                $filteredSessions.Add($s)
            }
            if ($filteredSessions.Count -ge 50) { break }
        }
        $sessions = $filteredSessions | ForEach-Object {
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
        $sw.Stop()
        $withNextRun = ($jobs | Where-Object { $_.nextRun }).Count
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Cache refreshed: $($jobs.Count) jobs ($withNextRun with nextRun), $(@($sessions).Count) sessions in $($sw.Elapsed.TotalSeconds.ToString('F1'))s"
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
