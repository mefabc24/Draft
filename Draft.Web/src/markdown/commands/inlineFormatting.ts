import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import { normalizeInlineSelectionRange } from './inlineSelectionNormalization'

type InlineWrapperContext = {
  closeEndOffset: number
  closeStartOffset: number
  openEndOffset: number
  openStartOffset: number
}

export type ContainingInlineWrapperContext = {
  closingMarkerRange: MarkdownSelectionOffsetRange
  fullRange: MarkdownSelectionOffsetRange
  innerContentRange: MarkdownSelectionOffsetRange
  openingMarkerRange: MarkdownSelectionOffsetRange
  selectedCoreRange: MarkdownSelectionOffsetRange
}

type InlineFormatRange = {
  fullRange: MarkdownSelectionOffsetRange
  innerContentRange: MarkdownSelectionOffsetRange
}

type ToggleWrappedEditResult = {
  edits: MarkdownTextEdit[]
  nextSelection: MarkdownSelectionOffsetRange
}

const INLINE_WRAPPERS = [
  { prefix: '`', suffix: '`' },
  { prefix: '**', suffix: '**' },
  { prefix: '~~', suffix: '~~' },
  { prefix: '*', suffix: '*' },
]

const PARTIAL_SPLIT_GUARD_WRAPPERS = [
  { prefix: '`', suffix: '`' },
  { prefix: '**', suffix: '**' },
  { prefix: '~~', suffix: '~~' },
  { prefix: '*', suffix: '*' },
]

function isEscapedMarker(value: string, offset: number) {
  let slashCount = 0

  for (
    let currentOffset = offset - 1;
    currentOffset >= 0 && value[currentOffset] === '\\';
    currentOffset -= 1
  ) {
    slashCount += 1
  }

  return slashCount % 2 === 1
}

function isSingleAsteriskMarker(value: string, offset: number) {
  return value[offset - 1] !== '*' && value[offset + 1] !== '*'
}

function isInlineMarkerAt(value: string, offset: number, marker: string) {
  return (
    value.slice(offset, offset + marker.length) === marker &&
    !isEscapedMarker(value, offset) &&
    (marker !== '*' || isSingleAsteriskMarker(value, offset))
  )
}

function getLineSearchRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownSelectionOffsetRange {
  const startSearchOffset = Math.max(0, selection.startOffset - 1)
  const nextLineOffset = value.indexOf('\n', selection.endOffset)

  return {
    endOffset: nextLineOffset === -1 ? value.length : nextLineOffset,
    startOffset: value.lastIndexOf('\n', startSearchOffset) + 1,
  }
}

function getInlineMarkerOffsets(
  value: string,
  range: MarkdownSelectionOffsetRange,
  marker: string,
) {
  const offsets: number[] = []

  for (
    let offset = range.startOffset;
    offset <= range.endOffset - marker.length;
    offset += 1
  ) {
    if (!isInlineMarkerAt(value, offset, marker)) {
      continue
    }

    offsets.push(offset)
    offset += marker.length - 1
  }

  return offsets
}

function isRangeInsideRange(
  range: MarkdownSelectionOffsetRange,
  container: MarkdownSelectionOffsetRange,
) {
  return (
    range.startOffset >= container.startOffset &&
    range.endOffset <= container.endOffset
  )
}

function isTextRangeEmpty(value: string) {
  return value.length === 0
}

function wrapTextIfNeeded(text: string, prefix: string, suffix: string) {
  return isTextRangeEmpty(text) ? '' : `${prefix}${text}${suffix}`
}

function splitTrailingInlineWhitespace(value: string) {
  const trailingWhitespace = value.match(/[^\S\r\n]*$/u)?.[0] ?? ''

  return {
    coreText: value.slice(0, value.length - trailingWhitespace.length),
    trailingWhitespace,
  }
}

function splitLeadingInlineWhitespace(value: string) {
  const leadingWhitespace = value.match(/^[^\S\r\n]*/u)?.[0] ?? ''

  return {
    coreText: value.slice(leadingWhitespace.length),
    leadingWhitespace,
  }
}

function isInlineWhitespaceOnly(value: string) {
  return /^[^\S\r\n]*$/u.test(value)
}

function isAdjacentInlineMergeSupported(prefix: string, suffix: string) {
  return prefix === suffix && prefix !== '`'
}

