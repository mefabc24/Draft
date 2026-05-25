import type { MarkdownSelectionOffsetRange } from '../markdownTypes'
import { getInlineWrapperContext } from './inlineFormatting'
import { isSelectedImageLabel, isSelectedLinkLabel } from './linkFormatting'

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

  const imageContext = isSelectedImageLabel(value, range)

  if (imageContext.isSelectedLinkLabel) {
    return {
      endOffset: imageContext.linkEndOffset + 1,
      startOffset: imageContext.resourceStartOffset ?? range.startOffset - 2,
    }
  }

  const linkContext = isSelectedLinkLabel(value, range)

  if (linkContext.isSelectedLinkLabel) {
    return {
      endOffset: linkContext.linkEndOffset + 1,
      startOffset: linkContext.resourceStartOffset ?? range.startOffset - 1,
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

function getVisibleMarkdownTextRange(
  value: string,
  baseOffset = 0,
): MarkdownSelectionOffsetRange | null {
  if (value.length === 0) {
    return null
  }

  const linkLabelEndOffset = value.indexOf('](')

  if (
    value.startsWith('![') &&
    linkLabelEndOffset > 2 &&
    value.endsWith(')')
  ) {
    return getVisibleMarkdownTextRange(
      value.slice(2, linkLabelEndOffset),
      baseOffset + 2,
    )
  }

  if (
    value.startsWith('[') &&
    linkLabelEndOffset > 1 &&
    value.endsWith(')')
  ) {
    return getVisibleMarkdownTextRange(
      value.slice(1, linkLabelEndOffset),
      baseOffset + 1,
    )
  }

  for (const wrapper of EDITABLE_INLINE_WRAPPERS) {
    if (
      value.startsWith(wrapper.prefix) &&
      value.endsWith(wrapper.suffix) &&
      value.length > wrapper.prefix.length + wrapper.suffix.length
    ) {
      return getVisibleMarkdownTextRange(
        value.slice(
          wrapper.prefix.length,
          value.length - wrapper.suffix.length,
        ),
        baseOffset + wrapper.prefix.length,
      )
    }
  }

  return {
    endOffset: baseOffset + value.length,
    startOffset: baseOffset,
  }
}

export function getPreviewSelectionRangeForEditedMarkdown(
  startOffset: number,
  text: string,
): MarkdownSelectionOffsetRange | null {
  const visibleRange = getVisibleMarkdownTextRange(text)

  if (!visibleRange || visibleRange.startOffset >= visibleRange.endOffset) {
    return null
  }

  return {
    endOffset: startOffset + visibleRange.endOffset,
    startOffset: startOffset + visibleRange.startOffset,
  }
}
