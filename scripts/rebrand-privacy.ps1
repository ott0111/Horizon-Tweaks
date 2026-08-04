$content = Get-Content 'website/app/(site)/privacy/page.tsx' -Raw
Write-Host ('File size: ' + $content.Length + ' chars')

# Replace specific multi-word patterns first
$replacements = @(
    @{old = '"Impulse,'; new = '"Impulse,'},
    @{old = 'Wave Optimizations'; new = 'Horizon Tweaks'},
    @{old = 'Wave Tweaks'; new = 'Horizon Tweaks'},
    @{old = ' by Impulse'; new = ' by Impulse'},
    @{old = ' of Impulse '; new = ' of Impulse '},
    @{old = ' with Impulse'; new = ' with Impulse'},
    @{old = ' to Impulse'; new = ' to Impulse'},
    @{old = ' from Impulse'; new = ' from Impulse'},
    @{old = 'the Impulse technician'; new = 'the Impulse technician'},
    @{old = 'The Impulse technician'; new = 'The Impulse technician'},
    @{old = 'No Impulse technician'; new = 'No Impulse technician'},
    @{old = 'a Impulse technician'; new = 'a Impulse technician'},
    @{old = 'All Impulse technicians'; new = 'All Impulse technicians'},
    @{old = 'Our Impulse technicians'; new = 'Our Impulse technicians'},
    @{old = 'Impulse technicians'; new = 'Impulse technicians'},
    @{old = 'Impulse Party'; new = 'Impulse Party'},
    @{old = 'Impulse Parties'; new = 'Impulse Parties'},
    @{old = '"Impulse Marks"'; new = '"Impulse Marks"'},
    @{old = 'Impulse Mark'; new = 'Impulse Mark'},
    @{old = 'Horizon logo'; new = 'Horizon logo'},
    @{old = "Impulse's"; new = "Impulse's"},
    @{old = 'Impulse&apos;s'; new = 'Impulse&apos;s'},
    @{old = ' the Impulse website'; new = ' the Impulse website'},
    @{old = ' on Impulse website'; new = ' on Impulse website'}
)

# Apply specific replacements first (more specific patterns)
foreach ($r in $replacements) {
    $content = $content -replace $r.old, $r.new
}

# Remove escaped quotes and special chars by replacing whole word Impulse
$content = $content -replace '\bLinear\b', 'Impulse'

# Verify
$remaining = [regex]::Matches($content, '\bLinear\b').Count
Write-Host ('Remaining Impulse references: ' + $remaining)

Set-Content 'website/app/(site)/privacy/page.tsx' $content -Encoding UTF8
Write-Host 'File saved successfully.'

# Verify result
$verify = Get-Content 'website/app/(site)/privacy/page.tsx' -Raw
$linearCount = [regex]::Matches($verify, '\bLinear\b').Count
$summitCount = [regex]::Matches($verify, '\bSummit\b').Count
Write-Host ('After replacement - Impulse: ' + $linearCount + ', Impulse: ' + $summitCount)
