# AGENTS.md

## Project Context

Draft is a Windows Markdown editor built with a WPF shell and a Vite React web workspace.

The project is split into:

* `Draft.Wpf/` — WPF desktop shell, dialogs, settings, window logic, WebView2 host
* `Draft.Web/` — Vite React workspace with Monaco editor, Markdown preview, toolbar features, themes, and web UI logic
* `Draft/Instructions/` — implementation plans and prompts for Codex

## General Rules

* Follow the existing architecture and folder structure.
* Prefer clean separation of concerns.
* Keep the code maintainable, readable, and consistent with the surrounding code.
* Do not change unrelated files or behavior.
* Do not redesign UI unless explicitly requested.
* Preserve existing styling unless the task specifically asks for styling changes.
* Reuse existing components, services, hooks, styles, and theme tokens where possible.

## Architecture Preferences

* Prefer package-by-domain / package-by-feature over package-by-type.
* Keep UI, state, commands, services, and utility logic separated.
* Avoid large files with mixed responsibilities.
* Shared code should only go into shared/common folders if it is truly reusable across domains.

## WPF Guidelines

* Use MVVM where possible.
* Avoid code-behind except for view-only behavior or native window interop.
* Keep business logic out of XAML views.
* Reuse existing dialog, prompt, button, textbox, and resource styles.
* Do not break existing resource keys or merged dictionaries.

## Web Guidelines

* Keep React components focused and small.
* Keep Markdown parsing, formatting, and command logic out of visual components where possible.
* Use existing theme variables and preview/editor theme structures.
* Do not hardcode colors if a theme token already exists.
* Preserve Monaco editor behavior, undo/redo, selection handling, and preview behavior.

## Before Implementing

* Inspect the relevant existing files first.
* Understand the current patterns before adding new ones.
* If a larger refactor is needed, create a Markdown plan in `Draft/Instructions/` before changing code.

## Final Response Requirement

After making code changes, always include:

* a short summary of what changed
* the important files touched
* any limitations or follow-up notes
* a concise Git commit message

Example commit message style:

```txt
feat: add editor quick insert menu
fix: improve inline code behavior in FMT
refactor: reorganize preview theme configuration
```