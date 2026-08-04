<#
.SYNOPSIS
    Disables Windows features that add overhead.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

$features = @("Microsoft-Windows-Subsystem-Linux","VirtualMachinePlatform","Microsoft-Hyper-V-All")

if ($Restore) {
    $data = Get-Content $Restore | ConvertFrom-Json
    foreach ($f in $data) {
        if ($f.State -eq "Enabled") {
            Enable-WindowsOptionalFeature -Online -FeatureName $f.Name -NoRestart -ErrorAction SilentlyContinue
        } else {
            Disable-WindowsOptionalFeature -Online -FeatureName $f.Name -NoRestart -ErrorAction SilentlyContinue
        }
    }
    return
}

if ($Snapshot) {
    $state = $features | ForEach-Object {
        $f = Get-WindowsOptionalFeature -Online -FeatureName $_ -ErrorAction SilentlyContinue
        [PSCustomObject]@{ Name = $_; State = $f.State }
    }
    $state | ConvertTo-Json | Set-Content $Snapshot
}

foreach ($f in $features) {
    Disable-WindowsOptionalFeature -Online -FeatureName $f -NoRestart -ErrorAction SilentlyContinue | Out-Null
}

Write-Host "Windows features configured."
