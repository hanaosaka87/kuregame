$ErrorActionPreference = 'Stop'

Write-Output "=== hana_kuregame_monthly_champion_points (毎月1日 09:15) ==="
$action = New-ScheduledTaskAction -Execute 'C:\Users\info\dev\kuregame\scripts\run-monthly-champion-points.bat'
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 09:15AM
$principal = New-ScheduledTaskPrincipal -UserId 'info' -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -RunOnlyIfNetworkAvailable
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false
Register-ScheduledTask -TaskName 'hana_kuregame_monthly_champion_points' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Output "OK"

Write-Output ""
Write-Output "=== Final state ==="
$t = Get-ScheduledTask -TaskName 'hana_kuregame_monthly_champion_points'
Write-Output "$($t.TaskName) | State=$($t.State)"
