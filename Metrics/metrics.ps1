[CmdletBinding()]
param(
    [ValidateRange(5, 50)]
    [int]$TopFileCount = 15
)

$ScriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
$ScriptDirectory = Split-Path -Parent $ScriptPath
$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $ScriptDirectory '..')).Path
$MetricsDirectory = Join-Path $RepositoryRoot 'Metrics'
$MetricsReportsDirectory = Join-Path $MetricsDirectory 'Reports'
$InvariantCulture = [System.Globalization.CultureInfo]::InvariantCulture
$GitSafeDirectory = $RepositoryRoot.Replace('\', '/')

$LanguageLabels = @{
    '.cs'      = 'C#'
    '.css'     = 'CSS'
    '.html'    = 'HTML'
    '.js'      = 'JavaScript'
    '.jsx'     = 'JavaScript React'
    '.json'    = 'JSON'
    '.md'      = 'Markdown'
    '.mjs'     = 'JavaScript Module'
    '.ps1'     = 'PowerShell'
    '.props'   = 'MSBuild Props'
    '.targets' = 'MSBuild Targets'
    '.ts'      = 'TypeScript'
    '.tsx'     = 'TypeScript React'
    '.xaml'    = 'XAML'
    '.xml'     = 'XML'
    '.yaml'    = 'YAML'
    '.yml'     = 'YAML'
}

$IncludedExtensions = @($LanguageLabels.Keys)
$AssetExtensions = @(
    '.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp',
    '.eot', '.otf', '.ttf', '.woff', '.woff2'
)
$ExcludedMetricFileNames = @(
    'package-lock.json',
    'packages.lock.json',
    'pnpm-lock.yaml',
    'yarn.lock'
)
$ExcludedFolderNames = @(
    '.agents',
    '.build-check',
    '.dotnet-home',
    '.git',
    '.idea',
    '.verify',
    '.vs',
    'bin',
    'build',
    'coverage',
    'dist',
    'node_modules',
    'obj',
    'out',
    'packages',
    'Reports'
)

$IncludedExtensionSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($Extension in $IncludedExtensions) {
    [void]$IncludedExtensionSet.Add($Extension)
}

$AssetExtensionSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($Extension in $AssetExtensions) {
    [void]$AssetExtensionSet.Add($Extension)
}

$ExcludedFolderSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($FolderName in $ExcludedFolderNames) {
    [void]$ExcludedFolderSet.Add($FolderName)
}

function Get-FallbackProjectFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        $Items = Get-ChildItem -LiteralPath $Path -Force -ErrorAction Stop
    }
    catch {
        Write-Warning "Skipping unreadable folder '$Path': $($_.Exception.Message)"
        return
    }

    foreach ($Item in $Items) {
        if ($Item.PSIsContainer) {
            if ($ExcludedFolderSet.Contains($Item.Name)) {
                continue
            }

            Get-FallbackProjectFiles -Path $Item.FullName
            continue
        }

        $Item
    }
}

function Get-ProjectFiles {
    try {
        $GitPaths = @(& git -c "safe.directory=$GitSafeDirectory" -C $RepositoryRoot ls-files --cached --others --exclude-standard 2>$null)

        if ($LASTEXITCODE -eq 0 -and $GitPaths.Count -gt 0) {
            foreach ($GitPath in $GitPaths) {
                $FullPath = Join-Path $RepositoryRoot $GitPath

                if (Test-Path -LiteralPath $FullPath -PathType Leaf) {
                    Get-Item -LiteralPath $FullPath
                }
            }

            return
        }
    }
    catch {
        Write-Verbose "Git file discovery unavailable: $($_.Exception.Message)"
    }

    Get-FallbackProjectFiles -Path $RepositoryRoot
}

