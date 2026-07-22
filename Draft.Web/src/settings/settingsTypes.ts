import type { ShortcutBindings } from '../shortcuts/shortcutSettings'
import type { AppLanguage } from '../localization/localization'
import type {
  FloatingMarkdownToolbarItemCustomization,
  QuickInsertItemCustomization,
} from './menuCustomization'

export type ShowWhitespaceCharacters = 'Always' | 'Never' | 'Highlighted Only'
export type CursorStyle = 'Line' | 'Block' | 'Underline'
export type FloatingMarkdownToolbarMode =
  | 'Disabled'
  | 'Editor'
  | 'Preview'
  | 'EditorAndPreview'
export type PreviewScrollSyncMode =
  | 'Off'
  | 'EditorToPreview'
  | 'PreviewToEditor'
  | 'TwoWay'
  | 'FollowEditedSection'

export type DraftEditorSettings = {
  activeEditorThemeId: string
  activePreviewThemeId: string
  appLanguage: AppLanguage
  autoPairBrackets: boolean
  autoPairQuotes: boolean
  cursorBlinking: boolean
  cursorStyle: CursorStyle
  editorFontFamily: string
  editorFontSize: number
  floatingMarkdownToolbarItems: FloatingMarkdownToolbarItemCustomization[]
  floatingMarkdownToolbarMode: FloatingMarkdownToolbarMode
  highlightCurrentLine: boolean
  insertSpacesInsteadOfTabs: boolean
  lineHeight: number
  markdownSyntaxHighlighting: boolean
  previewScrollSyncMode: PreviewScrollSyncMode
  quickInsertItems: QuickInsertItemCustomization[]
  shortcuts: ShortcutBindings
  showIndentationGuides: boolean
  showLineNumbers: boolean
  showWhitespaceCharacters: ShowWhitespaceCharacters
  tabSize: number
  wordWrap: boolean
}

export type SettingsChangedMessage = {
  type: 'settingsChanged'
} & DraftEditorSettings
