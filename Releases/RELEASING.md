# Draft Releases

Draft uses Velopack for the primary Windows installer and update packages.
The existing Inno Setup script is kept for reference, but it is not the update
path used by the app.

Markdown file associations are registered automatically by Draft's Velopack
install/update hooks. Plain text `.txt` association is an opt-in setting in
Draft's General settings page.

Build the web bundle and publish Draft before packaging:

```powershell
Push-Location Draft.Web
npm.cmd run build
Pop-Location

dotnet publish Draft.Wpf/Draft.csproj -c Release --self-contained -r win-x64
```

Create a Velopack release package. Keep `--packVersion` in sync with
`Draft.Wpf/Draft.csproj` and publish the assets to a GitHub Release tagged
with the same version prefixed by `v`, for example `v1.0.0`.

```powershell
vpk pack `
  --packId mefabc24.Draft `
  --packTitle Draft `
  --packVersion 1.0.0 `
  --packDir Draft.Wpf/bin/Release/net10.0-windows/win-x64/publish `
  --mainExe Draft.exe `
  --icon Draft.Wpf/Assets/Icons/draft.ico `
  --shortcuts Desktop,StartMenuRoot
```