function getInlineFormatRanges(
  value: string,
  range: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): InlineFormatRange[] {
  if (prefix !== suffix) {
    return []
  }

  const markerOffsets = getInlineMarkerOffsets(value, range, prefix)
  const ranges: InlineFormatRange[] = []

  for (let index = 0; index < markerOffsets.length - 1; index += 2) {
    const openStartOffset = markerOffsets[index]
    const openEndOffset = openStartOffset + prefix.length
    const closeStartOffset = markerOffsets[index + 1]
    const closeEndOffset = closeStartOffset + suffix.length

    ranges.push({
      fullRange: {
        endOffset: closeEndOffset,
        startOffset: openStartOffset,
      },
      innerContentRange: {
        endOffset: closeStartOffset,
        startOffset: openEndOffset,
      },
    })
  }

  return ranges
}

function getAdjacentInlineMergeRanges(
  value: string,
  ranges: InlineFormatRange[],
  selection: MarkdownSelectionOffsetRange,
) {
  const sortedRanges = [...ranges].sort(
    (a, b) => a.fullRange.startOffset - b.fullRange.startOffset,
  )
  let nearestLeftIndex = -1
  let nearestRightIndex = -1

  for (let index = 0; index < sortedRanges.length; index += 1) {
    const range = sortedRanges[index]

    if (
      range.fullRange.endOffset <= selection.startOffset &&
      isInlineWhitespaceOnly(
        value.slice(range.fullRange.endOffset, selection.startOffset),
      )
    ) {
      nearestLeftIndex = index
    }

    if (
      nearestRightIndex === -1 &&
      range.fullRange.startOffset >= selection.endOffset &&
      isInlineWhitespaceOnly(
        value.slice(selection.endOffset, range.fullRange.startOffset),
      )
    ) {
      nearestRightIndex = index
    }
  }

  let leftStartIndex = nearestLeftIndex

  while (
    leftStartIndex > 0 &&
    isInlineWhitespaceOnly(
      value.slice(
        sortedRanges[leftStartIndex - 1].fullRange.endOffset,
        sortedRanges[leftStartIndex].fullRange.startOffset,
      ),
    )
  ) {
    leftStartIndex -= 1
  }

  let rightEndIndex = nearestRightIndex

  while (
    rightEndIndex !== -1 &&
    rightEndIndex < sortedRanges.length - 1 &&
    isInlineWhitespaceOnly(
      value.slice(
        sortedRanges[rightEndIndex].fullRange.endOffset,
        sortedRanges[rightEndIndex + 1].fullRange.startOffset,
      ),
    )
  ) {
    rightEndIndex += 1
  }

  return {
    leftRanges:
      nearestLeftIndex === -1
        ? []
        : sortedRanges.slice(leftStartIndex, nearestLeftIndex + 1),
    rightRanges:
      nearestRightIndex === -1
        ? []
        : sortedRanges.slice(nearestRightIndex, rightEndIndex + 1),
  }
}

export function getInlineWrapperContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): InlineWrapperContext | null {
  let { endOffset, startOffset } = selection
  const seenFormats = new Set<string>()

  while (startOffset >= 0 && endOffset <= value.length) {
    let expanded = false

    for (const wrapper of INLINE_WRAPPERS) {
      const openStartOffset = startOffset - wrapper.prefix.length
      const closeEndOffset = endOffset + wrapper.suffix.length

      if (
        seenFormats.has(`${wrapper.prefix}:${wrapper.suffix}`) ||
        openStartOffset < 0 ||
        closeEndOffset > value.length
      ) {
        continue
      }

      const hasWrapper =
        value.slice(openStartOffset, startOffset) === wrapper.prefix &&
        value.slice(endOffset, closeEndOffset) === wrapper.suffix

      if (!hasWrapper) {
        continue
      }

      if (wrapper.prefix === prefix && wrapper.suffix === suffix) {
        return {
          closeEndOffset,
          closeStartOffset: endOffset,
          openEndOffset: startOffset,
          openStartOffset,
        }
      }

      seenFormats.add(`${wrapper.prefix}:${wrapper.suffix}`)
      startOffset = openStartOffset
      endOffset = closeEndOffset
      expanded = true
      break
    }

    if (!expanded) {
      return null
    }
  }

  return null
}

