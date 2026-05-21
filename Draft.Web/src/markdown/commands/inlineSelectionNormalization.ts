import type { MarkdownSelectionOffsetRange } from '../markdownTypes'

export type NormalizedInlineSelectionRange = {
  coreRange: MarkdownSelectionOffsetRange
  coreText: string
  hasEdgeWhitespace: boolean
  leadingWhitespace: string
  originalRange: MarkdownSelectionOffsetRange
  originalText: string
  trailingWhitespace: string
}

const INLINE_EDGE_WRAPPERS = [
  { prefix: '**', suffix: '**' },
  { prefix: '~~', suffix: '~~' },
  { prefix: '`', suffix: '`' },
  { prefix: '*', suffix: '*' },
]

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

function isInlineEdgeWhitespace(value: string) {
  return /[^\S\r\n]/u.test(value)
}

function countLeadingInlineWhitespace(value: string) {
  let count = 0

  while (count < value.length && isInlineEdgeWhitespace(value[count])) {
    count += 1
  }

  return count
}

function countTrailingInlineWhitespace(value: string) {
  let count = 0

  while (
    count < value.length &&
    isInlineEdgeWhitespace(value[value.length - 1 - count])
  ) {
    count += 1
  }

  return count
}

function peelTrailingCrossedWrappers(
  value: string,
  range: MarkdownSelectionOffsetRange,
) {
  let endOffset = range.endOffset
  let peeled = true

  while (peeled && range.startOffset < endOffset) {
    peeled = false

    for (const wrapper of INLINE_EDGE_WRAPPERS) {
      const closeStartOffset = endOffset - wrapper.suffix.length
      const openStartOffset = range.startOffset - wrapper.prefix.length

      if (
        closeStartOffset < range.startOffset ||
        openStartOffset < 0 ||
        value.slice(closeStartOffset, endOffset) !== wrapper.suffix ||
        value.slice(openStartOffset, range.startOffset) !== wrapper.prefix
      ) {
        continue
      }

      endOffset = closeStartOffset
      peeled = true
      break
    }
  }

  return { endOffset, startOffset: range.startOffset }
}

function peelLeadingCrossedWrappers(
  value: string,
  range: MarkdownSelectionOffsetRange,
) {
  let startOffset = range.startOffset
  let peeled = true

  while (peeled && startOffset < range.endOffset) {
    peeled = false

    for (const wrapper of INLINE_EDGE_WRAPPERS) {
      const openEndOffset = startOffset + wrapper.prefix.length
      const closeEndOffset = range.endOffset + wrapper.suffix.length

      if (
        openEndOffset > range.endOffset ||
        closeEndOffset > value.length ||
        value.slice(startOffset, openEndOffset) !== wrapper.prefix ||
        value.slice(range.endOffset, closeEndOffset) !== wrapper.suffix
      ) {
        continue
      }

      startOffset = openEndOffset
      peeled = true
      break
    }
  }

  return { endOffset: range.endOffset, startOffset }
}

/*
Manual validation targets:
- Another **rule** style. with rule or rule selected keeps Bold active.
- Another rule style. with rule selected plus edge space adds **rule** with the space outside.
- Another **rule** style. with rule selected plus edge space removes only the markers.
- Inline code and [rule](https://example.com) use rule as the meaningful label/core.
*/
export function normalizeInlineSelectionRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText?: string,
): NormalizedInlineSelectionRange {
  const originalRange = clampSelectionRange(value, selection)
  const originalText =
    selectedText ?? value.slice(originalRange.startOffset, originalRange.endOffset)

  if (/[\r\n]/u.test(originalText)) {
    return {
      coreRange: originalRange,
      coreText: originalText,
      hasEdgeWhitespace: false,
      leadingWhitespace: '',
      originalRange,
      originalText,
      trailingWhitespace: '',
    }
  }

  const leadingWhitespaceLength = countLeadingInlineWhitespace(originalText)
  const trailingWhitespaceLength = countTrailingInlineWhitespace(originalText)
  const coreStartOffset = originalRange.startOffset + leadingWhitespaceLength
  const coreEndOffset = originalRange.endOffset - trailingWhitespaceLength

  if (coreStartOffset >= coreEndOffset) {
    return {
      coreRange: originalRange,
      coreText: originalText,
      hasEdgeWhitespace: false,
      leadingWhitespace: '',
      originalRange,
      originalText,
      trailingWhitespace: '',
    }
  }

  let coreRange = {
    endOffset: coreEndOffset,
    startOffset: coreStartOffset,
  }

  if (trailingWhitespaceLength > 0) {
    coreRange = peelTrailingCrossedWrappers(value, coreRange)
  }

  if (leadingWhitespaceLength > 0) {
    coreRange = peelLeadingCrossedWrappers(value, coreRange)
  }

  return {
    coreRange,
    coreText: value.slice(coreRange.startOffset, coreRange.endOffset),
    hasEdgeWhitespace:
      leadingWhitespaceLength > 0 || trailingWhitespaceLength > 0,
    leadingWhitespace: originalText.slice(0, leadingWhitespaceLength),
    originalRange,
    originalText,
    trailingWhitespace:
      trailingWhitespaceLength > 0
        ? originalText.slice(originalText.length - trailingWhitespaceLength)
        : '',
  }
}
