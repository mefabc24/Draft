import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { inlineFormatConfig } from './inlineFormatConfig'
import type {
  InlineFormatRange,
  WrappableInlineFormat,
} from './inlineFormatTypes'

export function doInlineRangesIntersect(
  left: MarkdownSelectionOffsetRange,
  right: MarkdownSelectionOffsetRange,
) {
  return left.startOffset < right.endOffset && left.endOffset > right.startOffset
}

export function isInlineRangeInside(
  range: MarkdownSelectionOffsetRange,
  container: MarkdownSelectionOffsetRange,
) {
  return (
    range.startOffset >= container.startOffset &&
    range.endOffset <= container.endOffset
  )
}

export function isInlineWhitespaceOnly(value: string) {
  return /^[^\S\r\n]*$/u.test(value)
}

export function getInlineRangeFullRange(
  range: InlineFormatRange,
): MarkdownSelectionOffsetRange {
  return {
    endOffset: range.markerEnd,
    startOffset: range.markerStart,
  }
}

export function getInlineRangeContentRange(
  range: InlineFormatRange,
): MarkdownSelectionOffsetRange {
  return {
    endOffset: range.contentEnd,
    startOffset: range.contentStart,
  }
}

export function getInlineRangeSyntaxRanges(range: InlineFormatRange) {
  return [
    {
      endOffset: range.contentStart,
      startOffset: range.markerStart,
    },
    {
      endOffset: range.markerEnd,
      startOffset: range.contentEnd,
    },
  ].filter((syntaxRange) => syntaxRange.startOffset < syntaxRange.endOffset)
}

export function getInlineSyntaxRanges(ranges: InlineFormatRange[]) {
  return ranges
    .flatMap(getInlineRangeSyntaxRanges)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
}

function isSelectionConnectedToRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  range: InlineFormatRange,
  mergeAdjacent: boolean,
) {
  const fullRange = getInlineRangeFullRange(range)

  if (doInlineRangesIntersect(fullRange, selection)) {
    return true
  }

  if (!mergeAdjacent) {
    return false
  }

  if (
    fullRange.endOffset <= selection.startOffset &&
    isInlineWhitespaceOnly(value.slice(fullRange.endOffset, selection.startOffset))
  ) {
    return true
  }

  return (
    fullRange.startOffset >= selection.endOffset &&
    isInlineWhitespaceOnly(value.slice(selection.endOffset, fullRange.startOffset))
  )
}

export function getMergeableInlineFormatApplicationRange(
  value: string,
  ranges: InlineFormatRange[],
  selection: MarkdownSelectionOffsetRange,
  format: WrappableInlineFormat,
) {
  const config = inlineFormatConfig[format]
  const selectedRanges = new Set<InlineFormatRange>()
  let replacementEndOffset = selection.endOffset
  let replacementStartOffset = selection.startOffset
  let changed = true

  while (changed) {
    changed = false

    for (const range of ranges) {
      if (selectedRanges.has(range) || range.type !== format) {
        continue
      }

      const currentSelection = {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
      }

      if (
        !isSelectionConnectedToRange(
          value,
          currentSelection,
          range,
          config.mergeAdjacent,
        )
      ) {
        continue
      }

      selectedRanges.add(range)
      replacementEndOffset = Math.max(replacementEndOffset, range.markerEnd)
      replacementStartOffset = Math.min(
        replacementStartOffset,
        range.markerStart,
      )
      changed = true
    }
  }

  return {
    ranges: ranges
      .filter((range) => selectedRanges.has(range))
      .sort((a, b) => a.markerStart - b.markerStart || a.markerEnd - b.markerEnd),
    replacementEndOffset,
    replacementStartOffset,
  }
}
