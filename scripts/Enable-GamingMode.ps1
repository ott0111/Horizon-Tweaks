<#
.SYNOPSIS
    Enables Windows Game Mode and disables fullscreen optimizations.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

if ($Restore) {
    reg.exe import "`"$Restore`"" | Out-Null
    return
}

if ($Snapshot) {
    reg.exe export "`"HKCU\Software\Microsoft\GameBar`"" "`"$Snapshot`"" /y | Out-Null
}

New-Item -Path "HKCU:\Software\Microsoft\GameBar" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AllowAutoGameMode" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force

# Disable fullscreen optimizations globally
New-Item -Path "HKCU:\System\GameConfigStore" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type DWord -Force

Write-Host "Gaming mode enabled."
