import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'

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
