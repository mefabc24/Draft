export type ShowWhitespaceCharacters = 'Always' | 'Never' | 'Highlighted Only'
export type CursorStyle = 'Line' | 'Block' | 'Underline'
export type FloatingMarkdownToolbarMode = 'Disabled' | 'Editor'
export type PreviewScrollSyncMode =
  | 'Off'
  | 'EditorToPreview'
  | 'PreviewToEditor'
  | 'TwoWay'
  | 'FollowEditedSection'

export type DraftEditorSettings = {
  activeEditorThemeId: string
  activePreviewThemeId: string
  autoPairBrackets: boolean
  autoPairQuotes: boolean
  cursorBlinking: boolean
  cursorStyle: CursorStyle
  editorFontFamily: string
  editorFontSize: number
  floatingMarkdownToolbarMode: FloatingMarkdownToolbarMode
  highlightCurrentLine: boolean
  insertSpacesInsteadOfTabs: boolean
  lineHeight: number
  markdownSyntaxHighlighting: boolean
  previewScrollSyncMode: PreviewScrollSyncMode
  showIndentationGuides: boolean
  showLineNumbers: boolean
  showWhitespaceCharacters: ShowWhitespaceCharacters
  tabSize: number
  wordWrap: boolean
}

export type SettingsChangedMessage = {
  type: 'settingsChanged'
} & DraftEditorSettings
