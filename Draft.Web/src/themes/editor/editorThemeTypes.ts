import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { CssVariableMap } from '../shared/themeTypes'

export type EditorThemeId = 'draftDark'

export const DRAFT_CURRENT_LINE_DECORATION_CLASS = 'editor-current-line'

export type DraftEditorTheme = {
  base: monaco.editor.BuiltinTheme
  chromeVariables: CssVariableMap
  colors: monaco.editor.IColors
  currentLineDecorationBackground: string
  id: EditorThemeId
  inherit: boolean
  label: string
  monacoThemeName: string
  rules: monaco.editor.ITokenThemeRule[]
}
