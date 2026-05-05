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
dotnet publish $wpfProject -c Release --self-contained -r $Runtime

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

$setupFiles = Get-ChildItem -LiteralPath $releaseDir -Filter "*Setup.exe" -File
if ($setupFiles.Count -eq 1 -and $setupFiles[0].Name -ne "DraftSetup.exe") {
    $originalSetupName = $setupFiles[0].Name
    Rename-Item -LiteralPath $setupFiles[0].FullName -NewName "DraftSetup.exe" -Force

    $assetsManifestPath = Join-Path $releaseDir "assets.win.json"
    if (Test-Path -LiteralPath $assetsManifestPath) {
        $assetsManifest = Get-Content -LiteralPath $assetsManifestPath -Raw | ConvertFrom-Json
        foreach ($asset in $assetsManifest) {
            if ($asset.Type -eq "Installer" -and $asset.RelativeFileName -eq $originalSetupName) {
                $asset.RelativeFileName = "DraftSetup.exe"
            }
        }

        $assetsManifest | ConvertTo-Json -Compress | Set-Content -LiteralPath $assetsManifestPath -NoNewline
    }
}
elseif ($setupFiles.Count -gt 1) {
    Write-Warning "Found multiple setup installers in $releaseDir. Skipping automatic rename to DraftSetup.exe."
}

Write-Host "Release created in: $releaseDir" -ForegroundColor Green
