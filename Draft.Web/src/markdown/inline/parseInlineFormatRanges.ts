import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { inlineFormatConfig } from './inlineFormatConfig'
import type {
  InlineFormatRange,
  ParsedInlineFormat,
  WrappableInlineFormat,
} from './inlineFormatTypes'

type ResourceFormat = 'image' | 'link'

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

function isInlineMarkerAt(
  value: string,
  offset: number,
  marker: string,
) {
  return (
    value.slice(offset, offset + marker.length) === marker &&
    !isEscapedMarker(value, offset) &&
    (marker !== '*' || isSingleAsteriskMarker(value, offset))
  )
}

function getBacktickRunLength(value: string, offset: number) {
  let length = 0

  while (value[offset + length] === '`') {
    length += 1
  }

  return length
}

function isOffsetInsideRange(
  offset: number,
  range: MarkdownSelectionOffsetRange,
) {
  return range.startOffset <= offset && offset < range.endOffset
}

function isOffsetInsideRanges(
  offset: number,
  ranges: MarkdownSelectionOffsetRange[],
) {
  return ranges.some((range) => isOffsetInsideRange(offset, range))
}

function getLineRangeForOffset(value: string, offset: number) {
  const normalizedOffset = Math.max(0, Math.min(value.length, offset))
  const nextLineOffset = value.indexOf('\n', normalizedOffset)

  return {
    endOffset: nextLineOffset === -1 ? value.length : nextLineOffset,
    startOffset: value.lastIndexOf('\n', Math.max(0, normalizedOffset - 1)) + 1,
  }
}

export function getInlineLineRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const startRange = getLineRangeForOffset(value, selection.startOffset)
  const endRange = getLineRangeForOffset(
    value,
    Math.max(selection.startOffset, selection.endOffset - 1),
  )

  return {
    endOffset: endRange.endOffset,
    startOffset: startRange.startOffset,
  }
}

function parseInlineCodeRanges(
  value: string,
  lineRange: MarkdownSelectionOffsetRange,
) {
  const ranges: InlineFormatRange[] = []
  let offset = lineRange.startOffset

  while (offset < lineRange.endOffset) {
    if (value[offset] !== '`' || isEscapedMarker(value, offset)) {
      offset += 1
      continue
    }

    const markerLength = getBacktickRunLength(value, offset)
    const marker = value.slice(offset, offset + markerLength)
    let closeStart = -1
    let searchOffset = offset + markerLength

    while (searchOffset <= lineRange.endOffset - markerLength) {
      if (
        value.slice(searchOffset, searchOffset + markerLength) === marker &&
        !isEscapedMarker(value, searchOffset)
      ) {
        closeStart = searchOffset
        break
      }

      searchOffset += 1
    }

    if (closeStart === -1) {
      offset += markerLength
      continue
    }

    ranges.push({
      closingMarker: marker,
      contentEnd: closeStart,
      contentStart: offset + markerLength,
      markerEnd: closeStart + markerLength,
      markerStart: offset,
      openingMarker: marker,
      type: 'inlineCode',
    })

    offset = closeStart + markerLength
  }

  return ranges
}

function findNextMarkerOffset(
  value: string,
  range: MarkdownSelectionOffsetRange,
  marker: string,
  excludedRanges: MarkdownSelectionOffsetRange[],
  searchStartOffset = range.startOffset,
) {
  for (
    let offset = Math.max(range.startOffset, searchStartOffset);
    offset <= range.endOffset - marker.length;
    offset += 1
  ) {
    if (
      isOffsetInsideRanges(offset, excludedRanges) ||
      !isInlineMarkerAt(value, offset, marker)
    ) {
      continue
    }

    return offset
  }

  return -1
}

function getMarkerOffsets(
  value: string,
  range: MarkdownSelectionOffsetRange,
  marker: string,
  excludedRanges: MarkdownSelectionOffsetRange[],
) {
  const offsets: number[] = []

  for (
    let offset = range.startOffset;
    offset <= range.endOffset - marker.length;
    offset += 1
  ) {
    if (
      isOffsetInsideRanges(offset, excludedRanges) ||
      !isInlineMarkerAt(value, offset, marker)
    ) {
      continue
    }

    offsets.push(offset)
    offset += marker.length - 1
  }

  return offsets
}

function parseWrappedRanges(
  value: string,
  lineRange: MarkdownSelectionOffsetRange,
  type: WrappableInlineFormat,
  excludedRanges: MarkdownSelectionOffsetRange[],
) {
  if (type === 'inlineCode') {
    return parseInlineCodeRanges(value, lineRange)
  }

  const config = inlineFormatConfig[type]
  const ranges: InlineFormatRange[] = []

  if (config.openingMarker !== config.closingMarker) {
    let searchStartOffset = lineRange.startOffset

    while (searchStartOffset <= lineRange.endOffset - config.openingMarker.length) {
      const openStart = findNextMarkerOffset(
        value,
        lineRange,
        config.openingMarker,
        excludedRanges,
        searchStartOffset,
      )

      if (openStart === -1) {
        break
      }

      const openEnd = openStart + config.openingMarker.length
      const closeStart = findNextMarkerOffset(
        value,
        lineRange,
        config.closingMarker,
        excludedRanges,
        openEnd,
      )

      if (closeStart === -1) {
        break
      }

      ranges.push({
        closingMarker: config.closingMarker,
        contentEnd: closeStart,
        contentStart: openEnd,
        markerEnd: closeStart + config.closingMarker.length,
        markerStart: openStart,
        openingMarker: config.openingMarker,
        type,
      })

      searchStartOffset = closeStart + config.closingMarker.length
    }

    return ranges
  }

  const markerOffsets = getMarkerOffsets(
    value,
    lineRange,
    config.openingMarker,
    excludedRanges,
  )

  for (let index = 0; index < markerOffsets.length - 1; index += 2) {
    const openStart = markerOffsets[index]
    const closeStart = markerOffsets[index + 1]

    ranges.push({
      closingMarker: config.closingMarker,
      contentEnd: closeStart,
      contentStart: openStart + config.openingMarker.length,
      markerEnd: closeStart + config.closingMarker.length,
      markerStart: openStart,
      openingMarker: config.openingMarker,
      type,
    })
  }

  return ranges
}

