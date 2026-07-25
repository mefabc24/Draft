import { draftLightTokens } from '../shared/themeTokens'
import { createEditorChromeVariables } from './support/createEditorChromeVariables'
import type { DraftEditorTheme } from './support/editorThemeTypes'

const lightSyntaxColors = {
  comment: '6B7280',
  delimiter: '535455',
  htmlAttribute: '7A3E9D',
  keyword: '2F6FC4',
  listMarker: '208647',
  number: 'A96800',
  quoteMarker: '7A3E9D',
  string: '208647',
  tag: '2F6FC4',
  type: '7A3E9D',
} as const

export const draftLightEditorTheme: DraftEditorTheme = {
  base: 'vs',
  chromeVariables: createEditorChromeVariables(draftLightTokens, {
    iconFilter: 'brightness(0) saturate(100%) invert(37%)',
    primaryIconFilter:
      'brightness(0) saturate(100%) invert(69%) sepia(47%) saturate(1867%) hue-rotate(188deg) brightness(103%) contrast(101%)',
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
    'editorIndentGuide.background': '#d1d5db',
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
    { token: 'comment', foreground: lightSyntaxColors.comment },
    { token: 'keyword', foreground: lightSyntaxColors.keyword },
    {
      token: 'keyword.heading.marker',
      foreground: lightSyntaxColors.keyword,
    },
    {
      token: 'keyword.heading.text',
      foreground: lightSyntaxColors.keyword,
    },
    {
      token: 'keyword.list.marker',
      foreground: lightSyntaxColors.listMarker,
    },
    {
      token: 'markup.quote.marker',
      foreground: lightSyntaxColors.quoteMarker,
    },
    { token: 'string', foreground: lightSyntaxColors.string },
    { token: 'string.html', foreground: lightSyntaxColors.string },
    { token: 'string.link', foreground: lightSyntaxColors.keyword },
    { token: 'number', foreground: lightSyntaxColors.number },
    { token: 'regexp', foreground: lightSyntaxColors.htmlAttribute },
    { token: 'type', foreground: lightSyntaxColors.type },
    { token: 'tag', foreground: lightSyntaxColors.tag },
    {
      token: 'attribute.name.html',
      foreground: lightSyntaxColors.htmlAttribute,
    },
    { token: 'delimiter', foreground: lightSyntaxColors.delimiter },
    { token: 'delimiter.bracket', foreground: lightSyntaxColors.delimiter },
    { token: 'delimiter.html', foreground: lightSyntaxColors.delimiter },
  ],
}
