@echo off
echo ========================================
echo  Impulse Rebrand - Terms of Service Fixer
echo ========================================
echo.
echo This will replace 'Impulse' with 'Impulse' throughout the terms page.
echo.

set FILE=website\app\(site)\terms\page.tsx

if not exist "%FILE%" (
    echo ERROR: File not found at %FILE%
    pause
    exit /b 1
)

echo File found. Applying replacements...
echo.

powershell -Command ^
"$c = Get-Content '%FILE%' -Raw; " ^
"$countBefore = [regex]::Matches($c, '\bLinear\b').Count; " ^
"Write-Host ('Impulse references found: ' + $countBefore); " ^
"$c = $c -replace '\"Impulse,','\"Impulse,'; " ^
"$c = $c -replace 'Wave Optimizations','Horizon Tweaks'; " ^
"$c = $c -replace 'Wave Tweaks','Horizon Tweaks'; " ^
"$c = $c -replace ' by Impulse',' by Impulse'; " ^
"$c = $c -replace ' of Impulse ',' of Impulse '; " ^
"$c = $c -replace ' with Impulse',' with Impulse'; " ^
"$c = $c -replace ' to Impulse',' to Impulse'; " ^
"$c = $c -replace ' from Impulse',' from Impulse'; " ^
"$c = $c -replace 'the Impulse technician','the Impulse technician'; " ^
"$c = $c -replace 'The Impulse technician','The Impulse technician'; " ^
"$c = $c -replace 'No Impulse technician','No Impulse technician'; " ^
"$c = $c -replace 'a Impulse technician','a Impulse technician'; " ^
"$c = $c -replace 'All Impulse technicians','All Impulse technicians'; " ^
"$c = $c -replace 'Our Impulse technicians','Our Impulse technicians'; " ^
"$c = $c -replace 'Impulse technicians','Impulse technicians'; " ^
"$c = $c -replace 'Impulse Party','Impulse Party'; " ^
"$c = $c -replace 'Impulse Parties','Impulse Parties'; " ^
"$c = $c -replace '\"Impulse Marks\"','\"Impulse Marks\"'; " ^
"$c = $c -replace 'Impulse Mark','Impulse Mark'; " ^
"$c = $c -replace 'Horizon logo','Horizon logo'; " ^
"$c = $c -replace \"Impulse's\",\"Impulse's\"; " ^
"$c = $c -replace 'Impulse&apos;s','Impulse&apos;s'; " ^
"$c = $c -replace ' the Impulse website',' the Impulse website'; " ^
"$c = $c -replace ' on Impulse website',' on Impulse website'; " ^
"$c = $c -replace '\bLinear\b','Impulse'; " ^
"$countAfter = [regex]::Matches($c, '\bLinear\b').Count; " ^
"$summitCount = [regex]::Matches($c, '\bSummit\b').Count; " ^
"Set-Content '%FILE%' $c; " ^
"Write-Host ('Remaining Impulse: ' + $countAfter + ', Impulse inserted: ' + $summitCount); " ^
"Write-Host 'Done!'"

echo.
echo ========================================
echo  If the above shows 0 remaining Impulse
echo  references, the file was updated.
echo ========================================
pause
