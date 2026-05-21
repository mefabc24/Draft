# Draft

Draft is a Windows desktop Markdown editor with a native WPF shell and a React
workspace embedded through WebView2. The desktop host handles files, settings,
autosave, snapshots, update packaging, and Windows integration; the web workspace
owns the Monaco editor, Markdown preview, formatting toolbar, and editor-facing
interaction model.

## Version

The latest stable release is `1.4.0`.
The latest pre-release is `2.0.0-beta.2`.

## Features

- Monaco-based Markdown editor with syntax highlighting, word wrap, line
  numbers, indentation guides, whitespace rendering, cursor settings, tab
  settings, and bracket/quote pairing.
- GitHub-flavored Markdown preview powered by `react-markdown` and `remark-gfm`.
- Editor, split, and preview workspace modes with configurable preview scroll
  sync.
- Floating Markdown Toolbar in the editor and preview for headings, blockquotes,
  code blocks, lists, checklists, bold, italic, strikethrough, inline code, and
  links.
- Native WPF control bar for workspace mode switching, open, save, new document,
  copying the full Markdown source, and settings.
- Native status bar with Markdown/UTF-8 indicators, word count, character count,
  cursor position, selection count, save status, autosave status, and revert
  access.
- Local file handling for Markdown/text documents, default save location
  settings, and optional `.txt` file association.
- Manual saves, autosave, save-on-focus-lost, and saved-version snapshots that
  can be restored through the Revert flow.
- Settings window for general behavior, editor options, preview behavior,
  appearance, update/demo controls, and app metadata.
- Windows installer, portable package, and update feed generation through
  Velopack.

## Tech Stack

- WPF on `net10.0-windows`
- WebView2
- Velopack
- React 19
- TypeScript 6
- Vite 8
- Monaco Editor
- `react-markdown` with `remark-gfm`

## Repository Structure

```text
Draft.Web/        React, TypeScript, Vite, Monaco, preview, toolbar, themes
Draft.Wpf/        WPF desktop host, WebView2 shell, settings, saves, packaging
Documentation/    Release and versioning documentation
Scripts/          Automation scripts for versioning and release packaging
Licenses/         Third-party license files
Releases/         Generated Velopack release artifacts
```

`Releases/` is generated output and should not be committed.

## Prerequisites

Install these tools before building the app:

```text
Windows
.NET SDK with net10.0-windows support
Node.js and npm
WebView2 Runtime
Velopack CLI, only needed for creating releases
```

## Development

Install web dependencies:

```powershell
cd Draft.Web
npm install
```

Run the web workspace in Vite development mode:

```powershell
npm run dev
```

Build the web workspace:

```powershell
npm run build
```

Build the Windows desktop app from the repository root:

```powershell
dotnet build Draft.Wpf/Draft.slnx
```

Run the Windows desktop app:

```powershell
dotnet run --project Draft.Wpf/Draft.csproj
```

For desktop builds and releases, build `Draft.Web` first. `Draft.Wpf` includes
the generated `Draft.Web/dist` files in its output and publish artifacts.

## Useful Commands

```powershell
# Web checks
cd Draft.Web
npm run lint
npm run build

# Desktop build
cd ..
dotnet build Draft.Wpf/Draft.slnx

# Update version fields
.\Scripts\update-version.ps1 -Version 2.0.0-beta

# Create a Windows release
.\Scripts\create-release.ps1
```

## Releasing

Version fields and release steps are documented in:

```text
Documentation/VERSIONING.md
Documentation/RELEASING.md
```

The release script builds the web app, publishes the WPF host, creates Velopack
packages, and writes generated files to:

```text
Releases/
```

Upload the full generated asset set from `Releases/` to the matching GitHub
Release. Do not upload only the setup executable because Velopack updates also
need the feed and package files.

## Documentation

- `Documentation/VERSIONING.md` lists every manually maintained version field.
- `Documentation/RELEASING.md` describes how to create and publish a release.
- `Draft.Web/README.md` describes the web workspace.
- `Draft.Wpf/README.md` describes the Windows desktop host.

## License

Draft is licensed under the GNU General Public License v3.0. See `LICENSE` for
the full license text.

Bundled fonts remain under their original third-party licenses. See
`THIRD_PARTY_NOTICES.md` and `Licenses/OFL-1.1.txt` for details.

## Credits

Application icons are based on assets from [Icons8](https://icons8.com/).