function Get-RelativeProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FullName
    )

    $RelativePath = $FullName.Substring($RepositoryRoot.Length).TrimStart([char[]]@('\', '/'))
    $RelativePath.Replace('\', '/')
}

function Remove-DelimitedCommentsFromLines {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Lines,

        [Parameter(Mandatory = $true)]
        [string]$BlockStart,

        [Parameter(Mandatory = $true)]
        [string]$BlockEnd,

        [string]$SingleLineMarker = ''
    )

    $CleanLines = [System.Collections.Generic.List[string]]::new()
    $InsideBlockComment = $false

    foreach ($Line in $Lines) {
        $Remaining = $Line
        $CleanLine = ''

        while ($Remaining.Length -gt 0) {
            if ($InsideBlockComment) {
                $BlockEndIndex = $Remaining.IndexOf($BlockEnd, [System.StringComparison]::Ordinal)

                if ($BlockEndIndex -lt 0) {
                    $Remaining = ''
                    continue
                }

                $Remaining = $Remaining.Substring($BlockEndIndex + $BlockEnd.Length)
                $InsideBlockComment = $false
                continue
            }

            $SingleLineIndex = -1
            if (-not [string]::IsNullOrEmpty($SingleLineMarker)) {
                $SingleLineIndex = $Remaining.IndexOf($SingleLineMarker, [System.StringComparison]::Ordinal)
            }

            $BlockStartIndex = $Remaining.IndexOf($BlockStart, [System.StringComparison]::Ordinal)

            if ($SingleLineIndex -ge 0 -and ($BlockStartIndex -lt 0 -or $SingleLineIndex -lt $BlockStartIndex)) {
                if ($SingleLineIndex -gt 0) {
                    $CleanLine += $Remaining.Substring(0, $SingleLineIndex)
                }

                $Remaining = ''
                continue
            }

            if ($BlockStartIndex -ge 0) {
                if ($BlockStartIndex -gt 0) {
                    $CleanLine += $Remaining.Substring(0, $BlockStartIndex)
                }

                $AfterBlockStart = $BlockStartIndex + $BlockStart.Length
                $BlockEndIndex = $Remaining.IndexOf($BlockEnd, $AfterBlockStart, [System.StringComparison]::Ordinal)

                if ($BlockEndIndex -ge 0) {
                    $Remaining = $Remaining.Substring($BlockEndIndex + $BlockEnd.Length)
                }
                else {
                    $InsideBlockComment = $true
                    $Remaining = ''
                }

                continue
            }

            $CleanLine += $Remaining
            $Remaining = ''
        }

        [void]$CleanLines.Add($CleanLine)
    }

    $CleanLines.ToArray()
}

function Remove-CommentsFromLines {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Lines,

        [Parameter(Mandatory = $true)]
        [string]$Extension
    )

    switch ($Extension.ToLowerInvariant()) {
        { $_ -in @('.cs', '.js', '.jsx', '.mjs', '.ts', '.tsx') } {
            return @(Remove-DelimitedCommentsFromLines -Lines $Lines -BlockStart '/*' -BlockEnd '*/' -SingleLineMarker '//')
        }
        '.css' {
            return @(Remove-DelimitedCommentsFromLines -Lines $Lines -BlockStart '/*' -BlockEnd '*/')
        }
        '.ps1' {
            return @(Remove-DelimitedCommentsFromLines -Lines $Lines -BlockStart '<#' -BlockEnd '#>' -SingleLineMarker '#')
        }
        { $_ -in @('.html', '.md', '.xaml', '.xml') } {
            return @(Remove-DelimitedCommentsFromLines -Lines $Lines -BlockStart '<!--' -BlockEnd '-->')
        }
        { $_ -in @('.yaml', '.yml') } {
            return @($Lines | ForEach-Object {
                $CommentIndex = $_.IndexOf('#', [System.StringComparison]::Ordinal)
                if ($CommentIndex -ge 0) { $_.Substring(0, $CommentIndex) } else { $_ }
            })
        }
        default {
            return $Lines
        }
    }
}

function Count-NonBlankLines {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    $Count = 0
    foreach ($Line in $Lines) {
        if ($Line.Trim().Length -gt 0) {
            $Count++
        }
    }

    $Count
}

function Measure-ProjectFile {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo]$File
    )

    try {
        $Lines = @([System.IO.File]::ReadAllLines($File.FullName))
        $Text = [System.IO.File]::ReadAllText($File.FullName)
    }
    catch {
        Write-Warning "Skipping unreadable file '$($File.FullName)': $($_.Exception.Message)"
        return $null
    }

    $Extension = $File.Extension.ToLowerInvariant()
    $RelativePath = Get-RelativeProjectPath -FullName $File.FullName
    $PathSegments = @($RelativePath.Split('/'))
    $Area = if ($PathSegments.Count -gt 1) { $PathSegments[0] } else { '(root)' }
    $LinesWithoutComments = @(Remove-CommentsFromLines -Lines $Lines -Extension $Extension)
    $NonBlankLines = Count-NonBlankLines -Lines $Lines
    $CodeLines = Count-NonBlankLines -Lines $LinesWithoutComments
    $TodoMarkers = [regex]::Matches($Text, '(?im)\b(?:TODO|FIXME|HACK|XXX)\b').Count
    $DeclarationCount = 0
    $HeadingCount = 0
    $WordCount = 0

    if ($Extension -eq '.cs') {
        $DeclarationCount = [regex]::Matches(
            $Text,
            '(?m)^\s*(?:(?:public|internal|private|protected|file|static|sealed|abstract|partial|readonly)\s+)*(?:class|record(?:\s+struct)?|struct|interface|enum)\s+[A-Za-z_]\w*').Count
    }
    elseif ($Extension -in @('.js', '.jsx', '.mjs', '.ts', '.tsx')) {
        $DeclarationCount = [regex]::Matches(
            $Text,
            '(?m)^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function)\s+[A-Za-z_$][\w$]*').Count
    }
    elseif ($Extension -eq '.md') {
        $HeadingCount = [regex]::Matches($Text, '(?m)^#{1,6}\s+\S').Count
        $WordCount = [regex]::Matches($Text, "[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*").Count
    }

    [pscustomobject]@{
        Area             = $Area
        Bytes            = [long]$File.Length
        CodeLines        = $CodeLines
        CommentLines     = [Math]::Max(0, $NonBlankLines - $CodeLines)
        DeclarationCount = $DeclarationCount
        Extension        = $Extension
        HeadingCount     = $HeadingCount
        Language         = $LanguageLabels[$Extension]
        LOC              = $Lines.Count
        NonBlankLines    = $NonBlankLines
        RelativePath     = $RelativePath
        TodoMarkers      = $TodoMarkers
        WordCount        = $WordCount
    }
}

