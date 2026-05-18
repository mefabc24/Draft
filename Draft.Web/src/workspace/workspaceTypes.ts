export type ViewMode = 'editor' | 'split' | 'preview'

export function isViewMode(value: string): value is ViewMode {
  return value === 'editor' || value === 'split' || value === 'preview'
}
