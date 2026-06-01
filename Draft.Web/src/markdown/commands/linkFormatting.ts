import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import {
  getInlineResourceContextForSelection,
  getSelectedResourceLabelContext,
  isInlineResourceSelectionActive,
  type InlineResourceContext,
} from '../inline/linkImageInlineRanges'
import { normalizeInlineSelectionRange } from '../inline/normalizeInlineSelection'

export type MarkdownLinkContext = InlineResourceContext

export type MarkdownImageContext = MarkdownLinkContext

function getMarkdownResourceContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  kind: 'image' | 'link',
): MarkdownLinkContext | null {
  return getInlineResourceContextForSelection(value, selection, kind)
}

export function isSelectedLinkLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return getSelectedResourceLabelContext(value, selection, 'link')
}

export function isSelectedImageLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  return getSelectedResourceLabelContext(value, selection, 'image')
}

export function getMarkdownLinkContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext | null {
  return getMarkdownResourceContext(value, selection, 'link')
}

export function getMarkdownImageContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownImageContext | null {
  return getMarkdownResourceContext(value, selection, 'image')
}

export function getLinkEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext {
  const linkContext = getMarkdownLinkContext(value, selection)

  if (linkContext) {
    return linkContext
  }

  const { coreRange, coreText } = normalizeInlineSelectionRange(
    value,
    selection,
  )

  return {
    ...coreRange,
    label: coreText,
    sourceText: coreText,
    url: '',
  }
}

export function getImageEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownImageContext {
  const imageContext = getMarkdownImageContext(value, selection)

  if (imageContext) {
    return imageContext
  }

  const { coreRange, coreText } = normalizeInlineSelectionRange(
    value,
    selection,
  )

  return {
    ...coreRange,
    label: coreText,
    sourceText: coreText,
    url: '',
  }
}

export function createMarkdownLinkText(label: string, url: string) {
  return `[${label}](${url})`
}

export function createMarkdownImageText(label: string, url: string) {
  return `![${label}](${url})`
}

function getToggleResourceEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  kind: 'image' | 'link',
) {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const resourceContext = getInlineResourceContextForSelection(
    value,
    selection,
    kind,
    selectedText,
  )

  if (resourceContext) {
    const labelStartOffset =
      resourceContext.startOffset + (kind === 'image' ? 2 : 1)
    const labelEndOffset = labelStartOffset + resourceContext.label.length

    return {
      edits: [
        {
          endOffset: resourceContext.endOffset,
          startOffset: labelEndOffset,
          text: '',
        },
        {
          endOffset: labelStartOffset,
          startOffset: resourceContext.startOffset,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: resourceContext.startOffset + resourceContext.label.length,
        startOffset: resourceContext.startOffset,
      },
    }
  }

  const { endOffset, startOffset } = normalizedSelection.coreRange
  const openingText = kind === 'image' ? '![' : '['
  const cursorDelta = kind === 'image' ? 4 : 3

  return {
    edits: [
      { endOffset, startOffset: endOffset, text: ']()' },
      { endOffset: startOffset, startOffset, text: openingText },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: endOffset + cursorDelta,
      startOffset: endOffset + cursorDelta,
    },
  }
}

export function getToggleLinkEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return getToggleResourceEdits(value, selection, selectedText, 'link')
}

export function getToggleImageEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return getToggleResourceEdits(value, selection, selectedText, 'image')
}

export function isLinkSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return isInlineResourceSelectionActive(value, selection, 'link', selectedText)
}

export function isImageSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return isInlineResourceSelectionActive(value, selection, 'image', selectedText)
}
