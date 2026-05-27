import { DEFAULT_PREVIEW_THEME_ID } from '../../../settings/themeSettings'
import type { DraftPreviewTheme } from './previewThemeTypes'

type PreviewThemeModule = {
  default: DraftPreviewTheme
}

const previewThemeModules = import.meta.glob<PreviewThemeModule>(
  '../*.previewTheme.ts',
  { eager: true },
)

export const previewThemes = Object.fromEntries(
  Object.values(previewThemeModules).map(({ default: theme }) => [
    theme.id,
    theme,
  ]),
) as Record<string, DraftPreviewTheme>

export function getPreviewTheme(themeId: string): DraftPreviewTheme {
  return previewThemes[themeId] ?? previewThemes[DEFAULT_PREVIEW_THEME_ID]
}

export function getPreviewThemeOptions() {
  return Object.values(previewThemes).sort((left, right) => {
    if (left.id === DEFAULT_PREVIEW_THEME_ID) {
      return -1
    }

    if (right.id === DEFAULT_PREVIEW_THEME_ID) {
      return 1
    }

    return left.label.localeCompare(right.label)
  })
}
