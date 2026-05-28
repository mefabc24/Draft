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