export function findContainingInlineFormatRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): ContainingInlineWrapperContext | null {
  if (
    selection.startOffset >= selection.endOffset ||
    /[\r\n]/u.test(value.slice(selection.startOffset, selection.endOffset))
  ) {
    return null
  }

  const lineRange = getLineSearchRange(value, selection)

  if (prefix !== suffix) {
    return null
  }

  let bestContext: ContainingInlineWrapperContext | null = null

  for (const range of getInlineFormatRanges(value, lineRange, prefix, suffix)) {
    if (
      range.innerContentRange.startOffset > selection.startOffset ||
      range.innerContentRange.endOffset < selection.endOffset
    ) {
      continue
    }

    const context = {
      closingMarkerRange: {
        endOffset: range.fullRange.endOffset,
        startOffset: range.innerContentRange.endOffset,
      },
      fullRange: range.fullRange,
      innerContentRange: range.innerContentRange,
      openingMarkerRange: {
        endOffset: range.innerContentRange.startOffset,
        startOffset: range.fullRange.startOffset,
      },
      selectedCoreRange: selection,
    } satisfies ContainingInlineWrapperContext

    if (
      bestContext === null ||
      context.fullRange.endOffset - context.fullRange.startOffset <
        bestContext.fullRange.endOffset - bestContext.fullRange.startOffset
    ) {
      bestContext = context
    }
  }

  if (!bestContext || prefix === '`') {
    return bestContext
  }

  const codeContext = findContainingInlineFormatRange(value, selection, '`')

  if (
    codeContext &&
    isRangeInsideRange(bestContext.fullRange, codeContext.innerContentRange)
  ) {
    return null
  }

  return bestContext
}

export function isSelectedTextWrapped(
  selectedText: string,
  prefix: string,
  suffix = prefix,
) {
  if (
    !selectedText.startsWith(prefix) ||
    !selectedText.endsWith(suffix) ||
    selectedText.length <= prefix.length + suffix.length
  ) {
    return false
  }

  return (
    prefix !== '*' ||
    (!selectedText.startsWith('**') && !selectedText.endsWith('**'))
  )
}

function wouldSplitNestedInlineRange(
  value: string,
  context: ContainingInlineWrapperContext,
  prefix: string,
  suffix: string,
) {
  for (const wrapper of PARTIAL_SPLIT_GUARD_WRAPPERS) {
    if (wrapper.prefix === prefix && wrapper.suffix === suffix) {
      continue
    }

    const nestedContext = findContainingInlineFormatRange(
      value,
      context.selectedCoreRange,
      wrapper.prefix,
      wrapper.suffix,
    )

    if (
      nestedContext &&
      isRangeInsideRange(nestedContext.fullRange, context.innerContentRange) &&
      !isRangeInsideRange(nestedContext.innerContentRange, context.selectedCoreRange)
    ) {
      return true
    }
  }

  return false
}

function getRemoveContainingInlineFormatEdits(
  value: string,
  context: ContainingInlineWrapperContext,
  prefix: string,
  suffix: string,
): ToggleWrappedEditResult {
  if (wouldSplitNestedInlineRange(value, context, prefix, suffix)) {
    // Avoid creating crossing Markdown markers when the selection sits inside
    // another inline range; unwrap the requested parent format conservatively.
    const text = value.slice(
      context.innerContentRange.startOffset,
      context.innerContentRange.endOffset,
    )

    return {
      edits: [{ ...context.fullRange, text }],
      nextSelection: {
        endOffset:
          context.fullRange.startOffset +
          (context.selectedCoreRange.endOffset -
            context.innerContentRange.startOffset),
        startOffset:
          context.fullRange.startOffset +
          (context.selectedCoreRange.startOffset -
            context.innerContentRange.startOffset),
      },
    }
  }

  const beforeText = value.slice(
    context.innerContentRange.startOffset,
    context.selectedCoreRange.startOffset,
  )
  const selectedText = value.slice(
    context.selectedCoreRange.startOffset,
    context.selectedCoreRange.endOffset,
  )
  const afterText = value.slice(
    context.selectedCoreRange.endOffset,
    context.innerContentRange.endOffset,
  )
  const before = splitTrailingInlineWhitespace(beforeText)
  const after = splitLeadingInlineWhitespace(afterText)
  const wrappedBefore = wrapTextIfNeeded(before.coreText, prefix, suffix)
  const wrappedAfter = wrapTextIfNeeded(after.coreText, prefix, suffix)
  const text = `${wrappedBefore}${before.trailingWhitespace}${selectedText}${after.leadingWhitespace}${wrappedAfter}`
  const selectedStartOffset =
    context.fullRange.startOffset +
    wrappedBefore.length +
    before.trailingWhitespace.length

  return {
    edits: [{ ...context.fullRange, text }],
    nextSelection: {
      endOffset: selectedStartOffset + selectedText.length,
      startOffset: selectedStartOffset,
    },
  }
}

