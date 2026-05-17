export { countMarkdownWords } from './wordCount'
export { addBlockquotePrefix, addHeadingPrefix, removeBlockquotePrefix, removeHeadingPrefix } from './commands/blockFormatting'
export { toggleFencedCodeBlockText } from './commands/codeBlockFormatting'
export { getToggleWrappedEdits, getInlineWrapperContext, isSelectedTextWrapped } from './commands/inlineFormatting'
export { getToggleLinkEdits, isLinkSelectionActive, isSelectedLinkLabel } from './commands/linkFormatting'
export { addListPrefix, removeListPrefix } from './commands/listFormatting'
export { getEditableMarkdownSourceRange } from './commands/sourceRangeEditing'
export { detectActiveHeadingValue, detectActiveListValue } from './detection/activeBlockState'
export { detectActiveInlineFormats, EMPTY_ACTIVE_FORMATS } from './detection/activeInlineFormats'
export { getFencedCodeBlockContextFromLines } from './detection/fencedCodeBlocks'
export type {
  ActiveFormats,
  HeadingValue,
  InlineFormat,
  ListValue,
  MarkdownCommandOptions,
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from './markdownTypes'
export type { FencedCodeBlockContext } from './detection/fencedCodeBlocks'
export type { EditableMarkdownSourceRange } from './commands/sourceRangeEditing'