function New-MetricSummary {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [object[]]$Metrics
    )

    $Summary = [ordered]@{
        Name              = $Name
        Files             = $Metrics.Count
        Bytes             = [long]0
        LOC               = [long]0
        NonBlankLines     = [long]0
        CodeLines         = [long]0
        CommentLines      = [long]0
        DeclarationCount  = [long]0
        HeadingCount      = [long]0
        TodoMarkers       = [long]0
        WordCount         = [long]0
    }

    foreach ($Metric in $Metrics) {
        $Summary.Bytes += $Metric.Bytes
        $Summary.LOC += $Metric.LOC
        $Summary.NonBlankLines += $Metric.NonBlankLines
        $Summary.CodeLines += $Metric.CodeLines
        $Summary.CommentLines += $Metric.CommentLines
        $Summary.DeclarationCount += $Metric.DeclarationCount
        $Summary.HeadingCount += $Metric.HeadingCount
        $Summary.TodoMarkers += $Metric.TodoMarkers
        $Summary.WordCount += $Metric.WordCount
    }

    [pscustomobject]$Summary
}

function Format-Number {
    param(
        [double]$Value,
        [int]$Decimals = 0
    )

    $Value.ToString("N$Decimals", $InvariantCulture)
}

function Format-Bytes {
    param([long]$Bytes)

    if ($Bytes -ge 1GB) {
        return "$(Format-Number -Value ($Bytes / 1GB) -Decimals 2) GiB"
    }

    if ($Bytes -ge 1MB) {
        return "$(Format-Number -Value ($Bytes / 1MB) -Decimals 2) MiB"
    }

    if ($Bytes -ge 1KB) {
        return "$(Format-Number -Value ($Bytes / 1KB) -Decimals 1) KiB"
    }

    "$(Format-Number -Value $Bytes) B"
}

function Get-Percentage {
    param(
        [double]$Part,
        [double]$Total
    )

    if ($Total -le 0) {
        return 0.0
    }

    [Math]::Round(($Part / $Total) * 100, 1)
}

function Format-Percentage {
    param(
        [double]$Part,
        [double]$Total
    )

    "$(Format-Number -Value (Get-Percentage -Part $Part -Total $Total) -Decimals 1)%"
}

function New-CompositionBar {
    param(
        [double]$Part,
        [double]$Total,
        [int]$Width = 12
    )

    $Filled = if ($Total -gt 0) {
        [Math]::Min($Width, [Math]::Max(0, [Math]::Round(($Part / $Total) * $Width)))
    }
    else {
        0
    }

    $Bar = ('#' * $Filled) + ('-' * ($Width - $Filled))
    '`' + $Bar + '`'
}

function Escape-MarkdownCell {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return ''
    }

    $Value.ToString().Replace('|', '\|').Replace("`r", ' ').Replace("`n", ' ')
}

function Format-CodePath {
    param([string]$Path)

    '`' + (Escape-MarkdownCell -Value $Path) + '`'
}

function Get-Percentile {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [double[]]$Values,

        [ValidateRange(0, 100)]
        [double]$Percentile
    )

    if ($Values.Count -eq 0) {
        return 0
    }

    $SortedValues = @($Values | Sort-Object)
    $Index = [Math]::Ceiling(($Percentile / 100) * $SortedValues.Count) - 1
    $Index = [Math]::Min($SortedValues.Count - 1, [Math]::Max(0, $Index))
    $SortedValues[$Index]
}

function Get-JsonPropertyCount {
    param([AllowNull()][object]$Object)

    if ($null -eq $Object) {
        return 0
    }

    @($Object.PSObject.Properties).Count
}

