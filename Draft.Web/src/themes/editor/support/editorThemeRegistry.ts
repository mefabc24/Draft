import { DEFAULT_EDITOR_THEME_ID } from '../../../settings/themeSettings'
import { draftDarkEditorTheme } from '../draftDark.editorTheme'
import type { DraftEditorTheme, EditorThemeId } from './editorThemeTypes'

export const editorThemes = {
  draftDark: draftDarkEditorTheme,
} satisfies Record<EditorThemeId, DraftEditorTheme>

export function getEditorTheme(themeId: string): DraftEditorTheme {
  return editorThemes[themeId as EditorThemeId] ?? editorThemes[DEFAULT_EDITOR_THEME_ID]
}
