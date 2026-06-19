import type { FloatingMarkdownToolbarMode } from '../settings/settingsTypes'

export function isFloatingToolbarEnabledInEditor(
  mode: FloatingMarkdownToolbarMode,
) {
  return mode === 'Editor'
}

export function isFloatingToolbarEnabledInPreview(
  _mode: FloatingMarkdownToolbarMode,
) {
  return false
}
