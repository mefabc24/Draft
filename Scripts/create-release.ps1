param(
    [string]$Version = "",
    [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$webProject = Join-Path $root "Draft.Web"
$wpfProject = Join-Path $root "Draft.Wpf\Draft.csproj"
$wpfProjectDir = Join-Path $root "Draft.Wpf"
$iconPath = Join-Path $root "Draft.Wpf\Assets\Icons\draft.ico"
$releaseDir = Join-Path $root "Releases"

if (-not $Version) {
    [xml]$projectXml = Get-Content -LiteralPath $wpfProject
    $Version = $projectXml.Project.PropertyGroup.Version
}

if (-not $Version) {
    throw "Unable to determine release version from Draft.Wpf\Draft.csproj. Pass -Version explicitly."
}

$binaryVersion = $Version
if ($Version -match '^(\d+\.\d+\.\d+(?:\.\d+)?)') {
    $binaryVersion = $Matches[1]
}

$publishDir = Join-Path $wpfProjectDir "bin\Release\net10.0-windows\$Runtime\publish"

Write-Host "Building Draft.Web..." -ForegroundColor Cyan
Push-Location $webProject
try {
    npm.cmd run build
}
finally {
    Pop-Location
}

Write-Host "Publishing Draft.Wpf $Version for $Runtime..." -ForegroundColor Cyan
dotnet publish $wpfProject `
    -c Release `
    --self-contained `
    -r $Runtime `
    /p:Version=$Version `
    /p:InformationalVersion=$Version `
    /p:AssemblyVersion=$binaryVersion `
    /p:FileVersion=$binaryVersion

if (-not (Test-Path -LiteralPath $publishDir)) {
    throw "Publish directory was not found: $publishDir"
}

Write-Host "Packaging Velopack release $Version..." -ForegroundColor Cyan
vpk pack `
    --packId mefabc24.Draft `
    --packTitle Draft `
    --packAuthors mefabc24 `
    --packVersion $Version `
    --packDir $publishDir `
    --mainExe Draft.exe `
    --icon $iconPath `
    --shortcuts Desktop,StartMenuRoot `
    --outputDir $releaseDir

$versionedSetupName = "Draft-Setup-v$Version.exe"
$assetsManifestPath = Join-Path $releaseDir "assets.win.json"
$installerAsset = $null

if (Test-Path -LiteralPath $assetsManifestPath) {
    $assetsManifest = Get-Content -LiteralPath $assetsManifestPath -Raw | ConvertFrom-Json
    $installerAssets = @($assetsManifest | Where-Object { $_.Type -eq "Installer" })

    if ($installerAssets.Count -eq 1) {
        $installerAsset = $installerAssets[0]
    }
}

if ($installerAsset -ne $null) {
    $originalSetupName = $installerAsset.RelativeFileName
    $originalSetupPath = Join-Path $releaseDir $originalSetupName

    if (-not (Test-Path -LiteralPath $originalSetupPath)) {
        throw "Velopack installer was listed in assets.win.json but was not found: $originalSetupPath"
    }

    if ($originalSetupName -ne $versionedSetupName) {
        Rename-Item -LiteralPath $originalSetupPath -NewName $versionedSetupName -Force
    }

    $installerAsset.RelativeFileName = $versionedSetupName
    $assetsManifestJson = ($assetsManifest | ConvertTo-Json -Compress) + [Environment]::NewLine
    $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($assetsManifestPath, $assetsManifestJson, $utf8NoBom)
}
else {
    $setupFiles = @(Get-ChildItem -LiteralPath $releaseDir -Filter "*Setup.exe" -File)

    if ($setupFiles.Count -eq 1 -and $setupFiles[0].Name -ne $versionedSetupName) {
        Rename-Item -LiteralPath $setupFiles[0].FullName -NewName $versionedSetupName -Force
    }
    elseif ($setupFiles.Count -gt 1) {
        Write-Warning "Found multiple setup installers in $releaseDir. Skipping automatic rename to $versionedSetupName."
    }
}

Write-Host "Release created in: $releaseDir" -ForegroundColor Green
