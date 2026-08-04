<#
.SYNOPSIS
    Applies low-latency network tweaks.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

$nicPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces"
$nics = Get-ChildItem $nicPath -ErrorAction SilentlyContinue

if ($Restore) {
    reg.exe import "`"$Restore`"" | Out-Null
    return
}

if ($Snapshot) {
    reg.exe export "`"HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters`"" "`"$Snapshot`"" /y | Out-Null
}

foreach ($nic in $nics) {
    Set-ItemProperty -Path $nic.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $nic.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
}

Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "DefaultTTL" -Value 64 -Type DWord -Force -ErrorAction SilentlyContinue

Write-Host "Network optimized."
