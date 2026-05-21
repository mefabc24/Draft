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

type MultilineSegmentTransform = {
  lineEndOffset: number
  lineStartOffset: number
  newText: string
  oldText: string
  operation: 'none' | 'unwrap' | 'wrap'
  trailingNewline: string
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

function getInlineWhitespaceBounds(value: string) {
  const leadingWhitespaceLength = value.match(/^[^\S\r\n]*/u)?.[0].length ?? 0
  const trailingWhitespaceLength = value.match(/[^\S\r\n]*$/u)?.[0].length ?? 0

  return {
    contentEndOffset: value.length - trailingWhitespaceLength,
    contentStartOffset: leadingWhitespaceLength,
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

function getSelectionLineSegments(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const selectionText = value.slice(selection.startOffset, selection.endOffset)

  if (!selectionText.includes('\n')) {
    return null
  }

  const startLineOffset = value.lastIndexOf(
    '\n',
    Math.max(0, selection.startOffset - 1),
  ) + 1
  const effectiveEndOffset =
    selection.endOffset > selection.startOffset &&
    value[selection.endOffset - 1] === '\n'
      ? selection.endOffset - 1
      : selection.endOffset
  const endLineBreakOffset = value.indexOf('\n', effectiveEndOffset)
  const finalLineEndOffset =
    endLineBreakOffset === -1 ? value.length : endLineBreakOffset
  const segments: Array<{
    lineEndOffset: number
    lineStartOffset: number
    trailingNewline: string
  }> = []
  let lineStartOffset = startLineOffset

  while (lineStartOffset <= finalLineEndOffset) {
    const lineBreakOffset = value.indexOf('\n', lineStartOffset)
    const lineEndOffset =
      lineBreakOffset === -1 ? value.length : lineBreakOffset
    const trailingNewline =
      lineBreakOffset !== -1 && lineEndOffset < finalLineEndOffset
        ? '\n'
        : ''

    segments.push({
      lineEndOffset,
      lineStartOffset,
      trailingNewline,
    })

    if (lineBreakOffset === -1 || lineEndOffset >= finalLineEndOffset) {
      break
    }

    lineStartOffset = lineBreakOffset + 1
  }

  return segments
}

function isLineFullyWrapped(
  value: string,
  prefix: string,
  suffix = prefix,
) {
  const { contentEndOffset, contentStartOffset } =
    getInlineWhitespaceBounds(value)
  const contentText = value.slice(contentStartOffset, contentEndOffset)

  return isSelectedTextWrapped(contentText, prefix, suffix)
}

function getLineToggleText(
  value: string,
  shouldUnwrap: boolean,
  prefix: string,
  suffix = prefix,
) {
  if (isInlineWhitespaceOnly(value)) {
    return {
      operation: 'none' as const,
      text: value,
    }
  }

  const { contentEndOffset, contentStartOffset } =
    getInlineWhitespaceBounds(value)
  const leadingWhitespace = value.slice(0, contentStartOffset)
  const trailingWhitespace = value.slice(contentEndOffset)
  const contentText = value.slice(contentStartOffset, contentEndOffset)
  const isWrapped = isSelectedTextWrapped(contentText, prefix, suffix)

  if (shouldUnwrap) {
    return {
      operation: 'unwrap' as const,
      text: `${leadingWhitespace}${contentText.slice(
        prefix.length,
        contentText.length - suffix.length,
      )}${trailingWhitespace}`,
    }
  }

  if (isWrapped) {
    return {
      operation: 'none' as const,
      text: value,
    }
  }

  return {
    operation: 'wrap' as const,
    text: `${leadingWhitespace}${prefix}${contentText}${suffix}${trailingWhitespace}`,
  }
}

function mapMultilineLineOffset(
  offset: number,
  transform: MultilineSegmentTransform,
  prefix: string,
  suffix = prefix,
) {
  const localOffset = Math.min(
    Math.max(0, offset - transform.lineStartOffset),
    transform.oldText.length,
  )
  const { contentEndOffset, contentStartOffset } =
    getInlineWhitespaceBounds(transform.oldText)

  if (transform.operation === 'wrap') {
    if (localOffset < contentStartOffset) {
      return transform.lineStartOffset + localOffset
    }

    if (localOffset <= contentEndOffset) {
      return transform.lineStartOffset + localOffset + prefix.length
    }

    return (
      transform.lineStartOffset +
      localOffset +
      prefix.length +
      suffix.length
    )
  }

  if (transform.operation === 'unwrap') {
    const prefixEndOffset = contentStartOffset + prefix.length
    const suffixStartOffset = contentEndOffset - suffix.length

    if (localOffset <= contentStartOffset) {
      return transform.lineStartOffset + localOffset
    }

    if (localOffset <= prefixEndOffset) {
      return transform.lineStartOffset + contentStartOffset
    }

    if (localOffset <= suffixStartOffset) {
      return transform.lineStartOffset + localOffset - prefix.length
    }

    if (localOffset <= contentEndOffset) {
      return transform.lineStartOffset + suffixStartOffset - prefix.length
    }

    return (
      transform.lineStartOffset +
      localOffset -
      prefix.length -
      suffix.length
    )
  }

  return transform.lineStartOffset + localOffset
}

function mapMultilineSelectionOffset(
  offset: number,
  replacementStartOffset: number,
  transforms: MultilineSegmentTransform[],
  prefix: string,
  suffix = prefix,
) {
  let accumulatedDelta = 0

  for (const transform of transforms) {
    const oldSegmentLength =
      transform.oldText.length + transform.trailingNewline.length
    const newSegmentLength =
      transform.newText.length + transform.trailingNewline.length

    if (offset <= transform.lineEndOffset) {
      return (
        mapMultilineLineOffset(offset, transform, prefix, suffix) +
        accumulatedDelta
      )
    }

    if (offset <= transform.lineEndOffset + transform.trailingNewline.length) {
      return transform.lineStartOffset + accumulatedDelta + newSegmentLength
    }

    accumulatedDelta += newSegmentLength - oldSegmentLength
  }

  const lastTransform = transforms[transforms.length - 1]

  return (
    replacementStartOffset +
    transforms.reduce(
      (total, transform) =>
        total + transform.newText.length + transform.trailingNewline.length,
      0,
    ) -
    (lastTransform?.trailingNewline.length ?? 0)
  )
}

export function areSelectedNonEmptyLinesWrapped(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
) {
  const segments = getSelectionLineSegments(value, selection)

  if (!segments) {
    return false
  }

  const nonEmptyLines = segments
    .map((segment) => value.slice(segment.lineStartOffset, segment.lineEndOffset))
    .filter((line) => !isInlineWhitespaceOnly(line))

  return (
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => isLineFullyWrapped(line, prefix, suffix))
  )
}

function getToggleMultilineWrappedEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): ToggleWrappedEditResult | null {
  const segments = getSelectionLineSegments(value, selection)

  if (!segments) {
    return null
  }

  const shouldUnwrap = areSelectedNonEmptyLinesWrapped(
    value,
    selection,
    prefix,
    suffix,
  )
  const transforms = segments.map((segment) => {
    const oldText = value.slice(segment.lineStartOffset, segment.lineEndOffset)
    const result = getLineToggleText(oldText, shouldUnwrap, prefix, suffix)

    return {
      ...segment,
      newText: result.text,
      oldText,
      operation: result.operation,
    } satisfies MultilineSegmentTransform
  })
  const replacementStartOffset = transforms[0].lineStartOffset
  const replacementEndOffset = transforms[transforms.length - 1].lineEndOffset
  const replacementText = transforms
    .map((transform) => `${transform.newText}${transform.trailingNewline}`)
    .join('')

  return {
    edits: [
      {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
        text: replacementText,
      },
    ],
    nextSelection: {
      endOffset: mapMultilineSelectionOffset(
        selection.endOffset,
        replacementStartOffset,
        transforms,
        prefix,
        suffix,
      ),
      startOffset: mapMultilineSelectionOffset(
        selection.startOffset,
        replacementStartOffset,
        transforms,
        prefix,
        suffix,
      ),
    },
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

function isInlineCodeSelectionBoundary(
  offset: number,
  range: InlineFormatRange,
  boundary: 'end' | 'start',
) {
  return boundary === 'start'
    ? offset === range.fullRange.startOffset ||
        offset === range.innerContentRange.startOffset
    : offset === range.fullRange.endOffset ||
        offset === range.innerContentRange.endOffset
}

function getMergeSelectedInlineCodeSpansEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix: string,
): ToggleWrappedEditResult | null {
  if (
    prefix !== '`' ||
    suffix !== '`' ||
    /[\r\n]/u.test(value.slice(selection.startOffset, selection.endOffset))
  ) {
    return null
  }

  const lineRange = getLineSearchRange(value, selection)
  const selectedRanges = getInlineFormatRanges(value, lineRange, prefix, suffix)
    .filter(
      (range) =>
        range.innerContentRange.startOffset < selection.endOffset &&
        range.innerContentRange.endOffset > selection.startOffset,
    )
    .sort((a, b) => a.fullRange.startOffset - b.fullRange.startOffset)

  if (selectedRanges.length < 2) {
    return null
  }

  const firstRange = selectedRanges[0]
  const lastRange = selectedRanges[selectedRanges.length - 1]

  if (
    !isInlineCodeSelectionBoundary(selection.startOffset, firstRange, 'start') ||
    !isInlineCodeSelectionBoundary(selection.endOffset, lastRange, 'end')
  ) {
    return null
  }

  for (const range of selectedRanges) {
    if (
      range.innerContentRange.startOffset < selection.startOffset ||
      range.innerContentRange.endOffset > selection.endOffset
    ) {
      return null
    }
  }

  for (let index = 0; index < selectedRanges.length - 1; index += 1) {
    const currentRange = selectedRanges[index]
    const nextRange = selectedRanges[index + 1]

    if (
      !isInlineWhitespaceOnly(
        value.slice(currentRange.fullRange.endOffset, nextRange.fullRange.startOffset),
      )
    ) {
      return null
    }
  }

  const replacementStartOffset = firstRange.fullRange.startOffset
  const replacementEndOffset = lastRange.fullRange.endOffset
  let replacementInnerText = ''
  let lastOffset = replacementStartOffset

  for (const range of selectedRanges) {
    replacementInnerText += value.slice(lastOffset, range.fullRange.startOffset)
    replacementInnerText += value.slice(
      range.innerContentRange.startOffset,
      range.innerContentRange.endOffset,
    )
    lastOffset = range.fullRange.endOffset
  }

  replacementInnerText += value.slice(lastOffset, replacementEndOffset)

  return {
    edits: [
      {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
        text: `${prefix}${replacementInnerText}${suffix}`,
      },
    ],
    nextSelection: {
      endOffset:
        replacementStartOffset + prefix.length + replacementInnerText.length,
      startOffset: replacementStartOffset + prefix.length,
    },
  }
}

export function isSelectionComposedOfAdjacentInlineCodeSpans(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return getMergeSelectedInlineCodeSpansEdits(value, selection, '`', '`') !== null
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
  const multilineResult = getToggleMultilineWrappedEdits(
    value,
    selection,
    prefix,
    suffix,
  )

  if (multilineResult) {
    return multilineResult
  }

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
  const selectedInlineCodeMerge = getMergeSelectedInlineCodeSpansEdits(
    value,
    coreRange,
    prefix,
    suffix,
  )

  if (selectedInlineCodeMerge) {
    return selectedInlineCodeMerge
  }

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
