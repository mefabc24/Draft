import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { normalizeInlineSelectionRange } from './normalizeInlineSelection'
import {
  getInlineLineRange,
  parseInlineFormatRanges,
} from './parseInlineFormatRanges'
import type { InlineFormatRange } from './inlineFormatTypes'

export type InlineResourceKind = 'image' | 'link'

export type InlineResourceContext = MarkdownSelectionOffsetRange & {
  label: string
  sourceText: string
  url: string
}

function getResourceLabelInset(kind: InlineResourceKind) {
  return kind === 'image' ? 2 : 1
}

function getResourceUrl(range: InlineFormatRange) {
  return range.type === 'image'
    ? range.metadata?.src ?? ''
    : range.metadata?.href ?? ''
}

function getResourceLabel(range: InlineFormatRange) {
  return range.metadata?.label ?? ''
}

function getResourceContext(
  value: string,
  range: InlineFormatRange,
): InlineResourceContext {
  return {
    endOffset: range.markerEnd,
    label: getResourceLabel(range),
    sourceText: value.slice(range.markerStart, range.markerEnd),
    startOffset: range.markerStart,
    url: getResourceUrl(range),
  }
}

function getInlineResourceRanges(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: InlineResourceKind,
) {
  return parseInlineFormatRanges(value, getInlineLineRange(value, selection))
    .filter((range) => range.type === kind)
    .sort(
      (a, b) =>
        a.markerEnd - a.markerStart - (b.markerEnd - b.markerStart) ||
        b.markerStart - a.markerStart,
    )
}

export function getInlineResourceContextForSelection(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: InlineResourceKind,
  selectedText?: string,
): InlineResourceContext | null {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const { coreRange } = normalizedSelection

  if (coreRange.startOffset >= coreRange.endOffset) {
    return null
  }

  for (const range of getInlineResourceRanges(value, coreRange, kind)) {
    const selectionInsideLabel =
      range.contentStart <= coreRange.startOffset &&
      coreRange.endOffset <= range.contentEnd
    const selectionContainsResource =
      coreRange.startOffset <= range.markerStart &&
      range.markerEnd <= coreRange.endOffset

    if (selectionInsideLabel || selectionContainsResource) {
      return getResourceContext(value, range)
    }
  }

  return null
}

export function getSelectedResourceLabelContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: InlineResourceKind,
) {
  const labelInset = getResourceLabelInset(kind)

  for (const range of getInlineResourceRanges(value, selection, kind)) {
    if (
      selection.startOffset === range.contentStart &&
      selection.endOffset === range.contentEnd
    ) {
      return {
        isSelectedLinkLabel: true,
        linkEndOffset: range.markerEnd - 1,
        resourceStartOffset: range.markerStart,
      }
    }

    if (
      selection.startOffset === range.markerStart + labelInset &&
      selection.endOffset === range.contentEnd
    ) {
      return {
        isSelectedLinkLabel: true,
        linkEndOffset: range.markerEnd - 1,
        resourceStartOffset: range.markerStart,
      }
    }
  }

  return {
    isSelectedLinkLabel: false,
    linkEndOffset: -1,
    resourceStartOffset: null,
  }
}

export function isInlineResourceSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: InlineResourceKind,
  selectedText?: string,
) {
  return (
    getInlineResourceContextForSelection(value, selection, kind, selectedText) !==
    null
  )
}