function Get-LocalizationMetrics {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Surface,

        [Parameter(Mandatory = $true)]
        [string]$Directory
    )

    if (-not (Test-Path -LiteralPath $Directory -PathType Container)) {
        return
    }

    foreach ($File in Get-ChildItem -LiteralPath $Directory -Filter '*.json' -File | Sort-Object Name) {
        try {
            $Dictionary = Get-Content -LiteralPath $File.FullName -Raw | ConvertFrom-Json
            $Meta = $Dictionary.meta
            $Code = if ($null -ne $Meta -and -not [string]::IsNullOrWhiteSpace($Meta.code)) {
                $Meta.code
            }
            else {
                $File.BaseName
            }
            $DisplayName = if ($null -ne $Meta -and -not [string]::IsNullOrWhiteSpace($Meta.displayName)) {
                $Meta.displayName
            }
            else {
                $Code
            }
            $Flag = if ($null -ne $Meta -and -not [string]::IsNullOrWhiteSpace($Meta.flag)) {
                $Meta.flag
            }
            else {
                '-'
            }

            [pscustomobject]@{
                Code        = $Code
                DisplayName = $DisplayName
                Flag        = $Flag
                Keys        = Get-JsonPropertyCount -Object $Dictionary.translations
                Surface     = $Surface
            }
        }
        catch {
            Write-Warning "Skipping invalid localization file '$($File.FullName)': $($_.Exception.Message)"
        }
    }
}

function Get-GitText {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    try {
        $Output = @(& git -c "safe.directory=$GitSafeDirectory" -C $RepositoryRoot @Arguments 2>$null)

        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        ($Output -join "`n").Trim()
    }
    catch {
        $null
    }
}

function Get-GitLines {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $Text = Get-GitText -Arguments $Arguments
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return @()
    }

    @($Text -split "`r?`n")
}

function Add-ReportLine {
    param([AllowEmptyString()][string]$Text = '')

    [void]$ReportLines.Add($Text)
}

New-Item -ItemType Directory -Path $MetricsReportsDirectory -Force | Out-Null

$AllProjectFiles = @(Get-ProjectFiles | Sort-Object FullName -Unique)
$FileMetrics = [System.Collections.Generic.List[object]]::new()

foreach ($File in $AllProjectFiles) {
    if ((-not $IncludedExtensionSet.Contains($File.Extension)) -or ($File.Name -in $ExcludedMetricFileNames)) {
        continue
    }

    $Metric = Measure-ProjectFile -File $File
    if ($null -ne $Metric) {
        [void]$FileMetrics.Add($Metric)
    }
}

$AllMetrics = @($FileMetrics)
$TotalSummary = New-MetricSummary -Name 'Total' -Metrics $AllMetrics
$TotalRepositoryBytes = [long]0
foreach ($File in $AllProjectFiles) {
    $TotalRepositoryBytes += $File.Length
}

$DirectoryCount = @(
    $AllProjectFiles |
        ForEach-Object { Split-Path -Parent (Get-RelativeProjectPath -FullName $_.FullName) } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Sort-Object -Unique
).Count

$ExtensionSummaries = @(
    $AllMetrics |
        Group-Object Extension |
        ForEach-Object { New-MetricSummary -Name $_.Name -Metrics @($_.Group) } |
        Sort-Object CodeLines -Descending
)

$AreaSummaries = @(
    $AllMetrics |
        Group-Object Area |
        ForEach-Object { New-MetricSummary -Name $_.Name -Metrics @($_.Group) } |
        Sort-Object CodeLines -Descending
)

$AllFileTypeSummaries = @(
    $AllProjectFiles |
        Group-Object { if ([string]::IsNullOrWhiteSpace($_.Extension)) { '(none)' } else { $_.Extension.ToLowerInvariant() } } |
        ForEach-Object {
            $Bytes = [long]0
            foreach ($File in $_.Group) { $Bytes += $File.Length }
            [pscustomobject]@{ Extension = $_.Name; Files = $_.Count; Bytes = $Bytes }
        } |
        Sort-Object Files -Descending
)

$AssetSummaries = @(
    $AllProjectFiles |
        Where-Object { $AssetExtensionSet.Contains($_.Extension) } |
        Group-Object { $_.Extension.ToLowerInvariant() } |
        ForEach-Object {
            $Bytes = [long]0
            foreach ($File in $_.Group) { $Bytes += $File.Length }
            [pscustomobject]@{ Extension = $_.Name; Files = $_.Count; Bytes = $Bytes }
        } |
        Sort-Object Files -Descending
)

