import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'

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

export function getLinkEditState(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): MarkdownLinkContext {
  const linkContext = getMarkdownLinkContext(value, selection)

  if (linkContext) {
    return linkContext
  }

  return {
    ...selection,
    label: value.slice(selection.startOffset, selection.endOffset),
    sourceText: value.slice(selection.startOffset, selection.endOffset),
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
  const { endOffset, startOffset } = selection
  const linkMatch = selectedText.match(/^\[([\s\S]+)\]\([^)]+\)$/u)

  if (linkMatch) {
    const text = linkMatch[1]

    return {
      edits: [{ ...selection, text }],
      nextSelection: {
        endOffset: startOffset + text.length,
        startOffset,
      },
    }
  }

  const linkCloseStartOffset = endOffset
  const linkLabelContext = isSelectedLinkLabel(value, selection)

  if (linkLabelContext.isSelectedLinkLabel) {
    return {
      edits: [
        {
          endOffset: linkLabelContext.linkEndOffset + 1,
          startOffset: linkCloseStartOffset,
          text: '',
        },
        {
          endOffset: startOffset,
          startOffset: startOffset - 1,
          text: '',
        },
      ] satisfies MarkdownTextEdit[],
      nextSelection: {
        endOffset: endOffset - 1,
        startOffset: startOffset - 1,
      },
    }
  }

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
    /^\[[\s\S]+\]\([^)]+\)$/u.test(selectedText) ||
    isSelectedLinkLabel(value, selection).isSelectedLinkLabel
  )
}
