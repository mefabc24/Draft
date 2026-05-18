import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'

type InlineWrapperContext = {
  closeEndOffset: number
  closeStartOffset: number
  openEndOffset: number
  openStartOffset: number
}

const INLINE_WRAPPERS = [
  { prefix: '`', suffix: '`' },
  { prefix: '**', suffix: '**' },
  { prefix: '~~', suffix: '~~' },
  { prefix: '*', suffix: '*' },
]

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

export function getToggleWrappedEdits(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
  prefix: string,
  suffix = prefix,
) {
  const { endOffset, startOffset } = selection
  const hasSelectedWrapper = isSelectedTextWrapped(
    selectedText,
    prefix,
    suffix,
  )

  if (hasSelectedWrapper) {
    const text = selectedText.slice(
      prefix.length,
      selectedText.length - suffix.length,
    )

    return {
      edits: [{ ...selection, text }],
      nextSelection: {
        endOffset: startOffset + text.length,
        startOffset,
      },
    }
  }

  const wrapperContext = getInlineWrapperContext(
    value,
    selection,
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
