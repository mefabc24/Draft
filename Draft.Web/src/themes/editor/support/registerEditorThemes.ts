import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { registerDraftMarkdownLanguage } from '../../../editor/monaco/markdownLanguage'
import { editorThemes } from './editorThemeRegistry'
import { DRAFT_CURRENT_LINE_DECORATION_CLASS } from './editorThemeTypes'

let registered = false

function ensureEditorThemeStyles() {
  if (typeof document === 'undefined') {
    return
  }

  const styleId = 'draft-editor-theme-overrides'
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = styleId
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = `
    .editor-host .monaco-editor .${DRAFT_CURRENT_LINE_DECORATION_CLASS} {
      background: var(--editor-current-line-background);
      z-index: -1;
      pointer-events: none;
    }
  `
}

export function registerEditorThemes() {
  registerDraftMarkdownLanguage()

  if (!registered) {
    for (const theme of Object.values(editorThemes)) {
      monaco.editor.defineTheme(theme.monacoThemeName, {
        base: theme.base,
        inherit: theme.inherit,
        rules: theme.rules,
        colors: theme.colors,
      })
    }
    registered = true
  }

  ensureEditorThemeStyles()
}
