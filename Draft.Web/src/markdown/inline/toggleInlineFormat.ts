import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import {
  getInlineFormatMarkers,
  inlineFormatConfig,
  wrappableInlineFormats,
} from './inlineFormatConfig'
import { getInlineFormatState } from './getInlineFormatState'
import {
  doInlineRangesIntersect,
  getInlineRangeContentRange,
  getInlineRangeFullRange,
  getInlineRangeSyntaxRanges,
  getMergeableInlineFormatApplicationRange,
  isInlineRangeInside,
  isInlineWhitespaceOnly,
} from './mergeInlineFormatRanges'
import { normalizeInlineSelectionRange } from './normalizeInlineSelection'
import {
  getInlineLineRange,
  parseInlineFormatRanges,
  parseInlineFormatRangesForSelection,
} from './parseInlineFormatRanges'
import type {
  ContainingInlineFormatRange,
  InlineFormatRange,
  ToggleInlineFormatMode,
  ToggleInlineFormatResult,
  WrappableInlineFormat,
} from './inlineFormatTypes'

function wrapTextIfNeeded(
  text: string,
  openingMarker: string,
  closingMarker: string,
) {
  return text.length === 0 ? '' : `${openingMarker}${text}${closingMarker}`
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

function isSelectedTextWrapped(
  selectedText: string,
  openingMarker: string,
  closingMarker = openingMarker,
) {
  if (
    !selectedText.startsWith(openingMarker) ||
    !selectedText.endsWith(closingMarker) ||
    selectedText.length <= openingMarker.length + closingMarker.length
  ) {
    return false
  }

  return (
    openingMarker !== '*' ||
    (!selectedText.startsWith('**') && !selectedText.endsWith('**'))
  )
}

function isLineFullyWrapped(
  value: string,
  openingMarker: string,
  closingMarker = openingMarker,
) {
  const { contentEndOffset, contentStartOffset } =
    getInlineWhitespaceBounds(value)
  const contentText = value.slice(contentStartOffset, contentEndOffset)

  return isSelectedTextWrapped(contentText, openingMarker, closingMarker)
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
      lineBreakOffset !== -1 && lineEndOffset < finalLineEndOffset ? '\n' : ''

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

export function areSelectedNonEmptyLinesWrapped(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  openingMarker: string,
  closingMarker = openingMarker,
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
    nonEmptyLines.every((line) =>
      isLineFullyWrapped(line, openingMarker, closingMarker),
    )
  )
}

function getLineToggleText(
  value: string,
  shouldUnwrap: boolean,
  openingMarker: string,
  closingMarker = openingMarker,
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
  const isWrapped = isSelectedTextWrapped(
    contentText,
    openingMarker,
    closingMarker,
  )

  if (shouldUnwrap) {
    if (!isWrapped) {
      return {
        operation: 'none' as const,
        text: value,
      }
    }

    return {
      operation: 'unwrap' as const,
      text: `${leadingWhitespace}${contentText.slice(
        openingMarker.length,
        contentText.length - closingMarker.length,
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
    text: `${leadingWhitespace}${openingMarker}${contentText}${closingMarker}${trailingWhitespace}`,
  }
}

type MultilineSegmentTransform = {
  lineEndOffset: number
  lineStartOffset: number
  newText: string
  oldText: string
  operation: 'none' | 'unwrap' | 'wrap'
  trailingNewline: string
}

function mapMultilineLineOffset(
  offset: number,
  transform: MultilineSegmentTransform,
  openingMarker: string,
  closingMarker = openingMarker,
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
      return transform.lineStartOffset + localOffset + openingMarker.length
    }

    return (
      transform.lineStartOffset +
      localOffset +
      openingMarker.length +
      closingMarker.length
    )
  }

  if (transform.operation === 'unwrap') {
    const prefixEndOffset = contentStartOffset + openingMarker.length
    const suffixStartOffset = contentEndOffset - closingMarker.length

    if (localOffset <= contentStartOffset) {
      return transform.lineStartOffset + localOffset
    }

    if (localOffset <= prefixEndOffset) {
      return transform.lineStartOffset + contentStartOffset
    }

    if (localOffset <= suffixStartOffset) {
      return transform.lineStartOffset + localOffset - openingMarker.length
    }

    if (localOffset <= contentEndOffset) {
      return transform.lineStartOffset + suffixStartOffset - openingMarker.length
    }

    return (
      transform.lineStartOffset +
      localOffset -
      openingMarker.length -
      closingMarker.length
    )
  }

  return transform.lineStartOffset + localOffset
}

function mapMultilineSelectionOffset(
  offset: number,
  replacementStartOffset: number,
  transforms: MultilineSegmentTransform[],
  openingMarker: string,
  closingMarker = openingMarker,
) {
  let accumulatedDelta = 0

  for (const transform of transforms) {
    const oldSegmentLength =
      transform.oldText.length + transform.trailingNewline.length
    const newSegmentLength =
      transform.newText.length + transform.trailingNewline.length

    if (offset <= transform.lineEndOffset) {
      return (
        mapMultilineLineOffset(
          offset,
          transform,
          openingMarker,
          closingMarker,
        ) + accumulatedDelta
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

function getToggleMultilineInlineFormatEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  openingMarker: string,
  closingMarker = openingMarker,
  mode: ToggleInlineFormatMode = 'toggle',
): ToggleInlineFormatResult | null {
  const segments = getSelectionLineSegments(value, selection)

  if (!segments) {
    return null
  }

  const shouldUnwrap = areSelectedNonEmptyLinesWrapped(
    value,
    selection,
    openingMarker,
    closingMarker,
  )
  const operationShouldUnwrap =
    mode === 'unwrap' || (mode === 'toggle' && shouldUnwrap)
  const transforms = segments.map((segment) => {
    const oldText = value.slice(segment.lineStartOffset, segment.lineEndOffset)
    const result = getLineToggleText(
      oldText,
      operationShouldUnwrap,
      openingMarker,
      closingMarker,
    )

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
        openingMarker,
        closingMarker,
      ),
      startOffset: mapMultilineSelectionOffset(
        selection.startOffset,
        replacementStartOffset,
        transforms,
        openingMarker,
        closingMarker,
      ),
    },
  }
}

function getSortedRangesForSelection(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return parseInlineFormatRanges(value, getInlineLineRange(value, selection))
}

export function findContainingInlineFormatRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: WrappableInlineFormat,
): ContainingInlineFormatRange | null {
  if (
    selection.startOffset >= selection.endOffset ||
    /[\r\n]/u.test(value.slice(selection.startOffset, selection.endOffset))
  ) {
    return null
  }

  const ranges = getSortedRangesForSelection(value, selection)
    .filter((range) => range.type === format)
    .sort(
      (a, b) =>
        a.markerEnd - a.markerStart - (b.markerEnd - b.markerStart) ||
        b.markerStart - a.markerStart,
    )

  for (const range of ranges) {
    const selectionInsideContent =
      range.contentStart <= selection.startOffset &&
      selection.endOffset <= range.contentEnd
    const selectionContainsFullRange =
      selection.startOffset <= range.markerStart &&
      range.markerEnd <= selection.endOffset

    if (!selectionInsideContent && !selectionContainsFullRange) {
      continue
    }

    const selectedCoreRange = selectionInsideContent
      ? selection
      : {
          endOffset: range.contentEnd,
          startOffset: range.contentStart,
        }

    return {
      closingMarkerRange: {
        endOffset: range.markerEnd,
        startOffset: range.contentEnd,
      },
      fullRange: getInlineRangeFullRange(range),
      innerContentRange: getInlineRangeContentRange(range),
      openingMarkerRange: {
        endOffset: range.contentStart,
        startOffset: range.markerStart,
      },
      range,
      selectedCoreRange,
    }
  }

  return null
}

function wouldSplitNestedInlineRange(
  value: string,
  context: ContainingInlineFormatRange,
  format: WrappableInlineFormat,
) {
  const ranges = getSortedRangesForSelection(value, context.fullRange)

  return ranges.some((range) => {
    if (range.type === format || range.type === 'image' || range.type === 'link') {
      return false
    }

    return (
      isInlineRangeInside(
        getInlineRangeFullRange(range),
        context.innerContentRange,
      ) &&
      doInlineRangesIntersect(
        getInlineRangeFullRange(range),
        context.selectedCoreRange,
      ) &&
      !isInlineRangeInside(
        getInlineRangeFullRange(range),
        context.selectedCoreRange,
      )
    )
  })
}

function getRemoveContainingInlineFormatEdits(
  value: string,
  context: ContainingInlineFormatRange,
  format: WrappableInlineFormat,
): ToggleInlineFormatResult {
  const markers = getInlineFormatMarkers(format)

  if (wouldSplitNestedInlineRange(value, context, format)) {
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
  const wrappedBefore = wrapTextIfNeeded(
    before.coreText,
    markers.openingMarker,
    markers.closingMarker,
  )
  const wrappedAfter = wrapTextIfNeeded(
    after.coreText,
    markers.openingMarker,
    markers.closingMarker,
  )
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

function getOffsetWithoutMarkerRanges(
  offset: number,
  startOffset: number,
  markerRanges: MarkdownSelectionOffsetRange[],
) {
  const normalizedOffset = Math.max(startOffset, offset)
  let currentOffset = startOffset
  let nextOffset = 0

  for (const markerRange of markerRanges) {
    if (markerRange.endOffset <= startOffset) {
      continue
    }

    if (normalizedOffset <= markerRange.startOffset) {
      return nextOffset + Math.max(0, normalizedOffset - currentOffset)
    }

    if (currentOffset < markerRange.startOffset) {
      nextOffset += markerRange.startOffset - currentOffset
    }

    if (normalizedOffset <= markerRange.endOffset) {
      return nextOffset
    }

    currentOffset = markerRange.endOffset
  }

  return nextOffset + Math.max(0, normalizedOffset - currentOffset)
}

function getTextWithoutMarkerRanges(
  value: string,
  startOffset: number,
  endOffset: number,
  markerRanges: MarkdownSelectionOffsetRange[],
) {
  let text = ''
  let currentOffset = startOffset

  for (const markerRange of markerRanges) {
    if (
      markerRange.endOffset <= startOffset ||
      markerRange.startOffset >= endOffset
    ) {
      continue
    }

    const textEndOffset = Math.min(markerRange.startOffset, endOffset)

    if (currentOffset < textEndOffset) {
      text += value.slice(currentOffset, textEndOffset)
    }

    currentOffset = Math.max(
      currentOffset,
      Math.min(markerRange.endOffset, endOffset),
    )
  }

  if (currentOffset < endOffset) {
    text += value.slice(currentOffset, endOffset)
  }

  return text
}

function getApplyMergeableInlineFormatEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: WrappableInlineFormat,
): ToggleInlineFormatResult | null {
  const ranges = parseInlineFormatRangesForSelection(value, selection)
  const {
    ranges: selectedRanges,
    replacementEndOffset,
    replacementStartOffset,
  } = getMergeableInlineFormatApplicationRange(
    value,
    ranges,
    selection,
    format,
  )

  if (selectedRanges.length === 0) {
    return null
  }

  const markers = getInlineFormatMarkers(format)
  const markerRanges = selectedRanges
    .flatMap(getInlineRangeSyntaxRanges)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
  const replacementInnerText = getTextWithoutMarkerRanges(
    value,
    replacementStartOffset,
    replacementEndOffset,
    markerRanges,
  )
  const selectedStartOffset =
    replacementStartOffset +
    markers.openingMarker.length +
    getOffsetWithoutMarkerRanges(
      selection.startOffset,
      replacementStartOffset,
      markerRanges,
    )
  const selectedEndOffset =
    replacementStartOffset +
    markers.openingMarker.length +
    getOffsetWithoutMarkerRanges(
      selection.endOffset,
      replacementStartOffset,
      markerRanges,
    )

  return {
    edits: [
      {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
        text: `${markers.openingMarker}${replacementInnerText}${markers.closingMarker}`,
      },
    ],
    nextSelection: {
      endOffset: selectedEndOffset,
      startOffset: selectedStartOffset,
    },
  }
}

function getInlineCodeMarkerForText(text: string) {
  const runs = text.match(/`+/gu) ?? []
  const maxRunLength = runs.reduce((max, run) => Math.max(max, run.length), 0)

  return '`'.repeat(maxRunLength + 1)
}

function compareRangesForWrapping(left: InlineFormatRange, right: InlineFormatRange) {
  return (
    left.markerStart - right.markerStart ||
    right.markerEnd - left.markerEnd ||
    left.contentStart - right.contentStart
  )
}

function getInlineCodeReplacementRanges(
  ranges: InlineFormatRange[],
  selection: MarkdownSelectionOffsetRange,
) {
  const selectedRanges = new Set<InlineFormatRange>()
  let replacementEndOffset = selection.endOffset
  let replacementStartOffset = selection.startOffset
  let changed = true

  while (changed) {
    changed = false

    for (const range of ranges) {
      if (
        selectedRanges.has(range) ||
        range.type === 'image' ||
        range.type === 'link'
      ) {
        continue
      }

      const currentReplacementRange = {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
      }

      if (
        !doInlineRangesIntersect(
          getInlineRangeFullRange(range),
          currentReplacementRange,
        )
      ) {
        continue
      }

      selectedRanges.add(range)
      replacementEndOffset = Math.max(replacementEndOffset, range.markerEnd)
      replacementStartOffset = Math.min(replacementStartOffset, range.markerStart)
      changed = true
    }
  }

  return {
    ranges: ranges
      .filter((range) => selectedRanges.has(range))
      .sort(compareRangesForWrapping),
    replacementEndOffset,
    replacementStartOffset,
  }
}

function getReplacementBoundaryOffsets(
  startOffset: number,
  endOffset: number,
  selection: MarkdownSelectionOffsetRange,
  markerRanges: MarkdownSelectionOffsetRange[],
) {
  const offsets = [
    startOffset,
    endOffset,
    Math.max(startOffset, Math.min(endOffset, selection.startOffset)),
    Math.max(startOffset, Math.min(endOffset, selection.endOffset)),
  ]

  for (const range of markerRanges) {
    if (range.endOffset <= startOffset || range.startOffset >= endOffset) {
      continue
    }

    offsets.push(Math.max(startOffset, range.startOffset))
    offsets.push(Math.min(endOffset, range.endOffset))
  }

  return Array.from(new Set(offsets)).sort((a, b) => a - b)
}

function isMarkerSpan(
  span: MarkdownSelectionOffsetRange,
  markerRanges: MarkdownSelectionOffsetRange[],
) {
  return markerRanges.some(
    (range) =>
      span.startOffset >= range.startOffset && span.endOffset <= range.endOffset,
  )
}

function getActiveRangesAtOffset(ranges: InlineFormatRange[], offset: number) {
  return ranges
    .filter((range) => range.contentStart <= offset && offset < range.contentEnd)
    .sort(compareRangesForWrapping)
}

function getRangeMarkers(range: InlineFormatRange) {
  if (range.type === 'inlineCode') {
    return {
      closingMarker: range.closingMarker,
      openingMarker: range.openingMarker,
    }
  }

  if (range.type === 'image' || range.type === 'link') {
    return null
  }

  return getInlineFormatMarkers(range.type)
}

function getFormattedFragmentText(text: string, ranges: InlineFormatRange[]) {
  if (text.length === 0) {
    return ''
  }

  const leading = splitLeadingInlineWhitespace(text)
  const trailing = splitTrailingInlineWhitespace(leading.coreText)

  if (trailing.coreText.length === 0) {
    return `${leading.leadingWhitespace}${trailing.trailingWhitespace}`
  }

  let wrappedText = trailing.coreText

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const markers = getRangeMarkers(ranges[index])

    if (!markers) {
      continue
    }

    wrappedText = `${markers.openingMarker}${wrappedText}${markers.closingMarker}`
  }

  return `${leading.leadingWhitespace}${wrappedText}${trailing.trailingWhitespace}`
}

function getApplyInlineCodeEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): ToggleInlineFormatResult | null {
  const ranges = parseInlineFormatRangesForSelection(value, selection)
  const {
    ranges: selectedRanges,
    replacementEndOffset,
    replacementStartOffset,
  } = getInlineCodeReplacementRanges(ranges, selection)

  if (selectedRanges.length === 0) {
    return null
  }

  const markerRanges = selectedRanges
    .flatMap(getInlineRangeSyntaxRanges)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
  const boundaries = getReplacementBoundaryOffsets(
    replacementStartOffset,
    replacementEndOffset,
    selection,
    markerRanges,
  )
  let selectedInnerText = ''

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const span = {
      endOffset: boundaries[index + 1],
      startOffset: boundaries[index],
    }

    if (
      span.startOffset >= span.endOffset ||
      isMarkerSpan(span, markerRanges) ||
      !doInlineRangesIntersect(span, selection)
    ) {
      continue
    }

    selectedInnerText += value.slice(span.startOffset, span.endOffset)
  }

  if (selectedInnerText.length === 0) {
    return null
  }

  const codeMarker = getInlineCodeMarkerForText(selectedInnerText)
  const selectedText = `${codeMarker}${selectedInnerText}${codeMarker}`
  let replacementText = ''
  let selectedStartOffset = replacementStartOffset + codeMarker.length
  let insertedSelectedText = false

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const span = {
      endOffset: boundaries[index + 1],
      startOffset: boundaries[index],
    }

    if (span.startOffset >= span.endOffset || isMarkerSpan(span, markerRanges)) {
      continue
    }

    if (doInlineRangesIntersect(span, selection)) {
      if (!insertedSelectedText) {
        selectedStartOffset =
          replacementStartOffset + replacementText.length + codeMarker.length
        replacementText += selectedText
        insertedSelectedText = true
      }

      continue
    }

    replacementText += getFormattedFragmentText(
      value.slice(span.startOffset, span.endOffset),
      getActiveRangesAtOffset(selectedRanges, span.startOffset),
    )
  }

  return {
    edits: [
      {
        endOffset: replacementEndOffset,
        startOffset: replacementStartOffset,
        text: replacementText,
      },
    ],
    nextSelection: {
      endOffset: selectedStartOffset + selectedInnerText.length,
      startOffset: selectedStartOffset,
    },
  }
}

