export type HeadingValue =
  | 'normal'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'blockquote'
  | 'codeblock'

export type ListValue = 'none' | 'bullet' | 'numbered' | 'checklist'
export type InlineFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'spoiler'
  | 'link'
  | 'image'
export type ActiveFormats = Record<InlineFormat, boolean>

export type MarkdownCommandOptions = {
  focusEditor?: boolean
}

export type MarkdownSelectionOffsetRange = {
  endOffset: number
  startOffset: number
}

export type MarkdownTextEdit = {
  endOffset: number
  startOffset: number
  text: string
}
