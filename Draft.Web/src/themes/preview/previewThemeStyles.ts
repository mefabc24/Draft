import type { CSSProperties } from 'react'
import type { DraftPreviewTheme } from './previewThemeTypes'

export function getPreviewThemeStyle(theme: DraftPreviewTheme) {
  return theme.cssVariables as CSSProperties
}
