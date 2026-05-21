import type { CSSProperties } from 'react'
import type { DraftPreviewTheme } from './previewThemeTypes'

export function getPreviewThemeStyle(theme: DraftPreviewTheme) {
  return {
    ...theme.cssVariables,
    '--preview-nested-ordered-list-style-type': theme.useRomanNestedOrderedLists
      ? 'lower-roman'
      : 'decimal',
    '--preview-ordered-list-marker-font-weight':
      theme.useBoldOrderedListMarkers ? '700' : '400',
  } as CSSProperties
}
