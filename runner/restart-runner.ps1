# Restarts Chrome (with CDP) and the Maestriss runner with a clean session state,
# so Chrome never shows the "Restore pages?" crash bubble or leftover New Tab pages.

Write-Host ""
Write-Host "=== Stopping old runner ==="

# Only kill node processes that belong to Maestriss; a blanket "taskkill /IM node.exe"
# would also take down unrelated tooling (Codex CLI, Claude Code, VS Code helpers).
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*maestriss*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# Ask Chrome to close normally first, so it records a clean exit and does not show
# restore-pages next time. Stop-Process and taskkill /F are both hard kills that make
# Chrome think it crashed; CloseMainWindow() is the graceful path.
$chromeProcesses = @(Get-Process chrome -ErrorAction SilentlyContinue)
if ($chromeProcesses.Count -gt 0) {
    $chromeProcesses | ForEach-Object { $null = $_.CloseMainWindow() }
    Start-Sleep -Seconds 3
    taskkill /F /IM chrome.exe 2>$null | Out-Null
}

$ChromeExe = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromeExe)) {
    $ChromeExe = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}
$ProfileDir = "$env:LOCALAPPDATA\MaestrissChromeProfile"

# Belt and suspenders: mark the previous session as a clean exit inside the profile.
# Chrome decides crash-restore from Preferences exit_type, so this guarantees no
# restore UI even if the last shutdown was a hard kill.
$PreferencesPath = Join-Path $ProfileDir "Default\Preferences"
if (Test-Path $PreferencesPath) {
    try {
        $prefsRaw = [System.IO.File]::ReadAllText($PreferencesPath)
        $prefsRaw = $prefsRaw -replace '"exit_type":"[^"]*"', '"exit_type":"Normal"'
        $prefsRaw = $prefsRaw -replace '"exited_cleanly":false', '"exited_cleanly":true'
        [System.IO.File]::WriteAllText($PreferencesPath, $prefsRaw, (New-Object System.Text.UTF8Encoding($false)))
    } catch {
        Write-Host "Warning: could not patch Chrome Preferences: $_"
    }
}

Write-Host "=== Starting Chrome (CDP) ==="

Start-Process -FilePath $ChromeExe -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=`"$ProfileDir`"",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
    "--disable-infobars",
    "about:blank"
)

Start-Sleep -Seconds 4

Write-Host "=== Starting Maestriss Runner ==="

Set-Location "D:\Programming\Chatjects\Maestriss\runner"

npm run dev -- serve --connect-cdp http://127.0.0.1:9222
