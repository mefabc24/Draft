import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export type EditorThemeId = 'draftDark' | 'draftLight'

export const DRAFT_CURRENT_LINE_DECORATION_CLASS = 'editor-current-line'

export type EditorChromeVariableName =
  | '--app-accent-disabled-background'
  | '--app-accent-focus-ring'
  | '--app-accent-foreground'
  | '--app-accent-hover-background'
  | '--app-accent-selection-active-background'
  | '--app-accent-selection-background'
  | '--app-accent-soft-background'
  | '--app-border'
  | '--app-checkmark-foreground'
  | '--app-content-foreground'
  | '--app-contrast-foreground'
  | '--app-control-background'
  | '--app-control-border'
  | '--app-control-border-hover'
  | '--app-control-foreground'
  | '--app-control-hover-background'
  | '--app-control-pressed-background'
  | '--app-control-subtle-hover-background'
  | '--app-danger'
  | '--app-danger-focus-ring'
  | '--app-danger-recording-ring'
  | '--app-danger-recording-shadow'
  | '--app-danger-soft-background'
  | '--app-foreground'
  | '--app-foreground-bright'
  | '--app-hint-foreground'
  | '--app-input-background'
  | '--app-input-border'
  | '--app-input-foreground'
  | '--app-overlay-hover-background'
  | '--app-overlay-hover-background-strong'
  | '--app-shadow'
  | '--app-shadow-elevated'
  | '--app-success'
  | '--app-surface-background'
  | '--app-thumbnail-border'
  | '--draft-chrome-background'
  | '--draft-divider-color'
  | '--draft-muted-foreground'
  | '--draft-pane-border'
  | '--draft-subtle-foreground'
  | '--editor-background'
  | '--editor-current-line-background'
  | '--editor-scrollbar-thumb'
  | '--editor-scrollbar-track'
  | '--editor-surface-background'
  | '--font-editor'
  | '--font-preview'
  | '--font-ui'
  | '--markdown-toolbar-background'
  | '--markdown-toolbar-border'
  | '--markdown-toolbar-divider'
  | '--markdown-toolbar-foreground'
  | '--markdown-toolbar-hover-background'
  | '--markdown-toolbar-icon-filter'
  | '--markdown-toolbar-icon-primary-filter'
  | '--markdown-toolbar-muted'
  | '--markdown-toolbar-primary'
  | '--markdown-toolbar-radius'
  | '--markdown-toolbar-selected-shortcut'
  | '--markdown-toolbar-shadow'

export type EditorChromeVariables = Record<EditorChromeVariableName, string>

export type DraftEditorTheme = {
  base: monaco.editor.BuiltinTheme
  chromeVariables: EditorChromeVariables
  colorScheme: 'dark' | 'light'
  colors: monaco.editor.IColors
  id: EditorThemeId
  inherit: boolean
  label: string
  monacoThemeName: string
  rules: monaco.editor.ITokenThemeRule[]
}
