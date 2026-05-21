import type { CssVariableMap } from '../shared/themeTypes'

export type PreviewThemeId = string

export type DraftPreviewTheme = {
  cssVariables: CssVariableMap
  id: PreviewThemeId
  label: string
  // false: ordered list markers use normal weight; true: markers like "1." use bold weight.
  useBoldOrderedListMarkers: boolean
  // false: nested ordered lists use decimal numbers; true: nested ordered lists use lower-roman markers.
  useRomanNestedOrderedLists: boolean
}
