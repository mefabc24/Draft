export const DEFAULT_EDITOR_THEME_ID = 'draftDark'
export const DEFAULT_PREVIEW_THEME_ID = 'draftDark'

function getInitialThemeId(queryParameter: string, fallbackThemeId: string) {
  const themeId = new URLSearchParams(window.location.search)
    .get(queryParameter)
    ?.trim()

  return themeId || fallbackThemeId
}

export function getInitialEditorThemeId() {
  return getInitialThemeId('editorTheme', DEFAULT_EDITOR_THEME_ID)
}

export function getInitialPreviewThemeId() {
  return getInitialThemeId('previewTheme', DEFAULT_PREVIEW_THEME_ID)
}
