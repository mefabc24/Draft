import type {
  ActiveFormats,
  MarkdownSelectionOffsetRange,
} from '../markdownTypes'
import {
  getInlineWrapperContext,
  isSelectedTextWrapped,
} from '../commands/inlineFormatting'
import { isLinkSelectionActive } from '../commands/linkFormatting'

export const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  link: false,
}

export function detectActiveInlineFormats(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  return {
    bold:
      getInlineWrapperContext(value, selection, '**') !== null ||
      isSelectedTextWrapped(selectedText, '**'),
    italic:
      getInlineWrapperContext(value, selection, '*') !== null ||
      isSelectedTextWrapped(selectedText, '*'),
    strikethrough:
      getInlineWrapperContext(value, selection, '~~') !== null ||
      isSelectedTextWrapped(selectedText, '~~'),
    code:
      getInlineWrapperContext(value, selection, '`') !== null ||
      isSelectedTextWrapped(selectedText, '`'),
    link: isLinkSelectionActive(value, selection, selectedText),
  }
}
