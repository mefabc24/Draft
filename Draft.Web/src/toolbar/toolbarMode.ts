import type { FloatingMarkdownToolbarMode } from '../settings/settingsTypes'

export function isFloatingToolbarEnabledInEditor(
  mode: FloatingMarkdownToolbarMode,
) {
  return mode === 'Editor' || mode === 'EditorAndPreview'
}

export function isFloatingToolbarEnabledInPreview(
  mode: FloatingMarkdownToolbarMode,
) {
  return mode === 'Preview' || mode === 'EditorAndPreview'
}