function getResourceOpenText(type: ResourceFormat) {
  return type === 'image' ? '![' : '['
}

function getResourceLabelStart(markerStart: number, type: ResourceFormat) {
  return markerStart + (type === 'image' ? 2 : 1)
}

function findResourceLabelEnd(
  value: string,
  labelStart: number,
  lineRange: MarkdownSelectionOffsetRange,
) {
  const labelEnd = value.indexOf('](', labelStart)

  if (labelEnd === -1 || labelEnd >= lineRange.endOffset) {
    return null
  }

  const firstClose = value.indexOf(']', labelStart)
  const nestedOpen = value.indexOf('[', labelStart)

  if (
    firstClose !== labelEnd ||
    (nestedOpen !== -1 && nestedOpen < labelEnd)
  ) {
    return null
  }

  return labelEnd
}

function findResourceEnd(
  value: string,
  searchStart: number,
  lineRange: MarkdownSelectionOffsetRange,
) {
  let offset = searchStart

  while (offset < lineRange.endOffset) {
    if (value[offset] === ')' && !isEscapedMarker(value, offset)) {
      return offset + 1
    }

    offset += 1
  }

  return null
}

function parseResourceRanges(
  value: string,
  lineRange: MarkdownSelectionOffsetRange,
  type: ResourceFormat,
  codeRanges: MarkdownSelectionOffsetRange[],
) {
  const ranges: InlineFormatRange[] = []
  const openText = getResourceOpenText(type)
  let searchOffset = lineRange.startOffset

  while (searchOffset < lineRange.endOffset) {
    const markerStart = value.indexOf(openText, searchOffset)

    if (markerStart === -1 || markerStart >= lineRange.endOffset) {
      break
    }

    if (
      isOffsetInsideRanges(markerStart, codeRanges) ||
      (type === 'link' && value[markerStart - 1] === '!')
    ) {
      searchOffset = markerStart + openText.length
      continue
    }

    const contentStart = getResourceLabelStart(markerStart, type)
    const contentEnd = findResourceLabelEnd(value, contentStart, lineRange)

    if (contentEnd === null) {
      searchOffset = markerStart + openText.length
      continue
    }

    const markerEnd = findResourceEnd(value, contentEnd + 2, lineRange)

    if (markerEnd === null) {
      searchOffset = contentEnd + 2
      continue
    }

    const label = value.slice(contentStart, contentEnd)
    const url = value.slice(contentEnd + 2, markerEnd - 1)

    ranges.push({
      closingMarker: value.slice(contentEnd, markerEnd),
      contentEnd,
      contentStart,
      markerEnd,
      markerStart,
      metadata:
        type === 'link'
          ? { href: url, label }
          : { alt: label, label, src: url },
      openingMarker: openText,
      type,
    })

    searchOffset = markerEnd
  }

  return ranges
}

function getSyntaxExclusionRanges(ranges: InlineFormatRange[]) {
  return ranges.flatMap((range) => [
    {
      endOffset: range.contentStart,
      startOffset: range.markerStart,
    },
    {
      endOffset: range.markerEnd,
      startOffset: range.contentEnd,
    },
  ])
}

function sortInlineRanges(left: InlineFormatRange, right: InlineFormatRange) {
  return (
    left.markerStart - right.markerStart ||
    right.markerEnd - left.markerEnd ||
    left.contentStart - right.contentStart
  )
}

export function parseInlineFormatRanges(
  value: string,
  lineRange: MarkdownSelectionOffsetRange = {
    endOffset: value.length,
    startOffset: 0,
  },
) {
  const inlineCodeRanges = parseInlineCodeRanges(value, lineRange)
  const codeExclusions = inlineCodeRanges.map((range) => ({
    endOffset: range.markerEnd,
    startOffset: range.markerStart,
  }))
  const imageRanges = parseResourceRanges(
    value,
    lineRange,
    'image',
    codeExclusions,
  )
  const linkRanges = parseResourceRanges(
    value,
    lineRange,
    'link',
    codeExclusions,
  )
  const resourceSyntaxExclusions = getSyntaxExclusionRanges([
    ...imageRanges,
    ...linkRanges,
  ])
  const excludedRanges = [...codeExclusions, ...resourceSyntaxExclusions]
  const wrappedRanges = (
    [
      'bold',
      'italic',
      'strike',
      'underline',
      'spoiler',
      'highlight',
      'comment',
    ] satisfies WrappableInlineFormat[]
  ).flatMap((type) =>
    parseWrappedRanges(value, lineRange, type, excludedRanges),
  )

  return [
    ...inlineCodeRanges,
    ...imageRanges,
    ...linkRanges,
    ...wrappedRanges,
  ].sort(sortInlineRanges)
}

export function parseInlineFormatRangesForSelection(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return parseInlineFormatRanges(value, getInlineLineRange(value, selection))
}

export function getInlineFormatRangesByType(
  ranges: InlineFormatRange[],
  type: ParsedInlineFormat,
) {
  return ranges.filter((range) => range.type === type)
}
