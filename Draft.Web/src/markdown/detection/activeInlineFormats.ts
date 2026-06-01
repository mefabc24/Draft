import type {
  ActiveFormats,
  MarkdownSelectionOffsetRange,
} from '../markdownTypes'
import { getInlineFormatState } from '../inline/getInlineFormatState'
import { areSelectedNonEmptyLinesWrapped } from '../commands/inlineFormatting'
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
  link: false,
  image: false,
}

export function detectActiveInlineFormats(
  value: string,
  selection: MarkdownSelectionOffsetRange,
  selectedText: string,
) {
  if (value.slice(selection.startOffset, selection.endOffset).includes('\n')) {
    return {
      bold: areSelectedNonEmptyLinesWrapped(value, selection, '**'),
      italic: areSelectedNonEmptyLinesWrapped(value, selection, '*'),
      underline: areSelectedNonEmptyLinesWrapped(
        value,
        selection,
        '<u>',
        '</u>',
      ),
      strikethrough: areSelectedNonEmptyLinesWrapped(value, selection, '~~'),
      code: areSelectedNonEmptyLinesWrapped(value, selection, '`'),
      link: false,
      image: false,
    }
  }

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
      getInlineFormatState(value, selection, 'inlineCode', selectedText) ===
      'active',
    link: isLinkSelectionActive(value, selection, selectedText),
    image: isImageSelectionActive(value, selection, selectedText),
  }
}
