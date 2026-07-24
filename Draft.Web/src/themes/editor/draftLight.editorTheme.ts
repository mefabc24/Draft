import { draftLightTokens } from '../shared/themeTokens'
import { createEditorChromeVariables } from './support/createEditorChromeVariables'
import type { DraftEditorTheme } from './support/editorThemeTypes'

export const draftLightEditorTheme: DraftEditorTheme = {
  base: 'vs',
  chromeVariables: createEditorChromeVariables(draftLightTokens, {
    iconFilter: 'brightness(0) saturate(100%) invert(37%)',
    primaryIconFilter:
      'brightness(0) saturate(100%) invert(28%) sepia(89%) saturate(1518%) hue-rotate(181deg) brightness(93%) contrast(101%)',
  }),
  colorScheme: 'light',
  colors: {
    'editor.background': draftLightTokens.editorBackground,
    'editor.foreground': draftLightTokens.foreground,
    'editor.lineHighlightBackground':
      draftLightTokens.editorCurrentLineBackground,
    'editor.lineHighlightBorder': draftLightTokens.transparent,
    'editorCursor.foreground': draftLightTokens.accent,
    'editor.selectionBackground': '#add6ff',
    'editor.inactiveSelectionBackground': '#e5ebf1',
    'editor.selectionHighlightBackground': '#e8e8e8aa',
    'editor.selectionHighlightBorder': draftLightTokens.transparent,
    'editor.wordHighlightBackground': '#e8e8e8aa',
    'editor.wordHighlightStrongBackground': '#ffe2a8aa',
    'editor.wordHighlightBorder': draftLightTokens.transparent,
    'editor.wordHighlightStrongBorder': '#8a5b00',
    'editorLineNumber.foreground': '#767676',
    'editorLineNumber.activeForeground': draftLightTokens.accent,
    'editorIndentGuide.background': '#d6d6d6',
    'editorIndentGuide.activeBackground': '#9a9a9a',
    'editorWhitespace.foreground': '#767676',
    'editorGutter.background': draftLightTokens.editorBackground,
    'editorOverviewRuler.border': draftLightTokens.transparent,
  },
  id: 'draftLight',
  inherit: true,
  label: 'Draft Light',
  monacoThemeName: 'draft-light',
  rules: [
    { token: 'comment', foreground: '767676' },
    { token: 'keyword', foreground: '0067C0' },
    { token: 'keyword.heading.marker', foreground: '0067C0' },
    { token: 'keyword.heading.text', foreground: '0067C0' },
    { token: 'keyword.list.marker', foreground: '107C10' },
    { token: 'markup.quote.marker', foreground: '8A5B00' },
    { token: 'string', foreground: '107C10' },
    { token: 'number', foreground: '8A5B00' },
    { token: 'regexp', foreground: '7A3E9D' },
    { token: 'type', foreground: '9A4F00' },
    { token: 'delimiter', foreground: 'C42B1C' },
    { token: 'delimiter.bracket', foreground: 'C42B1C' },
  ],
}
