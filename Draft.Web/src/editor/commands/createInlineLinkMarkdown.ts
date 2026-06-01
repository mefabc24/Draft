export type CreateInlineLinkMarkdownData = {
  text: string
  url: string
}

export function createInlineLinkMarkdown({
  text,
  url,
}: CreateInlineLinkMarkdownData) {
  return `[${text.trim() || 'link text'}](${url.trim() || 'url'})`
}

export type CreateInlineImageMarkdownData = {
  altText: string
  url: string
}

export function createInlineImageMarkdown({
  altText,
  url,
}: CreateInlineImageMarkdownData) {
  return `![${altText.trim() || 'alt text'}](${url.trim() || 'image-url'})`
}

export type CreateInlineTagMarkdownData = {
  color: string
  text: string
}

const validInlineTagColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu

function normalizeInlineTagColor(value: string) {
  const trimmedValue = value.trim()

  return validInlineTagColorPattern.test(trimmedValue)
    ? trimmedValue
    : '#FFFFFF'
}

export function createInlineTagMarkdown({
  color,
  text,
}: CreateInlineTagMarkdownData) {
  return `[tag:${text.trim() || 'Text'}|${normalizeInlineTagColor(color)}]`
}
