# Draft

Draft is a Windows desktop Markdown editor with a native WPF shell and a web-based editing workspace. The app combines Windows integration, local file handling, and packaging through the desktop host with a React-powered editor and preview experience embedded through WebView2.

## Features

- Markdown editing with a Monaco-based editor
- Live Markdown preview with GitHub-flavored Markdown support
- Editor, split, and preview-focused workspace modes
- Configurable editor and preview settings
- Local file handling from the Windows desktop app
- Windows installer, portable package, and update feed powered by Velopack

## Repository Structure

```text
Draft.Web/       React, TypeScript, Vite, and Monaco workspace UI
Draft.Wpf/       Native Windows WPF host using WebView2
Documentation/   Release and versioning documentation
Scripts/         Automation scripts, including release packaging
Releases/        Generated local release artifacts
```

`Releases/` is generated output and should not be committed to the repository.

## Projects

### Draft.Web

`Draft.Web` contains the web-based workspace UI. It owns the editor-facing experience, including the Markdown editor, preview pane, view modes, and WebView message handling.

See `Draft.Web/README.md` for more details.

### Draft.Wpf

`Draft.Wpf` contains the native Windows desktop host. It owns the application shell, WebView2 hosting, startup behavior, settings windows, local integration, and release packaging hooks.

See `Draft.Wpf/README.md` for more details.

## Prerequisites

Install the following tools before building the app:

```text
Node.js and npm
.NET SDK
Velopack CLI, for creating releases
```

The desktop app targets Windows and uses WPF, WebView2, and `net10.0-windows`.

## Development

Install the web dependencies:

```powershell
cd Draft.Web
npm install
```

Run the web workspace in development mode:

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

For packaged builds, the web app must be built first because `Draft.Wpf` includes `Draft.Web/dist` in its publish output.

## Releasing

Version fields are documented in:

```text
Documentation/VERSIONING.md
```

The release process is documented in:

```text
Documentation/RELEASING.md
```

Create a Windows release from the repository root:

```powershell
.\Scripts\create-release.ps1
```

Generated release files are written to:

```text
Releases/
```

Upload the generated files from `Releases/` as GitHub Release assets. They do not need to be committed to Git.

## Documentation

- `Documentation/VERSIONING.md` lists every version field that should be updated for a release.
- `Documentation/RELEASING.md` describes how to create and publish a release.
- `Draft.Web/README.md` describes the web workspace.
- `Draft.Wpf/README.md` describes the Windows desktop host.

## License

Draft is licensed under the GNU General Public License v3.0. See `LICENSE` for the full license text.

Bundled fonts remain under their original third-party licenses. See `THIRD_PARTY_NOTICES.md` and `Licenses/OFL-1.1.txt` for details.

## Credits

Application icons are based on assets from [Icons8](https://icons8.com/).
