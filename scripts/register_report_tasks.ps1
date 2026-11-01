$ErrorActionPreference = 'Stop'

Write-Output "=== 1. hana_kuregame_weekly_report (毎週月曜 09:00) ==="
$weeklyAction = New-ScheduledTaskAction -Execute 'C:\Users\info\dev\kuregame\scripts\run-weekly-report.bat'
$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 09:00AM
$principal = New-ScheduledTaskPrincipal -UserId 'info' -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -RunOnlyIfNetworkAvailable
$settings.DisallowStartIfOnBatteries = $false
$settings.StopIfGoingOnBatteries = $false
Register-ScheduledTask -TaskName 'hana_kuregame_weekly_report' -Action $weeklyAction -Trigger $weeklyTrigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Output "OK"

Write-Output "=== 2. hana_kuregame_monthly_report (毎月1日 09:00) ==="
$monthlyAction = New-ScheduledTaskAction -Execute 'C:\Users\info\dev\kuregame\scripts\run-monthly-report.bat'
$monthlyTrigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 09:00AM
$settings2 = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -RunOnlyIfNetworkAvailable
$settings2.DisallowStartIfOnBatteries = $false
$settings2.StopIfGoingOnBatteries = $false
Register-ScheduledTask -TaskName 'hana_kuregame_monthly_report' -Action $monthlyAction -Trigger $monthlyTrigger -Principal $principal -Settings $settings2 -Force | Out-Null
Write-Output "OK"

Write-Output ""
Write-Output "=== Final state ==="
foreach ($name in @('hana_kuregame_weekly_report','hana_kuregame_monthly_report')) {
  $t = Get-ScheduledTask -TaskName $name
  Write-Output "$name | State=$($t.State)"
}