export function normalizeAdjacentInlineFormattingRanges(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): ToggleWrappedEditResult | null {
  if (
    !isAdjacentInlineMergeSupported(prefix, suffix) ||
    /[\r\n]/u.test(value.slice(selection.startOffset, selection.endOffset))
  ) {
    return null
  }

  const lineRange = getLineSearchRange(value, selection)
  const ranges = getInlineFormatRanges(value, lineRange, prefix, suffix)
  const { leftRanges, rightRanges } = getAdjacentInlineMergeRanges(
    value,
    ranges,
    selection,
  )

  if (leftRanges.length === 0 && rightRanges.length === 0) {
    return null
  }

  const selectedText = value.slice(selection.startOffset, selection.endOffset)
  const replacementStartOffset =
    leftRanges[0]?.fullRange.startOffset ?? selection.startOffset
  const replacementEndOffset =
    rightRanges[rightRanges.length - 1]?.fullRange.endOffset ??
    selection.endOffset
  let replacementInnerText = ''
  let lastOffset = replacementStartOffset

  for (const range of leftRanges) {
    replacementInnerText += value.slice(lastOffset, range.fullRange.startOffset)
    replacementInnerText += value.slice(
      range.innerContentRange.startOffset,
      range.innerContentRange.endOffset,
    )
    lastOffset = range.fullRange.endOffset
  }

  replacementInnerText += value.slice(lastOffset, selection.startOffset)
  const selectedInnerStartOffset = replacementInnerText.length
  replacementInnerText += selectedText
  lastOffset = selection.endOffset

  for (const range of rightRanges) {
    replacementInnerText += value.slice(lastOffset, range.fullRange.startOffset)
    replacementInnerText += value.slice(
      range.innerContentRange.startOffset,
      range.innerContentRange.endOffset,
    )
    lastOffset = range.fullRange.endOffset
  }

  replacementInnerText += value.slice(lastOffset, replacementEndOffset)

  const replacementText = `${prefix}${replacementInnerText}${suffix}`
  const selectedStartOffset =
    replacementStartOffset + prefix.length + selectedInnerStartOffset

  return {
    edits: [
      {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
        text: replacementText,
      },
    ],
    nextSelection: {
      endOffset: selectedStartOffset + selectedText.length,
      startOffset: selectedStartOffset,
    },
  }
}

export function getToggleWrappedEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  prefix: string,
  suffix = prefix,
) {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const { coreRange, coreText } = normalizedSelection
  const { endOffset, startOffset } = coreRange
  const hasSelectedWrapper = isSelectedTextWrapped(
    coreText,
    prefix,
    suffix,
  )

  if (hasSelectedWrapper) {
    const text = coreText.slice(
      prefix.length,
      coreText.length - suffix.length,
    )

    return {
      edits: [{ ...coreRange, text }],
      nextSelection: {
        endOffset: startOffset + text.length,
        startOffset,
      },
    }
  }

  const wrapperContext = getInlineWrapperContext(
    value,
    coreRange,
    prefix,
    suffix,
  )

  if (wrapperContext) {
    return {
      edits: [
        {
          endOffset: wrapperContext.closeEndOffset,
          startOffset: wrapperContext.closeStartOffset,
          text: '',
        },
        {
          endOffset: wrapperContext.openEndOffset,
          startOffset: wrapperContext.openStartOffset,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: endOffset - prefix.length,
        startOffset: startOffset - prefix.length,
      },
    }
  }

  const containingContext = findContainingInlineFormatRange(
    value,
    coreRange,
    prefix,
    suffix,
  )

  if (containingContext) {
    return getRemoveContainingInlineFormatEdits(
      value,
      containingContext,
      prefix,
      suffix,
    )
  }

  const adjacentNormalization = normalizeAdjacentInlineFormattingRanges(
    value,
    coreRange,
    prefix,
    suffix,
  )

  if (adjacentNormalization) {
    return adjacentNormalization
  }

  return {
    edits: [
      { endOffset, startOffset: endOffset, text: suffix },
      { endOffset: startOffset, startOffset, text: prefix },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: endOffset + prefix.length,
      startOffset: startOffset + prefix.length,
    },
  }
}
