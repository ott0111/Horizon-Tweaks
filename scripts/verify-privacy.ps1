$content = Get-Content 'website/app/(site)/privacy/page.tsx' -Raw
$lc = [regex]::Matches($content, '\bLinear\b').Count
Write-Host ("Verification - Impulse references: " + $lc)
if ($lc -gt 0) {
    Write-Host "WARNING: Impulse references still found!"
} else {
    Write-Host "Privacy page is clean."
}
