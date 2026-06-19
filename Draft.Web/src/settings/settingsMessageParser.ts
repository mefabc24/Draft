import { DEFAULT_EDITOR_SETTINGS } from './defaultEditorSettings'
import type {
  CursorStyle,
  FloatingMarkdownToolbarMode,
  PreviewScrollSyncMode,
  SettingsChangedMessage,
  ShowWhitespaceCharacters,
} from './settingsTypes'

export const SETTINGS_CHANGED_MESSAGE_TYPE = 'settingsChanged'

export function readRecordValue(
  record: Record<string, unknown>,
  camelName: string,
) {
  const pascalName = `${camelName[0]?.toUpperCase() ?? ''}${camelName.slice(1)}`
  return record[camelName] ?? record[pascalName]
}

function readString(
  record: Record<string, unknown>,
  name: string,
  fallback: string,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'string' && value.trim() ? value : fallback
}

function readNumber(
  record: Record<string, unknown>,
  name: string,
  fallback: number,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(
  record: Record<string, unknown>,
  name: string,
  fallback: boolean,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'boolean' ? value : fallback
}

function readShowWhitespaceCharacters(
  record: Record<string, unknown>,
): ShowWhitespaceCharacters {
  const value = readRecordValue(record, 'showWhitespaceCharacters')

  if (value === 'Always' || value === 'Never' || value === 'Highlighted Only') {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.showWhitespaceCharacters
}

function readCursorStyle(record: Record<string, unknown>): CursorStyle {
  const value = readRecordValue(record, 'cursorStyle')

  if (value === 'Line' || value === 'Block' || value === 'Underline') {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.cursorStyle
}

function readPreviewScrollSyncMode(
  record: Record<string, unknown>,
): PreviewScrollSyncMode {
  const value = readRecordValue(record, 'previewScrollSyncMode')

  if (
    value === 'Off' ||
    value === 'EditorToPreview' ||
    value === 'PreviewToEditor' ||
    value === 'TwoWay' ||
    value === 'FollowEditedSection'
  ) {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.previewScrollSyncMode
}

function readFloatingMarkdownToolbarMode(
  record: Record<string, unknown>,
): FloatingMarkdownToolbarMode {
  const value = readRecordValue(record, 'floatingMarkdownToolbarMode')

  if (
    value === 'Editor' ||
    value === 'EditorAndPreview' ||
    value === 'Always' ||
    value === 'Editor & Preview'
  ) {
    return 'Editor'
  }

  if (value === 'Disabled' || value === 'Preview') {
    return 'Disabled'
  }

  return DEFAULT_EDITOR_SETTINGS.floatingMarkdownToolbarMode
}

export function parseSettingsChangedMessage(
  record: Record<string, unknown>,
): SettingsChangedMessage | null {
  const type = record.type ?? record.Type

  if (type !== SETTINGS_CHANGED_MESSAGE_TYPE) {
    return null
  }

  return {
    type: SETTINGS_CHANGED_MESSAGE_TYPE,
    activeEditorThemeId: readString(
      record,
      'activeEditorThemeId',
      DEFAULT_EDITOR_SETTINGS.activeEditorThemeId,
    ),
    activePreviewThemeId: readString(
      record,
      'activePreviewThemeId',
      DEFAULT_EDITOR_SETTINGS.activePreviewThemeId,
    ),
    autoPairBrackets: readBoolean(
      record,
      'autoPairBrackets',
      DEFAULT_EDITOR_SETTINGS.autoPairBrackets,
    ),
    autoPairQuotes: readBoolean(
      record,
      'autoPairQuotes',
      DEFAULT_EDITOR_SETTINGS.autoPairQuotes,
    ),
    cursorBlinking: readBoolean(
      record,
      'cursorBlinking',
      DEFAULT_EDITOR_SETTINGS.cursorBlinking,
    ),
    cursorStyle: readCursorStyle(record),
    editorFontFamily: readString(
      record,
      'editorFontFamily',
      DEFAULT_EDITOR_SETTINGS.editorFontFamily,
    ),
    editorFontSize: readNumber(
      record,
      'editorFontSize',
      DEFAULT_EDITOR_SETTINGS.editorFontSize,
    ),
    floatingMarkdownToolbarMode: readFloatingMarkdownToolbarMode(record),
    highlightCurrentLine: readBoolean(
      record,
      'highlightCurrentLine',
      DEFAULT_EDITOR_SETTINGS.highlightCurrentLine,
    ),
    insertSpacesInsteadOfTabs: readBoolean(
      record,
      'insertSpacesInsteadOfTabs',
      DEFAULT_EDITOR_SETTINGS.insertSpacesInsteadOfTabs,
    ),
    lineHeight: readNumber(
      record,
      'lineHeight',
      DEFAULT_EDITOR_SETTINGS.lineHeight,
    ),
    markdownSyntaxHighlighting: readBoolean(
      record,
      'markdownSyntaxHighlighting',
      DEFAULT_EDITOR_SETTINGS.markdownSyntaxHighlighting,
    ),
    previewScrollSyncMode: readPreviewScrollSyncMode(record),
    showIndentationGuides: readBoolean(
      record,
      'showIndentationGuides',
      DEFAULT_EDITOR_SETTINGS.showIndentationGuides,
    ),
    showLineNumbers: readBoolean(
      record,
      'showLineNumbers',
      DEFAULT_EDITOR_SETTINGS.showLineNumbers,
    ),
    showWhitespaceCharacters: readShowWhitespaceCharacters(record),
    tabSize: readNumber(record, 'tabSize', DEFAULT_EDITOR_SETTINGS.tabSize),
    wordWrap: readBoolean(record, 'wordWrap', DEFAULT_EDITOR_SETTINGS.wordWrap),
  }
}