$LargestSourceFiles = @(
    $AllMetrics |
        Sort-Object `
            @{ Expression = 'LOC'; Descending = $true },
            @{ Expression = 'RelativePath'; Descending = $false } |
        Select-Object -First $TopFileCount
)
$LargestRepositoryFiles = @(
    $AllProjectFiles |
        Sort-Object `
            @{ Expression = 'Length'; Descending = $true },
            @{ Expression = 'FullName'; Descending = $false } |
        Select-Object -First $TopFileCount |
        ForEach-Object {
            [pscustomobject]@{
                Bytes        = $_.Length
                RelativePath = Get-RelativeProjectPath -FullName $_.FullName
            }
        }
)

$LocValues = @($AllMetrics | ForEach-Object { [double]$_.LOC })
$MedianLOC = Get-Percentile -Values $LocValues -Percentile 50
$P90LOC = Get-Percentile -Values $LocValues -Percentile 90
$TestFileCount = @(
    $AllMetrics | Where-Object {
        $_.RelativePath -match '(?i)(^|/)(tests?|__tests__)(/|$)|\.(test|spec)\.'
    }
).Count

$DependencyRows = [System.Collections.Generic.List[object]]::new()
$DependencyDetails = [System.Collections.Generic.List[string]]::new()
$PackageJsonPath = Join-Path $RepositoryRoot 'Draft.Web\package.json'

if (Test-Path -LiteralPath $PackageJsonPath) {
    try {
        $PackageJson = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
        $ProductionDependencies = if ($null -ne $PackageJson.dependencies) {
            @($PackageJson.dependencies.PSObject.Properties)
        }
        else { @() }
        $DevelopmentDependencies = if ($null -ne $PackageJson.devDependencies) {
            @($PackageJson.devDependencies.PSObject.Properties)
        }
        else { @() }
        $NpmScripts = if ($null -ne $PackageJson.scripts) {
            @($PackageJson.scripts.PSObject.Properties)
        }
        else { @() }

        [void]$DependencyRows.Add([pscustomobject]@{
            Development = $DevelopmentDependencies.Count
            Ecosystem   = 'npm'
            Manifest    = 'Draft.Web/package.json'
            Production  = $ProductionDependencies.Count
            Scripts     = $NpmScripts.Count
            Total       = $ProductionDependencies.Count + $DevelopmentDependencies.Count
        })

        foreach ($Dependency in @($ProductionDependencies + $DevelopmentDependencies) | Sort-Object Name -Unique) {
            [void]$DependencyDetails.Add("- ``$($Dependency.Name)``: ``$($Dependency.Value)``")
        }
    }
    catch {
        Write-Warning "Unable to read '$PackageJsonPath': $($_.Exception.Message)"
    }
}

foreach ($ProjectFile in $AllProjectFiles | Where-Object { $_.Extension -eq '.csproj' }) {
    try {
        [xml]$ProjectXml = Get-Content -LiteralPath $ProjectFile.FullName -Raw
        $PackageReferences = @($ProjectXml.SelectNodes("//*[local-name()='PackageReference']"))
        $RelativeManifestPath = Get-RelativeProjectPath -FullName $ProjectFile.FullName

        [void]$DependencyRows.Add([pscustomobject]@{
            Development = 0
            Ecosystem   = 'NuGet'
            Manifest    = $RelativeManifestPath
            Production  = $PackageReferences.Count
            Scripts     = '-'
            Total       = $PackageReferences.Count
        })

        foreach ($PackageReference in $PackageReferences | Sort-Object Include) {
            $Version = $PackageReference.GetAttribute('Version')
            if ([string]::IsNullOrWhiteSpace($Version)) {
                $Version = $PackageReference.Version
            }
            [void]$DependencyDetails.Add("- ``$($PackageReference.Include)``: ``$Version``")
        }
    }
    catch {
        Write-Warning "Unable to read '$($ProjectFile.FullName)': $($_.Exception.Message)"
    }
}

$LocalizationMetrics = @(
    Get-LocalizationMetrics -Surface 'WPF' -Directory (Join-Path $RepositoryRoot 'Draft.Wpf\Resources\Localization')
    Get-LocalizationMetrics -Surface 'Web' -Directory (Join-Path $RepositoryRoot 'Draft.Web\src\localization')
)

$GitBranch = Get-GitText -Arguments @('rev-parse', '--abbrev-ref', 'HEAD')
$GitCommit = Get-GitText -Arguments @('rev-parse', '--short', 'HEAD')
$GitCommitCount = Get-GitText -Arguments @('rev-list', '--count', 'HEAD')
$GitLastCommitDate = Get-GitText -Arguments @('log', '-1', '--format=%cI')
$GitLastCommitSubject = Get-GitText -Arguments @('log', '-1', '--format=%s')
$GitFirstCommitDate = Get-GitText -Arguments @('log', '--max-parents=0', '--format=%cI')
$GitContributorCount = @(Get-GitLines -Arguments @('shortlog', '-sne', 'HEAD')).Count
$GitTagCount = @(Get-GitLines -Arguments @('tag', '--list')).Count
$GitStatusLines = @(Get-GitLines -Arguments @('status', '--porcelain'))
$GeneratedAt = Get-Date

