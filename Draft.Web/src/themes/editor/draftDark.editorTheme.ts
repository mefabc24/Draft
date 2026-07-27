import { draftDarkTokens } from '../shared/themeTokens'
import { createEditorChromeVariables } from './support/createEditorChromeVariables'
import type { DraftEditorTheme } from './support/editorThemeTypes'

export const draftDarkEditorTheme: DraftEditorTheme = {
  base: 'vs-dark',
  chromeVariables: createEditorChromeVariables(draftDarkTokens, {
    iconFilter:
      'brightness(0) saturate(100%) invert(74%) sepia(6%) saturate(89%) hue-rotate(344deg) brightness(91%) contrast(88%)',
    primaryIconFilter:
      'brightness(0) saturate(100%) invert(78%) sepia(18%) saturate(720%) hue-rotate(184deg) brightness(105%) contrast(101%)',
  }),
  colorScheme: 'dark',
  colors: {
    'editor.background': draftDarkTokens.chromeBackground,
    'editor.foreground': draftDarkTokens.foregroundBright,
    'editor.lineHighlightBackground': '#1a1a1a',
    'editor.lineHighlightBorder': draftDarkTokens.transparent,
    'editorCursor.foreground': '#A5C8FF',
    'editor.selectionBackground': '#214283AA',
    'editor.inactiveSelectionBackground': '#214283AA',
    'editor.selectionHighlightBackground': '#35353570',
    'editor.selectionHighlightBorder': draftDarkTokens.transparent,
    'editor.wordHighlightBackground': '#35353570',
    'editor.wordHighlightStrongBackground': '#FF880044',
    'editor.wordHighlightBorder': draftDarkTokens.transparent,
    'editor.wordHighlightStrongBorder': '#FF88FF',
    'editorLineNumber.foreground': '#504F4F',
    'editorLineNumber.activeForeground': '#A5C8FF',
    'editorIndentGuide.background': '#FF8800',
    'editorIndentGuide.activeBackground': '#FFD500',
    'editorWhitespace.foreground': draftDarkTokens.foregroundBright,
    'editorGutter.background': draftDarkTokens.chromeBackground,
    'editorOverviewRuler.border': '#FF0000',
  },
  id: 'draftDark',
  inherit: true,
  label: 'Draft Dark',
  monacoThemeName: 'draft-dark',
  rules: [
    { token: 'comment', foreground: '504F4F' },
    { token: 'keyword', foreground: 'A5C8FF' },
    { token: 'keyword.heading.marker', foreground: 'A5C8FF' },
    { token: 'keyword.heading.text', foreground: 'A5C8FF' },
    { token: 'keyword.list.marker', foreground: '79A986' },
    { token: 'markup.quote.marker', foreground: 'F0BE6C' },
    { token: 'string', foreground: '79A986' },
    { token: 'number', foreground: 'FFD500' },
    { token: 'regexp', foreground: 'FF00FF' },
    { token: 'type', foreground: 'FF8800' },
    { token: 'delimiter', foreground: 'FF0000' },
    { token: 'delimiter.bracket', foreground: 'FF0000' },
  ],
}
