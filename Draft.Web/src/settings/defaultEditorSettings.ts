import {
  DEFAULT_EDITOR_THEME_ID,
  DEFAULT_PREVIEW_THEME_ID,
} from './themeSettings'
import type { DraftEditorSettings } from './settingsTypes'
import { defaultShortcutBindings } from '../shortcuts/shortcutSettings'

export const DEFAULT_EDITOR_SETTINGS: DraftEditorSettings = {
  activeEditorThemeId: DEFAULT_EDITOR_THEME_ID,
  activePreviewThemeId: DEFAULT_PREVIEW_THEME_ID,
  autoPairBrackets: true,
  autoPairQuotes: true,
  cursorBlinking: true,
  cursorStyle: 'Line',
  editorFontFamily: 'JetBrains Mono',
  editorFontSize: 16,
  floatingMarkdownToolbarMode: 'Editor',
  highlightCurrentLine: true,
  insertSpacesInsteadOfTabs: true,
  lineHeight: 1.6,
  markdownSyntaxHighlighting: true,
  previewScrollSyncMode: 'TwoWay',
  shortcuts: defaultShortcutBindings,
  showIndentationGuides: false,
  showLineNumbers: true,
  showWhitespaceCharacters: 'Never',
  tabSize: 4,
  wordWrap: true,
}
