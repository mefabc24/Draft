# Draft Releases

Draft uses Velopack for the primary Windows installer and update packages.
The active release flow is automated by `Scripts/create-release.ps1`.

Markdown file associations are registered automatically by Draft's Velopack
install/update hooks. Plain text `.txt` association is an opt-in setting in
Draft's General settings page.

Create a release from the repository root:

```powershell
.\Scripts\create-release.ps1
```

Optionally override the version:

```powershell
.\Scripts\create-release.ps1 -Version 1.0.1
```

The script builds `Draft.Web`, publishes `Draft.Wpf`, packages Velopack assets
with `--packId mefabc24.Draft`, `--packTitle Draft`, and `--packAuthors mefabc24`,
then renames the generated setup executable to `DraftSetup.exe`.

Publish all generated files from `Releases` to a GitHub Release tagged with the
same version prefixed by `v`, for example `v1.0.0`. Upload the full Velopack
asset set, not only `DraftSetup.exe`, because update checks need the feed and
package files too.
