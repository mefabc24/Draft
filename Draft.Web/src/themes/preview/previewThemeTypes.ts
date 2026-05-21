import type { CssVariableMap } from '../shared/themeTypes'

export type PreviewThemeId = string

export type DraftPreviewTheme = {
  cssVariables: CssVariableMap
  id: PreviewThemeId
  label: string
}
