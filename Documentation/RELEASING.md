# Releasing

Draft uses Velopack for the Windows installer, portable package, and update feed.
The release flow is automated by `Scripts/create-release.ps1`.

For version fields that must be updated before a release, see `Documentation/VERSIONING.md`.

## Prerequisites

Run the release command from Windows PowerShell at the repository root.

The release script expects these tools to be available:

```text
npm
dotnet
vpk
```

`vpk` is the Velopack command line tool.

## Create a Release

From the repository root, run:

```powershell
.\Scripts\create-release.ps1
```

By default, the script reads the release version from:

```text
Draft.Wpf/Draft.csproj
```

Specifically, it uses the `<Version>` property.

You can also pass the version explicitly:

```powershell
.\Scripts\create-release.ps1 -Version <version>
```

The default runtime is:

```text
win-x64
```

To package a different runtime, pass `-Runtime`:

```powershell
.\Scripts\create-release.ps1 -Runtime <runtime>
```

## What the Script Does

The script performs these steps:

1. Builds the web app in `Draft.Web` with `npm.cmd run build`.
2. Publishes the WPF app from `Draft.Wpf/Draft.csproj` with `dotnet publish`.
3. Creates Velopack packages from the WPF publish output.
4. Writes the generated release files to `Releases`.
5. Renames the generated setup executable to `DraftSetup.exe` when there is exactly one setup executable.
6. Updates `Releases/assets.win.json` so the installer entry points to `DraftSetup.exe`.

The WPF publish output is created under:

```text
Draft.Wpf/bin/Release/net10.0-windows/<runtime>/publish
```

This publish folder is an intermediate build output. The files that should be published to users are in `Releases`.

## Release Output

Generated releases are written to:

```text
Releases
```

A normal Windows release contains files like:

```text
Releases/DraftSetup.exe
Releases/mefabc24.Draft-<version>-full.nupkg
Releases/mefabc24.Draft-win-Portable.zip
Releases/RELEASES
Releases/releases.win.json
Releases/assets.win.json
```

Upload the full generated asset set from `Releases`. Do not upload only `DraftSetup.exe`, because update checks need the Velopack feed and package files too.

## GitHub Release

Create a GitHub Release with a tag matching the app version prefixed by `v`:

```text
v<version>
```

Attach all generated files from `Releases` to that GitHub Release.

## File Associations

Markdown file associations are registered automatically by Draft's Velopack install and update hooks.

Plain text `.txt` association is controlled by the opt-in setting in Draft's General settings page.

## Notes

`Releases` contains generated release artifacts. Do not store release documentation in that folder.

Keep release documentation in:

```text
Documentation
```
