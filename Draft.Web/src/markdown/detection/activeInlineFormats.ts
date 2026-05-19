import type {
  ActiveFormats,
  MarkdownSelectionOffsetRange,
} from '../markdownTypes'
import {
  getInlineWrapperContext,
  isSelectedTextWrapped,
} from '../commands/inlineFormatting'
import { normalizeInlineSelectionRange } from '../commands/inlineSelectionNormalization'
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
  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const { coreRange, coreText } = normalizedSelection

  return {
    bold:
      getInlineWrapperContext(value, coreRange, '**') !== null ||
      isSelectedTextWrapped(coreText, '**'),
    italic:
      getInlineWrapperContext(value, coreRange, '*') !== null ||
      isSelectedTextWrapped(coreText, '*'),
    strikethrough:
      getInlineWrapperContext(value, coreRange, '~~') !== null ||
      isSelectedTextWrapped(coreText, '~~'),
    code:
      getInlineWrapperContext(value, coreRange, '`') !== null ||
      isSelectedTextWrapped(coreText, '`'),
    link: isLinkSelectionActive(value, selection, selectedText),
  }
}
