export { countMarkdownWords } from './wordCount'
export {
  addBlockquotePrefix,
  addCalloutBlockquotePrefix,
  addHeadingPrefix,
  removeBlockquotePrefix,
  removeHeadingPrefix,
} from './commands/blockFormatting'
export { toggleFencedCodeBlockText } from './commands/codeBlockFormatting'
export {
  findContainingInlineFormatRange,
  getInlineWrapperContext,
  getToggleWrappedEdits,
  isInlineFormatActive,
  isSelectedTextWrapped,
  normalizeAdjacentInlineFormattingRanges,
} from './commands/inlineFormatting'
export { getInlineFormatMarkers } from './inline/inlineFormatConfig'
export {
  createMarkdownImageText,
  createMarkdownLinkText,
  getImageEditState,
  getLinkEditState,
  getMarkdownImageContext,
  getMarkdownLinkContext,
  getToggleImageEdits,
  getToggleLinkEdits,
  isImageSelectionActive,
  isLinkSelectionActive,
  isSelectedImageLabel,
  isSelectedLinkLabel,
} from './commands/linkFormatting'
export { addListPrefix, removeListPrefix } from './commands/listFormatting'
export {
  getEditableMarkdownSourceRange,
  getPreviewSelectionRangeForEditedMarkdown,
} from './commands/sourceRangeEditing'
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
export type {
  ContainingInlineWrapperContext,
  ToggleWrappedMode,
} from './commands/inlineFormatting'
export type { MarkdownImageContext, MarkdownLinkContext } from './commands/linkFormatting'
