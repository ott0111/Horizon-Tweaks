<#
.SYNOPSIS
    Disables Windows telemetry and diagnostic data collection.
.PARAMETER Snapshot
    Exports current registry state before modification.
.PARAMETER Restore
    Restores registry from a .reg snapshot.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

$ErrorActionPreference = "Stop"

$keys = @(
    "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
)

if ($Restore) {
    reg.exe import "`"$Restore`"" | Out-Null
    Write-Host "Telemetry settings restored."
    return
}

if ($Snapshot) {
    foreach ($k in $keys) {
        $file = Join-Path $Snapshot ($k.Replace('\','_') + ".reg")
        reg.exe export "`"$k`"" "`"$file`"" /y 2>$null | Out-Null
    }
    Write-Host "Telemetry snapshot saved."
}

# Apply
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force

New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" -Name "AllowTelemetry" -Value 0 -Type DWord -Force

Write-Host "Telemetry disabled."