function getSimpleWrapEdits(
  selection: MarkdownSelectionOffsetRange,
  openingMarker: string,
  closingMarker: string,
): ToggleInlineFormatResult {
  return {
    edits: [
      { endOffset: selection.endOffset, startOffset: selection.endOffset, text: closingMarker },
      { endOffset: selection.startOffset, startOffset: selection.startOffset, text: openingMarker },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: selection.endOffset + openingMarker.length,
      startOffset: selection.startOffset + openingMarker.length,
    },
  }
}

export function getToggleInlineFormatEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  format: WrappableInlineFormat,
  mode: ToggleInlineFormatMode = 'toggle',
): ToggleInlineFormatResult {
  const markers = getInlineFormatMarkers(format)
  const multilineResult = getToggleMultilineInlineFormatEdits(
    value,
    selection,
    markers.openingMarker,
    markers.closingMarker,
    mode,
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
  const state = getInlineFormatState(value, selection, format, selectedText)
  const shouldUnwrap =
    mode === 'unwrap' || (mode === 'toggle' && state === 'active')

  if (!shouldUnwrap) {
    if (mode === 'wrap' && state === 'active') {
      return { edits: [], nextSelection: normalizedSelection.originalRange }
    }

    if (format === 'inlineCode') {
      const codeMarker = getInlineCodeMarkerForText(coreText)
      const appliedInlineCode = getApplyInlineCodeEdits(value, coreRange)

      return (
        appliedInlineCode ??
        getSimpleWrapEdits(coreRange, codeMarker, codeMarker)
      )
    }

    const appliedInlineFormat = getApplyMergeableInlineFormatEdits(
      value,
      coreRange,
      format,
    )

    return (
      appliedInlineFormat ??
      getSimpleWrapEdits(
        coreRange,
        markers.openingMarker,
        markers.closingMarker,
      )
    )
  }

  if (
    isSelectedTextWrapped(coreText, markers.openingMarker, markers.closingMarker)
  ) {
    const text = coreText.slice(
      markers.openingMarker.length,
      coreText.length - markers.closingMarker.length,
    )

    return {
      edits: [{ ...coreRange, text }],
      nextSelection: {
        endOffset: coreRange.startOffset + text.length,
        startOffset: coreRange.startOffset,
      },
    }
  }

  const containingContext = findContainingInlineFormatRange(
    value,
    coreRange,
    format,
  )

  if (containingContext) {
    return getRemoveContainingInlineFormatEdits(
      value,
      containingContext,
      format,
    )
  }

  return { edits: [], nextSelection: coreRange }
}

export function isSelectionComposedOfAdjacentInlineCodeSpans(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const ranges = parseInlineFormatRangesForSelection(value, selection)
  const { ranges: selectedRanges } = getInlineCodeReplacementRanges(
    ranges,
    selection,
  )

  return selectedRanges.some((range) => range.type === 'inlineCode')
}

export function normalizeAdjacentInlineFormattingRanges(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: WrappableInlineFormat,
): ToggleInlineFormatResult | null {
  if (
    !inlineFormatConfig[format].mergeAdjacent ||
    /[\r\n]/u.test(value.slice(selection.startOffset, selection.endOffset))
  ) {
    return null
  }

  return getApplyMergeableInlineFormatEdits(value, selection, format)
}

export function getInlineWrapperContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  format: WrappableInlineFormat,
) {
  const lineRange = getInlineLineRange(value, selection)
  const ranges = parseInlineFormatRanges(value, lineRange)

  for (const range of ranges) {
    if (
      range.type !== format ||
      range.contentStart !== selection.startOffset ||
      range.contentEnd !== selection.endOffset
    ) {
      continue
    }

    return {
      closeEndOffset: range.markerEnd,
      closeStartOffset: range.contentEnd,
      openEndOffset: range.contentStart,
      openStartOffset: range.markerStart,
    }
  }

  return null
}

export function getWrappableInlineFormats() {
  return wrappableInlineFormats
}
