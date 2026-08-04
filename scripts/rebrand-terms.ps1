$content = Get-Content 'website/app/(site)/terms/page.tsx' -Raw
Write-Host ('File size: ' + $content.Length + ' chars')

# Replace specific multi-word patterns first (order matters - more specific first)
$content = $content -replace '"Impulse,','"Impulse,'
$content = $content -replace 'Wave Optimizations','Horizon Tweaks'
$content = $content -replace 'Wave Tweaks','Horizon Tweaks'
$content = $content -replace ' by Impulse',' by Impulse'
$content = $content -replace ' of Impulse ',' of Impulse '
$content = $content -replace ' with Impulse',' with Impulse'
$content = $content -replace ' to Impulse',' to Impulse'
$content = $content -replace ' from Impulse',' from Impulse'
$content = $content -replace 'the Impulse technician','the Impulse technician'
$content = $content -replace 'The Impulse technician','The Impulse technician'
$content = $content -replace 'No Impulse technician','No Impulse technician'
$content = $content -replace 'a Impulse technician','a Impulse technician'
$content = $content -replace 'All Impulse technicians','All Impulse technicians'
$content = $content -replace 'Our Impulse technicians','Our Impulse technicians'
$content = $content -replace 'Impulse technicians','Impulse technicians'
$content = $content -replace 'Impulse Party','Impulse Party'
$content = $content -replace 'Impulse Parties','Impulse Parties'
$content = $content -replace '"Impulse Marks"','"Impulse Marks"'
$content = $content -replace 'Impulse Mark','Impulse Mark'
$content = $content -replace 'Horizon logo','Horizon logo'
$content = $content -replace "Impulse's","Impulse's"
$content = $content -replace 'Impulse&apos;s','Impulse&apos;s'
$content = $content -replace ' the Impulse website',' the Impulse website'
$content = $content -replace ' on Impulse website',' on Impulse website'

# Then replace whole-word 'Impulse' (not inside words)
$content = $content -replace '\bLinear\b','Impulse'

# Verify
$remaining = [regex]::Matches($content, '\bLinear\b')
Write-Host ('Remaining Impulse references: ' + $remaining.Count)

Set-Content 'website/app/(site)/terms/page.tsx' $content
Write-Host 'File saved successfully.'

# Verify result
$verify = Get-Content 'website/app/(site)/terms/page.tsx' -Raw
$linearCount = [regex]::Matches($verify, '\bLinear\b').Count
$summitCount = [regex]::Matches($verify, '\bSummit\b').Count
Write-Host ('After replacement - Impulse: ' + $linearCount + ', Impulse: ' + $summitCount)
