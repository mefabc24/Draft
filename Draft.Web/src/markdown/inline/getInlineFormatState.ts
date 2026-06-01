import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { normalizeInlineSelectionRange } from './normalizeInlineSelection'
import {
  getInlineFormatRangesByType,
  parseInlineFormatRangesForSelection,
} from './parseInlineFormatRanges'
import {
  doInlineRangesIntersect,
  getInlineSyntaxRanges,
} from './mergeInlineFormatRanges'
import type {
  InlineFormatRange,
  InlineFormatState,
  ParsedInlineFormat,
} from './inlineFormatTypes'

function subtractRanges(
  range: MarkdownSelectionOffsetRange,
  excludedRanges: MarkdownSelectionOffsetRange[],
) {
  let spans = [range]

  for (const excludedRange of excludedRanges) {
    spans = spans.flatMap((span) => {
      if (!doInlineRangesIntersect(span, excludedRange)) {
        return [span]
      }

      return [
        {
          endOffset: Math.max(
            span.startOffset,
            Math.min(span.endOffset, excludedRange.startOffset),
          ),
          startOffset: span.startOffset,
        },
        {
          endOffset: span.endOffset,
          startOffset: Math.max(
            span.startOffset,
            Math.min(span.endOffset, excludedRange.endOffset),
          ),
        },
      ].filter((item) => item.startOffset < item.endOffset)
    })
  }

  return spans
}

function getCoveredLength(
  span: MarkdownSelectionOffsetRange,
  ranges: InlineFormatRange[],
) {
  const coverage = ranges
    .map((range) => ({
      endOffset: Math.min(span.endOffset, range.contentEnd),
      startOffset: Math.max(span.startOffset, range.contentStart),
    }))
    .filter((range) => range.startOffset < range.endOffset)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)

  let coveredLength = 0
  let coveredEndOffset = span.startOffset

  for (const range of coverage) {
    const startOffset = Math.max(range.startOffset, coveredEndOffset)

    if (startOffset < range.endOffset) {
      coveredLength += range.endOffset - startOffset
      coveredEndOffset = range.endOffset
    }
  }

  return coveredLength
}

export function getInlineFormatState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: ParsedInlineFormat,
  selectedText?: string,
): InlineFormatState {
  if (value.slice(selection.startOffset, selection.endOffset).includes('\n')) {
    return 'inactive'
  }

  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const { coreRange } = normalizedSelection

  if (coreRange.startOffset >= coreRange.endOffset) {
    return 'inactive'
  }

  const ranges = parseInlineFormatRangesForSelection(value, coreRange)
  const visibleSpans = subtractRanges(coreRange, getInlineSyntaxRanges(ranges))

  if (visibleSpans.length === 0) {
    return 'inactive'
  }

  const formatRanges = getInlineFormatRangesByType(ranges, format)
  const visibleLength = visibleSpans.reduce(
    (total, span) => total + span.endOffset - span.startOffset,
    0,
  )
  const coveredLength = visibleSpans.reduce(
    (total, span) => total + getCoveredLength(span, formatRanges),
    0,
  )

  if (coveredLength === 0) {
    return 'inactive'
  }

  return coveredLength === visibleLength ? 'active' : 'mixed'
}

export function isInlineFormatStateActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: ParsedInlineFormat,
  selectedText?: string,
) {
  return getInlineFormatState(value, selection, format, selectedText) === 'active'
}
