import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { getInlineWrapperContext } from './inlineFormatting'
import { isSelectedLinkLabel } from './linkFormatting'

export type EditableMarkdownSourceRange = MarkdownSelectionOffsetRange & {
  text: string
}

const EDITABLE_INLINE_WRAPPERS = [
  { prefix: '`', suffix: '`' },
  { prefix: '**', suffix: '**' },
  { prefix: '~~', suffix: '~~' },
  { prefix: '*', suffix: '*' },
]

function normalizeSourceRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
) {
  const startOffset = Math.max(
    0,
    Math.min(value.length, selection.startOffset),
  )
  const endOffset = Math.max(
    startOffset,
    Math.min(value.length, selection.endOffset),
  )

  return { endOffset, startOffset }
}

function expandSourceRangeOnce(
  value: string,
  range: MarkdownSelectionOffsetRange,
): MarkdownSelectionOffsetRange | null {
  for (const wrapper of EDITABLE_INLINE_WRAPPERS) {
    const wrapperContext = getInlineWrapperContext(
      value,
      range,
      wrapper.prefix,
      wrapper.suffix,
    )

    if (wrapperContext) {
      return {
        endOffset: wrapperContext.closeEndOffset,
        startOffset: wrapperContext.openStartOffset,
      }
    }
  }

  const linkContext = isSelectedLinkLabel(value, range)

  if (linkContext.isSelectedLinkLabel) {
    return {
      endOffset: linkContext.linkEndOffset + 1,
      startOffset: range.startOffset - 1,
    }
  }

  return null
}

export function getEditableMarkdownSourceRange(
  value: string,
  selection: MarkdownSelectionOffsetRange,
): EditableMarkdownSourceRange | null {
  let range = normalizeSourceRange(value, selection)

  if (range.startOffset >= range.endOffset) {
    return null
  }

  for (let expansionCount = 0; expansionCount < 12; expansionCount += 1) {
    const expandedRange = expandSourceRangeOnce(value, range)

    if (!expandedRange) {
      break
    }

    range = normalizeSourceRange(value, expandedRange)
  }

  return {
    ...range,
    text: value.slice(range.startOffset, range.endOffset),
  }
}
