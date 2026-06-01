import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import { getWrappableInlineFormatForMarkers } from '../inline/inlineFormatConfig'
import { getInlineFormatState } from '../inline/getInlineFormatState'
import {
  areSelectedNonEmptyLinesWrapped,
  findContainingInlineFormatRange as findContainingParsedInlineFormatRange,
  getInlineWrapperContext as getParsedInlineWrapperContext,
  getToggleInlineFormatEdits,
  isSelectionComposedOfAdjacentInlineCodeSpans,
  normalizeAdjacentInlineFormattingRanges as normalizeParsedAdjacentInlineFormattingRanges,
} from '../inline/toggleInlineFormat'
import type {
  ContainingInlineFormatRange,
  ToggleInlineFormatMode,
} from '../inline/inlineFormatTypes'

export type ContainingInlineWrapperContext = Omit<
  ContainingInlineFormatRange,
  'range'
>

type InlineWrapperContext = {
  closeEndOffset: number
  closeStartOffset: number
  openEndOffset: number
  openStartOffset: number
}

type ToggleWrappedEditResult = {
  edits: MarkdownTextEdit[]
  nextSelection: MarkdownSelectionOffsetRange
}

export type ToggleWrappedMode = ToggleInlineFormatMode

function getFormatForMarkers(prefix: string, suffix = prefix) {
  return getWrappableInlineFormatForMarkers(prefix, suffix)
}

export function getInlineWrapperContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): InlineWrapperContext | null {
  const format = getFormatForMarkers(prefix, suffix)

  return format ? getParsedInlineWrapperContext(value, selection, format) : null
}

export function findContainingInlineFormatRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): ContainingInlineWrapperContext | null {
  const format = getFormatForMarkers(prefix, suffix)
  const context = format
    ? findContainingParsedInlineFormatRange(value, selection, format)
    : null

  if (!context) {
    return null
  }

  return {
    closingMarkerRange: context.closingMarkerRange,
    fullRange: context.fullRange,
    innerContentRange: context.innerContentRange,
    openingMarkerRange: context.openingMarkerRange,
    selectedCoreRange: context.selectedCoreRange,
  }
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

export function isInlineFormatActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  prefix: string,
  suffix = prefix,
) {
  if (value.slice(selection.startOffset, selection.endOffset).includes('\n')) {
    return areSelectedNonEmptyLinesWrapped(value, selection, prefix, suffix)
  }

  const format = getFormatForMarkers(prefix, suffix)

  return format
    ? getInlineFormatState(value, selection, format, selectedText) === 'active'
    : false
}

export { areSelectedNonEmptyLinesWrapped }

export { isSelectionComposedOfAdjacentInlineCodeSpans }

export function normalizeAdjacentInlineFormattingRanges(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  prefix: string,
  suffix = prefix,
): ToggleWrappedEditResult | null {
  const format = getFormatForMarkers(prefix, suffix)

  return format
    ? normalizeParsedAdjacentInlineFormattingRanges(value, selection, format)
    : null
}

export function getToggleWrappedEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  prefix: string,
  suffix = prefix,
  mode: ToggleWrappedMode = 'toggle',
): ToggleWrappedEditResult {
  const format = getFormatForMarkers(prefix, suffix)

  if (!format) {
    return { edits: [], nextSelection: selection }
  }

  return getToggleInlineFormatEdits(
    value,
    selection,
    selectedText,
    format,
    mode,
  )
}
