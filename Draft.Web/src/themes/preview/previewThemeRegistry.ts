import { DEFAULT_PREVIEW_THEME_ID } from '../../settings/themeSettings'
import { draftDarkPreviewTheme } from './draftDark.previewTheme'
import type { DraftPreviewTheme, PreviewThemeId } from './previewThemeTypes'

export const previewThemes = {
  draftDark: draftDarkPreviewTheme,
} satisfies Record<PreviewThemeId, DraftPreviewTheme>

export function getPreviewTheme(themeId: string): DraftPreviewTheme {
  return previewThemes[themeId as PreviewThemeId] ?? previewThemes[DEFAULT_PREVIEW_THEME_ID]
}