$ReportLines = [System.Collections.Generic.List[string]]::new()
Add-ReportLine '# Draft Project Metrics'
Add-ReportLine ''
Add-ReportLine "> Generated **$($GeneratedAt.ToString('yyyy-MM-dd HH:mm:ss K'))** from ``$($RepositoryRoot.Replace('\', '/'))``."
Add-ReportLine '> The report covers Git-tracked files plus non-ignored untracked files present at generation time.'
Add-ReportLine ''
Add-ReportLine '---'
Add-ReportLine ''
Add-ReportLine '## Overview'
Add-ReportLine ''
Add-ReportLine '| Metric | Value |'
Add-ReportLine '|---|---:|'
Add-ReportLine "| Repository files | **$(Format-Number -Value $AllProjectFiles.Count)** |"
Add-ReportLine "| Measured text/source files | **$(Format-Number -Value $TotalSummary.Files)** |"
Add-ReportLine "| Directories represented | $(Format-Number -Value $DirectoryCount) |"
Add-ReportLine "| Repository size | **$(Format-Bytes -Bytes $TotalRepositoryBytes)** |"
Add-ReportLine "| Measured source size | $(Format-Bytes -Bytes $TotalSummary.Bytes) |"
Add-ReportLine "| Total lines | **$(Format-Number -Value $TotalSummary.LOC)** |"
Add-ReportLine "| Non-blank lines | $(Format-Number -Value $TotalSummary.NonBlankLines) |"
Add-ReportLine "| Code/content lines | **$(Format-Number -Value $TotalSummary.CodeLines)** |"
Add-ReportLine "| Estimated comment-only lines | $(Format-Number -Value $TotalSummary.CommentLines) |"
Add-ReportLine "| Estimated blank lines | $(Format-Number -Value ($TotalSummary.LOC - $TotalSummary.NonBlankLines)) |"
Add-ReportLine "| Code/content density | $(Format-Percentage -Part $TotalSummary.CodeLines -Total $TotalSummary.LOC) |"
Add-ReportLine "| Median file length | $(Format-Number -Value $MedianLOC) lines |"
Add-ReportLine "| 90th percentile file length | $(Format-Number -Value $P90LOC) lines |"
Add-ReportLine "| Test/spec files detected | $(Format-Number -Value $TestFileCount) |"
Add-ReportLine ''

Add-ReportLine '## Codebase composition'
Add-ReportLine ''
Add-ReportLine '| Language / format | Files | Size | Lines | Code/content | Comments | Blank | Share | Composition | Avg. code/file |'
Add-ReportLine '|---|---:|---:|---:|---:|---:|---:|---:|:---:|---:|'
foreach ($Summary in $ExtensionSummaries) {
    $Language = $LanguageLabels[$Summary.Name]
    $BlankLines = $Summary.LOC - $Summary.NonBlankLines
    $AverageCodeLines = if ($Summary.Files -gt 0) { $Summary.CodeLines / $Summary.Files } else { 0 }
    Add-ReportLine "| $(Escape-MarkdownCell -Value $Language) (``$($Summary.Name)``) | $(Format-Number -Value $Summary.Files) | $(Format-Bytes -Bytes $Summary.Bytes) | $(Format-Number -Value $Summary.LOC) | **$(Format-Number -Value $Summary.CodeLines)** | $(Format-Number -Value $Summary.CommentLines) | $(Format-Number -Value $BlankLines) | $(Format-Percentage -Part $Summary.CodeLines -Total $TotalSummary.CodeLines) | $(New-CompositionBar -Part $Summary.CodeLines -Total $TotalSummary.CodeLines) | $(Format-Number -Value $AverageCodeLines -Decimals 1) |"
}
Add-ReportLine ''

Add-ReportLine '## Project areas'
Add-ReportLine ''
Add-ReportLine '| Area | Files | Size | Lines | Code/content | Share | Avg. code/file |'
Add-ReportLine '|---|---:|---:|---:|---:|---:|---:|'
foreach ($Summary in $AreaSummaries) {
    $AverageCodeLines = if ($Summary.Files -gt 0) { $Summary.CodeLines / $Summary.Files } else { 0 }
    Add-ReportLine "| ``$(Escape-MarkdownCell -Value $Summary.Name)`` | $(Format-Number -Value $Summary.Files) | $(Format-Bytes -Bytes $Summary.Bytes) | $(Format-Number -Value $Summary.LOC) | **$(Format-Number -Value $Summary.CodeLines)** | $(Format-Percentage -Part $Summary.CodeLines -Total $TotalSummary.CodeLines) | $(Format-Number -Value $AverageCodeLines -Decimals 1) |"
}
Add-ReportLine ''

