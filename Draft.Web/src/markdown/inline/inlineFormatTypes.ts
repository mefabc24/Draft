import type {
  MarkdownSelectionOffsetRange,
  MarkdownTextEdit,
} from '../markdownTypes'

export type ParsedInlineFormat =
  | 'bold'
  | 'image'
  | 'inlineCode'
  | 'italic'
  | 'link'
  | 'strike'
  | 'underline'

export type WrappableInlineFormat = Exclude<
  ParsedInlineFormat,
  'image' | 'link'
>

export type InlineFormatState = 'active' | 'inactive' | 'mixed'

export type InlineFormatRangeMetadata = {
  alt?: string
  href?: string
  label?: string
  src?: string
}

export type InlineFormatRange = {
  closingMarker: string
  contentEnd: number
  contentStart: number
  markerEnd: number
  markerStart: number
  metadata?: InlineFormatRangeMetadata
  openingMarker: string
  type: ParsedInlineFormat
}

export type InlineFormatMarkerPair = {
  closingMarker: string
  openingMarker: string
}

export type ToggleInlineFormatMode = 'toggle' | 'unwrap' | 'wrap'

export type ToggleInlineFormatResult = {
  edits: MarkdownTextEdit[]
  nextSelection: MarkdownSelectionOffsetRange
}

export type ContainingInlineFormatRange = {
  closingMarkerRange: MarkdownSelectionOffsetRange
  fullRange: MarkdownSelectionOffsetRange
  innerContentRange: MarkdownSelectionOffsetRange
  openingMarkerRange: MarkdownSelectionOffsetRange
  range: InlineFormatRange
  selectedCoreRange: MarkdownSelectionOffsetRange
}
