import type { MarkdownSelectionOffsetRange } from '../../markdown'

function clampSourceOffset(value: string, offset: number) {
  return Math.max(0, Math.min(value.length, offset))
}

export function mapPreviewSelectionToSourceRange(
  value: string,
  range: MarkdownSelectionOffsetRange,
): MarkdownSelectionOffsetRange {
  const startOffset = clampSourceOffset(value, range.startOffset)
  const endOffset = Math.max(
    startOffset,
    clampSourceOffset(value, range.endOffset),
  )

  return { endOffset, startOffset }
}
