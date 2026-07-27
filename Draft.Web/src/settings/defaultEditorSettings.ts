import {
  getInitialEditorThemeId,
  getInitialPreviewThemeId,
} from './themeSettings'
import type { DraftEditorSettings } from './settingsTypes'
import { defaultShortcutBindings } from '../shortcuts/shortcutSettings'
import {
  normalizeFloatingMarkdownToolbarItems,
  normalizeQuickInsertItems,
} from './menuCustomization'

export const DEFAULT_EDITOR_SETTINGS: DraftEditorSettings = {
  activeEditorThemeId: getInitialEditorThemeId(),
  activePreviewThemeId: getInitialPreviewThemeId(),
  appLanguage: 'en',
  autoPairBrackets: true,
  autoPairQuotes: true,
  cursorBlinking: true,
  cursorStyle: 'Line',
  editorFontFamily: 'JetBrains Mono',
  editorFontSize: 16,
  floatingMarkdownToolbarItems:
    normalizeFloatingMarkdownToolbarItems(undefined),
  floatingMarkdownToolbarMode: 'Editor',
  highlightCurrentLine: true,
  insertSpacesInsteadOfTabs: true,
  lineHeight: 1.6,
  markdownSyntaxHighlighting: true,
  previewScrollSyncMode: 'TwoWay',
  quickInsertItems: normalizeQuickInsertItems(undefined),
  shortcuts: defaultShortcutBindings,
  showIndentationGuides: false,
  showLineNumbers: true,
  showWhitespaceCharacters: 'Never',
  tabSize: 4,
  wordWrap: true,
}