Add-ReportLine '## File-size distribution'
Add-ReportLine ''
Add-ReportLine '| Lines per measured file | Files | Share |'
Add-ReportLine '|---|---:|---:|'
$Buckets = @(
    [pscustomobject]@{ Label = '0-50'; Minimum = 0; Maximum = 50 },
    [pscustomobject]@{ Label = '51-100'; Minimum = 51; Maximum = 100 },
    [pscustomobject]@{ Label = '101-250'; Minimum = 101; Maximum = 250 },
    [pscustomobject]@{ Label = '251-500'; Minimum = 251; Maximum = 500 },
    [pscustomobject]@{ Label = '501-1,000'; Minimum = 501; Maximum = 1000 },
    [pscustomobject]@{ Label = '1,001+'; Minimum = 1001; Maximum = [int]::MaxValue }
)
foreach ($Bucket in $Buckets) {
    $BucketCount = @($AllMetrics | Where-Object { $_.LOC -ge $Bucket.Minimum -and $_.LOC -le $Bucket.Maximum }).Count
    Add-ReportLine "| $($Bucket.Label) | $(Format-Number -Value $BucketCount) | $(Format-Percentage -Part $BucketCount -Total $TotalSummary.Files) |"
}
Add-ReportLine ''

Add-ReportLine "## Largest source files (top $TopFileCount)"
Add-ReportLine ''
Add-ReportLine '| # | File | Format | Size | Lines | Code/content | Comments |'
Add-ReportLine '|---:|---|---|---:|---:|---:|---:|'
$Rank = 1
foreach ($Metric in $LargestSourceFiles) {
    Add-ReportLine "| $Rank | $(Format-CodePath -Path $Metric.RelativePath) | $(Escape-MarkdownCell -Value $Metric.Language) | $(Format-Bytes -Bytes $Metric.Bytes) | **$(Format-Number -Value $Metric.LOC)** | $(Format-Number -Value $Metric.CodeLines) | $(Format-Number -Value $Metric.CommentLines) |"
    $Rank++
}
Add-ReportLine ''

Add-ReportLine '## Repository inventory'
Add-ReportLine ''
Add-ReportLine '### Most common file types'
Add-ReportLine ''
Add-ReportLine '| Extension | Files | Size |'
Add-ReportLine '|---|---:|---:|'
foreach ($Summary in $AllFileTypeSummaries | Select-Object -First 20) {
    Add-ReportLine "| ``$(Escape-MarkdownCell -Value $Summary.Extension)`` | $(Format-Number -Value $Summary.Files) | $(Format-Bytes -Bytes $Summary.Bytes) |"
}
Add-ReportLine ''

if ($AssetSummaries.Count -gt 0) {
    Add-ReportLine '### Assets and fonts'
    Add-ReportLine ''
    Add-ReportLine '| Extension | Files | Size |'
    Add-ReportLine '|---|---:|---:|'
    foreach ($Summary in $AssetSummaries) {
        Add-ReportLine "| ``$($Summary.Extension)`` | $(Format-Number -Value $Summary.Files) | $(Format-Bytes -Bytes $Summary.Bytes) |"
    }
    Add-ReportLine ''
}

Add-ReportLine "### Largest repository files (top $TopFileCount)"
Add-ReportLine ''
Add-ReportLine '| # | File | Size |'
Add-ReportLine '|---:|---|---:|'
$Rank = 1
foreach ($File in $LargestRepositoryFiles) {
    Add-ReportLine "| $Rank | $(Format-CodePath -Path $File.RelativePath) | $(Format-Bytes -Bytes $File.Bytes) |"
    $Rank++
}
Add-ReportLine ''

Add-ReportLine '## Code and documentation signals'
Add-ReportLine ''
Add-ReportLine '> Declaration and marker counts are heuristic text matches intended for trend tracking, not compiler-level analysis.'
Add-ReportLine ''
Add-ReportLine '| Signal | Count |'
Add-ReportLine '|---|---:|'
Add-ReportLine "| C# and JS/TS type/function declarations | $(Format-Number -Value $TotalSummary.DeclarationCount) |"
Add-ReportLine "| TODO / FIXME / HACK / XXX markers | $(Format-Number -Value $TotalSummary.TodoMarkers) |"
Add-ReportLine "| Markdown headings | $(Format-Number -Value $TotalSummary.HeadingCount) |"
Add-ReportLine "| Markdown words | $(Format-Number -Value $TotalSummary.WordCount) |"
Add-ReportLine ''

