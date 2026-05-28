# Draft

Draft is a focused Windows Markdown editor with live preview, save snapshots, a floating formatting toolbar, and a calm desktop workspace.

Current version: `2.0.0`

![Draft main workspace](Documentation/Assets/app-preview.png)

## For Users

### What Draft Is

Draft gives you a local Markdown workspace with three modes:

- **Editor** for distraction-light writing.
- **Split** for writing and previewing side by side.
- **Preview** for reading the rendered document.

It works with normal Markdown and text files on your Windows machine. Your files
stay local unless you choose to put them somewhere else.

### Download and Install

Get the latest Windows release from:

https://github.com/mefabc24/Draft/releases/latest

Release downloads normally include:

- `Draft-Setup-v<version>.exe` for the installed app.
- `mefabc24.Draft-win-Portable.zip` for the portable app.

Automatic update checks are available in installed Draft releases. Portable or
development builds may show that updates are not available.

### Highlights

- Three workspace modes: **Editor**, **Split**, and **Preview** for writing, editing, and reading Markdown.
- Live Markdown preview with support for GitHub-flavored Markdown, tables, task lists, raw HTML, and highlighted code blocks.
- Multiple preview themes, including Draft Dark, Assistant Dark, and Repository Dark.
- Floating Markdown Toolbar for quickly formatting content in both the editor and the rendered preview.
- Preview editing support for editing the Markdown source behind selected rendered content.
- Quick Insert Menu for adding common Markdown elements like headings, lists, images, links, tables, code blocks, quotes, and dividers.
- Flexible scroll sync options, including two-way sync, editor-to-preview sync, preview-to-editor sync, and follow-edited-section behavior.
- Save Snapshot System with separate restore points for the last manual save and the latest autosave.

### Feature Preview

#### Floating Markdown Toolbar

Quickly format Markdown in both the editor and the rendered preview.

![Floating Markdown Toolbar](Documentation/Assets/floating-markdown-toolbar.png)

#### Quick Insert Menu

Insert common Markdown blocks without remembering the exact syntax.

![Quick Insert Menu](Documentation/Assets/quick-insert-menu.png)

#### Save Snapshots

Restore either the last manual save or the latest autosave.

![Save Snapshot Controls](Documentation/Assets/snapshot-controls.png)

### Saving and Recovery

Draft supports manual save, autosave, and optional save-on-focus-lost behavior.

For each file, Draft keeps separate restore points for:

- The last manual save.
- The latest autosave.

This means you can recover recent work without overwriting the intentional save
point you created manually.

### Settings

Draft includes settings for:

- Startup behavior, update checks, autosave, save-on-focus-lost, and close
  confirmations.
- Editor typography, layout, Markdown syntax highlighting, whitespace display,
  indentation, cursor style, and pairing behavior.
- Preview theme and external-link confirmation.
- App theme, status bar visibility, and toolbar/control bar position.
- Default save location and optional `.txt` file association.
- A shortcuts page that lists the main keyboard shortcuts.
- Version and update controls.

### Useful Shortcuts

#### General
```text
Ctrl + S              Save file
Ctrl + Z              Undo
Ctrl + Shift + Z      Redo
Ctrl + D              Duplicate current line
Enter                 Continue the current Markdown list or quote
```

#### Floating Markdown Toolbar (FMT)
```text
Ctrl + B              Bold
Ctrl + I              Italic
Ctrl + Shift + X      Strikethrough
Ctrl + E              Inline code
Ctrl + K              Link
Ctrl + Alt + I        Image
Ctrl + 1..6           Heading 1 through Heading 6
Ctrl + Shift + E      Edit the Markdown behind selected preview content
```

#### Quick Insert Menu (QIM)
```text
Shift + Left Click    Insert from Quick Insert and keep the menu open
```

## For Developers

### Architecture

Draft is a Windows desktop app with a native WPF shell and a React workspace
embedded through WebView2.

- `Draft.Wpf` handles the desktop window, startup flow, local files, settings,
  autosave, snapshots, update checks, packaging hooks, and Windows integration.
- `Draft.Web` handles the Monaco editor, Markdown preview, preview themes,
  Floating Markdown Toolbar, Quick Insert Menu, and editor-facing interactions.

### Tech Stack

- WPF on `net10.0-windows`
- WebView2
- Velopack
- React 19
- TypeScript 6
- Vite 8
- Monaco Editor
- `react-markdown` with `remark-gfm`
- `rehype-raw` for Markdown HTML support
- `rehype-pretty-code` for highlighted code previews

### Repository Structure

```text
Draft.Web/        React, TypeScript, Vite, Monaco, preview, toolbar, themes
Draft.Wpf/        WPF desktop host, WebView2 shell, settings, saves, packaging
Documentation/    Release and versioning documentation
Scripts/          Automation scripts for versioning and release packaging
Licenses/         Third-party license files
Releases/         Generated Velopack release artifacts
```

`Releases/` is generated output and should not be committed.

### Prerequisites

Install these tools before building the app:

```text
Windows
.NET SDK with net10.0-windows support
Node.js and npm
WebView2 Runtime
Velopack CLI, only needed for creating releases
```

### Development

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

### Useful Commands

```powershell
# Web checks
cd Draft.Web
npm run lint
npm run build

# Desktop build
cd ..
dotnet build Draft.Wpf/Draft.slnx

# Update version fields
.\Scripts\update-version.ps1 -Version 2.0.0

# Create a Windows release
.\Scripts\create-release.ps1
```

### Releasing

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

### Documentation

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
