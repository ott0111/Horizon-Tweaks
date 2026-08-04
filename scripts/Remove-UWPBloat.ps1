<#
.SYNOPSIS
    Removes non-essential UWP apps.
#>
[CmdletBinding()]
param(
    [string]$Snapshot,
    [string]$Restore
)

$apps = @(
    "Microsoft.Windows.Photos",
    "Microsoft.ZuneMusic",
    "Microsoft.ZuneVideo",
    "Microsoft.WindowsMaps",
    "Microsoft.WindowsMail",
    "Microsoft.People",
    "Microsoft.BingWeather",
    "Microsoft.Office.OneNote"
)

if ($Restore) {
    $list = Get-Content $Snapshot
    foreach ($a in $list) {
        Add-AppxPackage -DisableDevelopmentMode -Register "$env:SystemRoot\SystemApps\$a\AppxManifest.xml" -ErrorAction SilentlyContinue
    }
    return
}

if ($Snapshot) {
    $apps | Set-Content $Snapshot
}

foreach ($a in $apps) {
    Get-AppxPackage -AllUsers $a | Remove-AppxPackage -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online | Where-Object {$_.DisplayName -eq $a} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
}

Write-Host "UWP bloatware removed."
