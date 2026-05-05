# AGENTS.md

## Purpose

This file defines rules and guidelines for AI agents (Codex, ChatGPT, etc.) working on the **Draft.Web (Vite + React)** project.

---

## Scope

* This file applies **ONLY to `Draft.Web`**
* Do not assume access to WPF logic (`Draft.Wpf`)
* This project is used inside a WebView2 host

---

## General Rules

* Keep solutions simple and readable
* Do not overengineer
* Follow existing structure and patterns

---

## Code Editing Rules

* Do NOT rename existing functions unless explicitly requested
* Do NOT restructure the project without necessity
* Keep code style consistent
* Avoid unnecessary comments

---

## File Access Rules

* Do NOT use `Get-Content` to read large files
* Only read relevant code sections
* Avoid scanning entire directories

---

## Vite / React Rules

* Do NOT modify `vite.config.ts` unless explicitly required
* Always use **relative paths (`./`)** for assets
* Do NOT change build output structure (`dist/`)
* Keep dependencies minimal

---

## Ignored Directories

Never interact with or modify:

* `node_modules/`
* `dist/`
* `.idea/`

---

## WebView2 Context

* This project is rendered inside WebView2
* Output must work as static files (`dist/index.html`)
* Avoid browser-specific APIs that may break in embedded context

---

## UI / Styling

* Keep UI consistent and minimal
* Avoid heavy frameworks
* Prefer custom styling over libraries

---

## Git Rules

* Do not stage ignored files
* Use small, meaningful commits
* Do not rewrite history

---

## What NOT to do

* Do not introduce new frameworks without reason
* Do not refactor unrelated code
* Do not break existing functionality
* Do not assume backend or native integration

---

## Preferred Behavior

* Make minimal, targeted changes
* Explain changes briefly
* Ask if unclear instead of guessing
