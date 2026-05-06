param(
    [Parameter(Mandatory = $false)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$wpfProject = Join-Path $root "Draft.Wpf\Draft.csproj"
$webPackage = Join-Path $root "Draft.Web\package.json"
$webPackageLock = Join-Path $root "Draft.Web\package-lock.json"

function Get-CurrentVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $text = [System.IO.File]::ReadAllText($Path)
    $match = [regex]::Match($text, '<Version>([^<]+)</Version>')

    if (-not $match.Success) {
        throw "Unable to find current version in Draft.Wpf project."
    }

    $match.Groups[1].Value
}

$currentVersion = Get-CurrentVersion -Path $wpfProject
Write-Host "Current version: $currentVersion" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = Read-Host "New version"
}

if ($Version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
    throw "Version must use semantic version format, for example 1.1.0 or 1.1.0-beta.1."
}

$binaryVersion = $Version
if ($Version -match '^(\d+\.\d+\.\d+(?:\.\d+)?)') {
    $binaryVersion = $Matches[1]
}

function Update-TextFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Update
    )

    $text = [System.IO.File]::ReadAllText($Path)
    $updated = & $Update $text

    $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
}

function Replace-Required {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$Pattern,

        [Parameter(Mandatory = $true)]
        [string]$Replacement,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    if ($Text -notmatch $Pattern) {
        throw "Unable to find $Description."
    }

    [regex]::Replace($Text, $Pattern, $Replacement, 1)
}

function Replace-VersionFieldOccurrences {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,

        [Parameter(Mandatory = $true)]
        [string]$NewVersion,

        [Parameter(Mandatory = $true)]
        [int]$Count,

        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $seen = [ref]0
    $updated = [regex]::Replace(
        $Text,
        '("version"\s*:\s*")[^"]+(")',
        {
            param($match)

            $seen.Value++
            if ($seen.Value -le $Count) {
                return $match.Groups[1].Value + $NewVersion + $match.Groups[2].Value
            }

            $match.Value
        })

    if ($seen.Value -lt $Count) {
        throw "Unable to find $Count version field(s) for $Description."
    }

    $updated
}

Write-Host "Updating Draft.Wpf version to $Version..." -ForegroundColor Cyan
Update-TextFile -Path $wpfProject -Update {
    param([string]$text)

    $text = Replace-Required $text '<Version>[^<]+</Version>' "<Version>$Version</Version>" "Draft.Wpf project Version"
    $text = Replace-Required $text '<AssemblyVersion>[^<]+</AssemblyVersion>' "<AssemblyVersion>$binaryVersion</AssemblyVersion>" "Draft.Wpf project AssemblyVersion"
    $text = Replace-Required $text '<FileVersion>[^<]+</FileVersion>' "<FileVersion>$binaryVersion</FileVersion>" "Draft.Wpf project FileVersion"
    $text
}

Write-Host "Updating Draft.Web package version to $Version..." -ForegroundColor Cyan
Update-TextFile -Path $webPackage -Update {
    param([string]$text)

    Replace-VersionFieldOccurrences $text $Version 1 "Draft.Web package version"
}

Write-Host "Updating Draft.Web package-lock version to $Version..." -ForegroundColor Cyan
Update-TextFile -Path $webPackageLock -Update {
    param([string]$text)

    Replace-VersionFieldOccurrences $text $Version 2 "Draft.Web package-lock root versions"
}

Write-Host "Version updated to $Version." -ForegroundColor Green
