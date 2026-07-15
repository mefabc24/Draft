import type {
  ActiveFormats,
  MarkdownSelectionOffsetRange,
} from '../markdownTypes'
import { getInlineFormatState } from '../inline/getInlineFormatState'
import {
  isImageSelectionActive,
  isLinkSelectionActive,
} from '../commands/linkFormatting'

export const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  spoiler: false,
  highlight: false,
  comment: false,
  link: false,
  image: false,
  badge: false,
}

export function detectActiveInlineFormats(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  const selectionSpansLines = /[\r\n]/u.test(
    value.slice(selection.startOffset, selection.endOffset),
  )

  return {
    bold:
      getInlineFormatState(value, selection, 'bold', selectedText) === 'active',
    italic:
      getInlineFormatState(value, selection, 'italic', selectedText) ===
      'active',
    underline:
      getInlineFormatState(value, selection, 'underline', selectedText) ===
      'active',
    strikethrough:
      getInlineFormatState(value, selection, 'strike', selectedText) ===
      'active',
    code:
      !selectionSpansLines &&
      getInlineFormatState(value, selection, 'inlineCode', selectedText) ===
      'active',
    spoiler:
      !selectionSpansLines &&
      getInlineFormatState(value, selection, 'spoiler', selectedText) ===
      'active',
    highlight:
      getInlineFormatState(value, selection, 'highlight', selectedText) ===
      'active',
    comment:
      getInlineFormatState(value, selection, 'comment', selectedText) ===
      'active',
    link:
      !selectionSpansLines &&
      isLinkSelectionActive(value, selection, selectedText),
    image:
      !selectionSpansLines &&
      isImageSelectionActive(value, selection, selectedText),
    badge:
      getInlineFormatState(value, selection, 'badge', selectedText) ===
      'active',
  }
}
