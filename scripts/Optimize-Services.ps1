<#
.SYNOPSIS
    Disables unnecessary Windows services for gaming.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

$services = @("DiagTrack","dmwappushservice","WerSvc","PcaSvc","SysMain","WSearch")

if ($Restore) {
    $data = Get-Content $Restore | ConvertFrom-Json
    foreach ($s in $data) {
        Set-Service -Name $s.Name -StartupType $s.StartType -ErrorAction SilentlyContinue
        if ($s.Status -eq "Running") { Start-Service -Name $s.Name -ErrorAction SilentlyContinue }
    }
    return
}

if ($Snapshot) {
    $state = $services | ForEach-Object {
        $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
        [PSCustomObject]@{ Name = $_; StartType = $svc.StartType; Status = $svc.Status }
    }
    $state | ConvertTo-Json | Set-Content $Snapshot
}

foreach ($name in $services) {
    Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
    Set-Service -Name $name -StartupType Disabled -ErrorAction SilentlyContinue
}

Write-Host "Services optimized."
