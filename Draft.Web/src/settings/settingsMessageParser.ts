import { DEFAULT_EDITOR_SETTINGS } from './defaultEditorSettings'
import { normalizeShortcutBindings } from '../shortcuts/shortcutSettings'
import { normalizeAppLanguage } from '../localization/localization'
import type {
  CursorStyle,
  DraftEditorSettings,
  FloatingMarkdownToolbarMode,
  PreviewScrollSyncMode,
  SettingsChangedMessage,
  ShowWhitespaceCharacters,
} from './settingsTypes'

export const SETTINGS_CHANGED_MESSAGE_TYPE = 'settingsChanged'

const FLOATING_MARKDOWN_TOOLBAR_MODE_ALIASES: Record<
  string,
  FloatingMarkdownToolbarMode
> = {
  both: 'EditorAndPreview',
  disabled: 'Disabled',
  editor: 'Editor',
  'editor & preview': 'EditorAndPreview',
  'editor and preview': 'EditorAndPreview',
  'editor only': 'Editor',
  'editor-only': 'Editor',
  editorandpreview: 'EditorAndPreview',
  editoronly: 'Editor',
  editorpreview: 'EditorAndPreview',
  'editor+preview': 'EditorAndPreview',
  off: 'Disabled',
  preview: 'Preview',
  'preview only': 'Preview',
  'preview-only': 'Preview',
  previewonly: 'Preview',
  always: 'EditorAndPreview',
}

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

  if (typeof value === 'string') {
    const mode =
      FLOATING_MARKDOWN_TOOLBAR_MODE_ALIASES[value.trim().toLowerCase()]

    if (mode) {
      return mode
    }
  }

  return DEFAULT_EDITOR_SETTINGS.floatingMarkdownToolbarMode
}

export function parseDraftEditorSettings(
  record: Record<string, unknown>,
): DraftEditorSettings {
  return {
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
    appLanguage: normalizeAppLanguage(
      readRecordValue(record, 'appLanguage') ??
        readRecordValue(record, 'language') ??
        DEFAULT_EDITOR_SETTINGS.appLanguage,
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
    shortcuts: normalizeShortcutBindings(readRecordValue(record, 'shortcuts')),
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

export function parseSettingsChangedMessage(
  record: Record<string, unknown>,
): SettingsChangedMessage | null {
  const type = record.type ?? record.Type

  if (type !== SETTINGS_CHANGED_MESSAGE_TYPE) {
    return null
  }

  return {
    type: SETTINGS_CHANGED_MESSAGE_TYPE,
    ...parseDraftEditorSettings(record),
  }
}
