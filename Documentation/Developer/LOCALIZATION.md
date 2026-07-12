# Localization

Draft keeps native WPF UI text and React/Web UI text in separate localization
files. Add every user-facing display string to the matching JSON file instead
of hardcoding it in XAML, C#, TS, or TSX.

## Files

WPF localization files live in:

```text
Draft.Wpf/Resources/Localization/
```

Web localization files live in:

```text
Draft.Web/src/localization/
```

Each language file uses this shape:

```json
{
  "meta": {
    "code": "de",
    "shortName": "DE",
    "displayName": "Deutsch",
    "englishName": "German",
    "flag": "DE"
  },
  "translations": {
    "common.save": "Save"
  }
}
```

`flag` is optional. Keep `code` lowercase and use the same code in WPF and Web.

## Adding A Language

1. Copy `en.json` in both localization folders.
2. Rename the copies to the new language code, for example `de.json`.
3. Update `meta.code`, `meta.shortName`, `meta.displayName`, and
   `meta.englishName` in both files.
4. Keep every existing translation key in both files.
5. Use the English text as the temporary value for untranslated strings.
6. Translate values inside `translations` gradually.
7. Build `Draft.Web` so the new Web JSON is included in the Vite bundle.
8. Build `Draft.Wpf` so the new WPF JSON is copied to the app output.

After both files exist, Draft discovers the language automatically. The WPF
Settings language ComboBox reads the language display name from WPF metadata.
WPF sends the selected language code to the Web workspace through the settings
message bridge, and Web uses the matching bundled JSON file.

## Fallbacks

Missing keys fall back in this order:

```text
selected language -> English -> key/fallback
```

Do not remove keys from non-English files. If a string has not been translated
yet, leave the English value in place so the UI never becomes blank.

## Validation

Before committing localization changes:

```powershell
cd Draft.Web
npm run build

cd ../Draft.Wpf
dotnet build Draft.csproj
```

If the desktop app is already running and locks `Draft.exe`, build to a separate
output folder:

```powershell
dotnet build Draft.csproj -o ..\.build-check\wpf-localization
```
