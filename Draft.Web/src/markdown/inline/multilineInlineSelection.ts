import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { getInlineSyntaxRanges } from './mergeInlineFormatRanges'
import { parseInlineFormatRangesForSelection } from './parseInlineFormatRanges'

function clampSelectionRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const startOffset = Math.max(
    0,
    Math.min(value.length, selection.startOffset),
  )
  const endOffset = Math.max(
    startOffset,
    Math.min(value.length, selection.endOffset),
  )

  return { endOffset, startOffset }
}

export function selectionSpansMultipleLines(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return /[\r\n]/u.test(
    value.slice(selection.startOffset, selection.endOffset),
  )
}

function getLineStartOffset(value: string, offset: number) {
  return value.lastIndexOf('\n', Math.max(0, offset - 1)) + 1
}

function getLineEnd(value: string, lineStartOffset: number) {
  const lineBreakOffset = value.indexOf('\n', lineStartOffset)

  if (lineBreakOffset === -1) {
    return {
      lineEndOffset: value.length,
      nextLineStartOffset: value.length + 1,
    }
  }

  return {
    lineEndOffset:
      lineBreakOffset > lineStartOffset && value[lineBreakOffset - 1] === '\r'
        ? lineBreakOffset - 1
        : lineBreakOffset,
    nextLineStartOffset: lineBreakOffset + 1,
  }
}

function subtractRanges(
  range: MarkdownSelectionOffsetRange,
  excludedRanges: MarkdownSelectionOffsetRange[],
) {
  let spans = [range]

  for (const excludedRange of excludedRanges) {
    spans = spans.flatMap((span) => {
      if (
        span.startOffset >= excludedRange.endOffset ||
        span.endOffset <= excludedRange.startOffset
      ) {
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

function getVisibleInlineSpans(
  value: string,
  range: MarkdownSelectionOffsetRange,
) {
  const syntaxRanges = getInlineSyntaxRanges(
    parseInlineFormatRangesForSelection(value, range),
  )

  return subtractRanges(range, syntaxRanges)
}

function isInlineWhitespaceOnly(value: string) {
  return /^[^\S\r\n]*$/u.test(value)
}

function getVisibleLineLocalRange(
  value: string,
  range: MarkdownSelectionOffsetRange,
) {
  const visibleSpans = getVisibleInlineSpans(value, range)
  const visibleText = visibleSpans
    .map((span) => value.slice(span.startOffset, span.endOffset))
    .join('')

  if (visibleSpans.length === 0 || isInlineWhitespaceOnly(visibleText)) {
    return null
  }

  return {
    endOffset: visibleSpans[visibleSpans.length - 1].endOffset,
    startOffset: visibleSpans[0].startOffset,
  }
}

export function splitSelectionIntoLineLocalRanges(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const normalizedSelection = clampSelectionRange(value, selection)
  const ranges: MarkdownSelectionOffsetRange[] = []
  let lineStartOffset = getLineStartOffset(
    value,
    normalizedSelection.startOffset,
  )

  while (
    lineStartOffset < normalizedSelection.endOffset &&
    lineStartOffset <= value.length
  ) {
    const { lineEndOffset, nextLineStartOffset } = getLineEnd(
      value,
      lineStartOffset,
    )
    const rawRange = {
      endOffset: Math.min(normalizedSelection.endOffset, lineEndOffset),
      startOffset: Math.max(normalizedSelection.startOffset, lineStartOffset),
    }

    if (rawRange.startOffset < rawRange.endOffset) {
      const visibleRange = getVisibleLineLocalRange(value, rawRange)

      if (visibleRange) {
        ranges.push(visibleRange)
      }
    }

    if (
      nextLineStartOffset > normalizedSelection.endOffset ||
      nextLineStartOffset > value.length
    ) {
      break
    }

    lineStartOffset = nextLineStartOffset
  }

  return ranges
}
