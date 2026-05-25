import type {
  ActiveFormats,
  MarkdownSelectionOffsetRange,
} from '../markdownTypes'
import {
  areSelectedNonEmptyLinesWrapped,
  findContainingInlineFormatRange,
  getInlineWrapperContext,
  isSelectionComposedOfAdjacentInlineCodeSpans,
  isSelectedTextWrapped,
} from '../commands/inlineFormatting'
import { normalizeInlineSelectionRange } from '../commands/inlineSelectionNormalization'
import {
  isImageSelectionActive,
  isLinkSelectionActive,
} from '../commands/linkFormatting'

export const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
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
      strikethrough: areSelectedNonEmptyLinesWrapped(value, selection, '~~'),
      code: areSelectedNonEmptyLinesWrapped(value, selection, '`'),
      link: false,
      image: false,
    }
  }

  const normalizedSelection = normalizeInlineSelectionRange(
    value,
    selection,
    selectedText,
  )
  const { coreRange, coreText } = normalizedSelection
  const codeSelectionWouldMerge =
    isSelectionComposedOfAdjacentInlineCodeSpans(value, coreRange)

  return {
    bold:
      getInlineWrapperContext(value, coreRange, '**') !== null ||
      isSelectedTextWrapped(coreText, '**') ||
      findContainingInlineFormatRange(value, coreRange, '**') !== null,
    italic:
      getInlineWrapperContext(value, coreRange, '*') !== null ||
      isSelectedTextWrapped(coreText, '*') ||
      findContainingInlineFormatRange(value, coreRange, '*') !== null,
    strikethrough:
      getInlineWrapperContext(value, coreRange, '~~') !== null ||
      isSelectedTextWrapped(coreText, '~~') ||
      findContainingInlineFormatRange(value, coreRange, '~~') !== null,
    code:
      !codeSelectionWouldMerge &&
      (getInlineWrapperContext(value, coreRange, '`') !== null ||
        isSelectedTextWrapped(coreText, '`') ||
        findContainingInlineFormatRange(value, coreRange, '`') !== null),
    link: isLinkSelectionActive(value, selection, selectedText),
    image: isImageSelectionActive(value, selection, selectedText),
  }
}