if ($DependencyRows.Count -gt 0) {
    Add-ReportLine '## Dependencies and manifests'
    Add-ReportLine ''
    Add-ReportLine '| Ecosystem | Manifest | Production | Development | Total | Scripts |'
    Add-ReportLine '|---|---|---:|---:|---:|---:|'
    foreach ($DependencyRow in $DependencyRows) {
        Add-ReportLine "| $($DependencyRow.Ecosystem) | $(Format-CodePath -Path $DependencyRow.Manifest) | $(Format-Number -Value $DependencyRow.Production) | $(Format-Number -Value $DependencyRow.Development) | **$(Format-Number -Value $DependencyRow.Total)** | $($DependencyRow.Scripts) |"
    }
    Add-ReportLine ''
    Add-ReportLine '<details>'
    Add-ReportLine '<summary>Dependency versions</summary>'
    Add-ReportLine ''
    foreach ($Detail in $DependencyDetails | Sort-Object -Unique) {
        Add-ReportLine $Detail
    }
    Add-ReportLine ''
    Add-ReportLine '</details>'
    Add-ReportLine ''
}

if ($LocalizationMetrics.Count -gt 0) {
    Add-ReportLine '## Localization coverage'
    Add-ReportLine ''
    Add-ReportLine '| Surface | Language | Display name | Translation keys | Coverage | Flag |'
    Add-ReportLine '|---|---|---|---:|---:|---|'
    foreach ($SurfaceGroup in $LocalizationMetrics | Group-Object Surface | Sort-Object Name) {
        $MaximumKeys = ($SurfaceGroup.Group | Measure-Object Keys -Maximum).Maximum
        foreach ($Language in $SurfaceGroup.Group | Sort-Object Code) {
            Add-ReportLine "| $($Language.Surface) | ``$(Escape-MarkdownCell -Value $Language.Code)`` | $(Escape-MarkdownCell -Value $Language.DisplayName) | $(Format-Number -Value $Language.Keys) | $(Format-Percentage -Part $Language.Keys -Total $MaximumKeys) | ``$(Escape-MarkdownCell -Value $Language.Flag)`` |"
        }
    }
    Add-ReportLine ''
}

if (-not [string]::IsNullOrWhiteSpace($GitBranch)) {
    Add-ReportLine '## Git snapshot'
    Add-ReportLine ''
    Add-ReportLine '| Metric | Value |'
    Add-ReportLine '|---|---|'
    Add-ReportLine "| Branch | ``$(Escape-MarkdownCell -Value $GitBranch)`` |"
    Add-ReportLine "| Commit | ``$(Escape-MarkdownCell -Value $GitCommit)`` |"
    Add-ReportLine "| Total commits | $(Format-Number -Value ([double]$GitCommitCount)) |"
    Add-ReportLine "| Contributors | $(Format-Number -Value $GitContributorCount) |"
    Add-ReportLine "| Tags | $(Format-Number -Value $GitTagCount) |"
    Add-ReportLine "| First commit | $(Escape-MarkdownCell -Value $GitFirstCommitDate) |"
    Add-ReportLine "| Last commit | $(Escape-MarkdownCell -Value $GitLastCommitDate) |"
    Add-ReportLine "| Last subject | $(Escape-MarkdownCell -Value $GitLastCommitSubject) |"
    Add-ReportLine "| Working-tree changes | $(Format-Number -Value $GitStatusLines.Count) |"
    Add-ReportLine ''
}

Add-ReportLine '<details>'
Add-ReportLine '<summary>Methodology and caveats</summary>'
Add-ReportLine ''
Add-ReportLine '- Repository inventory uses `git ls-files --cached --others --exclude-standard` when Git is available.'
Add-ReportLine '- Build outputs, dependencies, generated reports, and other ignored files are excluded.'
Add-ReportLine '- Total lines include blank and comment-only lines. Code/content lines exclude blank lines and recognized comments.'
Add-ReportLine '- Comment removal is language-aware but lexical, so comment-like text inside strings can affect estimates.'
Add-ReportLine '- Binary assets are included in repository size and inventory, but not in line counts.'
Add-ReportLine '- Metrics are a point-in-time snapshot and may include non-ignored uncommitted files.'
Add-ReportLine ''
Add-ReportLine '</details>'

$Timestamp = $GeneratedAt.ToString('yyyyMMdd_HHmmss')
$OutputFile = Join-Path $MetricsReportsDirectory "metrics_$Timestamp.md"
Set-Content -LiteralPath $OutputFile -Value $ReportLines -Encoding UTF8

$ReportLines | ForEach-Object { Write-Output $_ }
Write-Output ''
Write-Output "Saved Markdown metrics to: $OutputFile"
