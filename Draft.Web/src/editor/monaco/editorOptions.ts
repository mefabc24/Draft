import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type {
  CursorStyle,
  DraftEditorSettings,
  ShowWhitespaceCharacters,
} from '../../settings/settingsTypes'

export const EDITOR_PADDING: monaco.editor.IEditorPaddingOptions = {
  top: 16,
  bottom: 16,
}

export const EDITOR_SCROLL_SENSITIVITY = 1.5

export const EDITOR_LINE_NUMBERS_MIN_CHARS = 2
export const EDITOR_LINE_NUMBER_LEFT_PADDING_PX = 16
export const EDITOR_LINE_DECORATIONS_WIDTH = 48

export const EDITOR_GUTTER_OPTIONS = {
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth:
    EDITOR_LINE_DECORATIONS_WIDTH + EDITOR_LINE_NUMBER_LEFT_PADDING_PX,
  lineNumbersMinChars: EDITOR_LINE_NUMBERS_MIN_CHARS,
} satisfies Pick<
  monaco.editor.IEditorOptions,
  'folding' | 'glyphMargin' | 'lineDecorationsWidth' | 'lineNumbersMinChars'
>

export const EDITOR_EMPTY_LINE_INSERT_BUTTON_LEFT = 50

export function getEditorFontFamilyCss(fontFamily: string) {
  switch (fontFamily) {
    case 'Cascadia Code':
      return "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', 'Courier New', monospace"
    case 'Cascadia Mono':
      return "'Cascadia Mono', 'Cascadia Code', 'JetBrains Mono', 'Courier New', monospace"
    case 'Consolas':
      return "Consolas, 'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', 'Courier New', monospace"
    case 'JetBrains Mono':
    default:
      return "'JetBrains Mono', Consolas, 'Cascadia Code', 'Cascadia Mono', 'Courier New', monospace"
  }
}

export function getEditorFontLoadTarget(settings: DraftEditorSettings) {
  return `${settings.editorFontSize}px ${getEditorFontFamilyCss(settings.editorFontFamily)}`
}

function getEditorLineHeightPixels(settings: DraftEditorSettings) {
  return Math.max(1, Math.round(settings.editorFontSize * settings.lineHeight))
}

function getRenderWhitespace(
  value: ShowWhitespaceCharacters,
): monaco.editor.IEditorOptions['renderWhitespace'] {
  switch (value) {
    case 'Always':
      return 'all'
    case 'Highlighted Only':
      return 'selection'
    case 'Never':
    default:
      return 'none'
  }
}

function getCursorStyle(
  value: CursorStyle,
): monaco.editor.IEditorOptions['cursorStyle'] {
  switch (value) {
    case 'Block':
      return 'block'
    case 'Underline':
      return 'underline'
    case 'Line':
    default:
      return 'line'
  }
}

export function getEditorSettingsOptions(
  settings: DraftEditorSettings,
): monaco.editor.IEditorOptions {
  return {
    wordWrap: settings.wordWrap ? 'on' : 'off',
    fontSize: settings.editorFontSize,
    lineHeight: getEditorLineHeightPixels(settings),
    fontFamily: getEditorFontFamilyCss(settings.editorFontFamily),
    ...EDITOR_GUTTER_OPTIONS,
    renderLineHighlight: settings.highlightCurrentLine ? 'gutter' : 'none',
    lineNumbers: settings.showLineNumbers ? 'on' : 'off',
    renderWhitespace: getRenderWhitespace(settings.showWhitespaceCharacters),
    guides: { indentation: settings.showIndentationGuides },
    autoClosingBrackets: settings.autoPairBrackets ? 'always' : 'never',
    autoClosingQuotes: settings.autoPairQuotes ? 'always' : 'never',
    cursorStyle: getCursorStyle(settings.cursorStyle),
    cursorBlinking: settings.cursorBlinking ? 'blink' : 'solid',
  }
}
