const DEFAULT_SPLIT_RATIO = 0.5
const SPLIT_SIZING_STORAGE_KEY = 'draft.workspace.splitSizing'

export function readStoredSplitEditorRatio() {
  try {
    const value = window.localStorage.getItem(SPLIT_SIZING_STORAGE_KEY)

    if (!value) {
      return DEFAULT_SPLIT_RATIO
    }

    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_SPLIT_RATIO
    }

    const { editorRatio } = parsed as { editorRatio?: unknown }

    return typeof editorRatio === 'number' &&
      Number.isFinite(editorRatio) &&
      editorRatio > 0 &&
      editorRatio < 1
      ? editorRatio
      : DEFAULT_SPLIT_RATIO
  } catch {
    return DEFAULT_SPLIT_RATIO
  }
}

export function writeStoredSplitEditorRatio(editorRatio: number) {
  try {
    window.localStorage.setItem(
      SPLIT_SIZING_STORAGE_KEY,
      JSON.stringify({ editorRatio }),
    )
  } catch {
    // Ignore storage failures, such as blocked localStorage in embedded contexts.
  }
}
