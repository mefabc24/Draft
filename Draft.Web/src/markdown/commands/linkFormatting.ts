import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'
import {
  normalizeInlineSelectionRange,
  type NormalizedInlineSelectionRange,
} from './inlineSelectionNormalization'

export type MarkdownLinkContext = MarkdownSelectionOffsetRange & {
  label: string
  sourceText: string
  url: string
}

export function isSelectedLinkLabel(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const { endOffset, startOffset } = selection
  const linkClosePrefix = value.slice(endOffset, endOffset + 2)
  const linkEndOffset =
    linkClosePrefix === '](' ? value.indexOf(')', endOffset + 2) : -1

  return {
    isSelectedLinkLabel:
      startOffset > 0 && value[startOffset - 1] === '[' && linkEndOffset !== -1,
    linkEndOffset,
  }
}

export function getMarkdownLinkContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext | null {
  return getMarkdownLinkContextForNormalizedSelection(
    value,
    normalizeInlineSelectionRange(value, selection),
  )
}

function getExactMarkdownLinkContext(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext | null {
  const { endOffset, startOffset } = selection
  const selectedText = value.slice(startOffset, endOffset)
  const fullLinkMatch = selectedText.match(/^\[([\s\S]*)\]\(([^)]*)\)$/u)

  if (fullLinkMatch) {
    return {
      endOffset,
      label: fullLinkMatch[1],
      sourceText: selectedText,
      startOffset,
      url: fullLinkMatch[2],
    }
  }

  const labelStartOffset = value.lastIndexOf('[', startOffset)
  const labelEndOffset = value.indexOf('](', endOffset)

  if (
    labelStartOffset === -1 ||
    labelEndOffset === -1 ||
    labelStartOffset >= startOffset ||
    labelEndOffset < endOffset
  ) {
    return null
  }

  const linkEndOffset = value.indexOf(')', labelEndOffset + 2)

  if (linkEndOffset === -1) {
    return null
  }

  const previousCloseOffset = value.lastIndexOf(')', startOffset)
  const previousOpenOffset = value.lastIndexOf('[', startOffset - 1)

  if (
    previousCloseOffset > labelStartOffset ||
    previousOpenOffset > labelStartOffset
  ) {
    return null
  }

  return {
    endOffset: linkEndOffset + 1,
    label: value.slice(labelStartOffset + 1, labelEndOffset),
    sourceText: value.slice(labelStartOffset, linkEndOffset + 1),
    startOffset: labelStartOffset,
    url: value.slice(labelEndOffset + 2, linkEndOffset),
  }
}

function getCrossedMarkdownLinkContext(
  value: string,
  normalizedSelection: NormalizedInlineSelectionRange,
): MarkdownLinkContext | null {
  const { coreRange, leadingWhitespace, trailingWhitespace } =
    normalizedSelection
  const { endOffset, startOffset } = coreRange

  if (trailingWhitespace.length > 0 && startOffset > 0) {
    const labelEndOffset = value.indexOf('](', startOffset)
    const linkEndOffset =
      labelEndOffset === -1 ? -1 : value.indexOf(')', labelEndOffset + 2)

    if (
      value[startOffset - 1] === '[' &&
      labelEndOffset > startOffset &&
      labelEndOffset < endOffset &&
      linkEndOffset + 1 === endOffset
    ) {
      return {
        endOffset,
        label: value.slice(startOffset, labelEndOffset),
        sourceText: value.slice(startOffset - 1, endOffset),
        startOffset: startOffset - 1,
        url: value.slice(labelEndOffset + 2, linkEndOffset),
      }
    }
  }

  if (leadingWhitespace.length > 0 && value[startOffset] === '[') {
    const labelEndOffset = value.indexOf('](', startOffset)
    const linkEndOffset =
      labelEndOffset === -1 ? -1 : value.indexOf(')', labelEndOffset + 2)

    if (
      labelEndOffset > startOffset + 1 &&
      labelEndOffset === endOffset &&
      linkEndOffset !== -1
    ) {
      return {
        endOffset: linkEndOffset + 1,
        label: value.slice(startOffset + 1, labelEndOffset),
        sourceText: value.slice(startOffset, linkEndOffset + 1),
        startOffset,
        url: value.slice(labelEndOffset + 2, linkEndOffset),
      }
    }
  }

  return null
}

function getMarkdownLinkContextForNormalizedSelection(
  value: string,
  normalizedSelection: NormalizedInlineSelectionRange,
): MarkdownLinkContext | null {
  return (
    getExactMarkdownLinkContext(value, normalizedSelection.coreRange) ??
    getCrossedMarkdownLinkContext(value, normalizedSelection)
  )
}

export function getLinkEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext {
  const normalizedSelection = normalizeInlineSelectionRange(value, selection)
  const linkContext = getMarkdownLinkContextForNormalizedSelection(
    value,
    normalizedSelection,
  )

  if (linkContext) {
    return linkContext
  }

  const { coreRange, coreText } = normalizedSelection

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

export function getToggleLinkEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const linkContext = getMarkdownLinkContextForNormalizedSelection(
    value,
    normalizedSelection,
  )

  if (linkContext) {
    const labelStartOffset = linkContext.startOffset + 1
    const labelEndOffset = labelStartOffset + linkContext.label.length

    return {
      edits: [
        {
          endOffset: linkContext.endOffset,
          startOffset: labelEndOffset,
          text: '',
        },
        {
          endOffset: labelStartOffset,
          startOffset: linkContext.startOffset,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: linkContext.startOffset + linkContext.label.length,
        startOffset: linkContext.startOffset,
      },
    }
  }

  const { endOffset, startOffset } = normalizedSelection.coreRange

  return {
    edits: [
      { endOffset, startOffset: endOffset, text: ']()' },
      { endOffset: startOffset, startOffset, text: '[' },
    ] satisfies MarkdownTextEdit[],
    nextSelection: {
      endOffset: endOffset + 3,
      startOffset: endOffset + 3,
    },
  }
}

export function isLinkSelectionActive(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return (
    getMarkdownLinkContextForNormalizedSelection(
      value,
      normalizeInlineSelectionRange(value, selection, selectedText),
    ) !== null
  )
}
