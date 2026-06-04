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

export type CreateExpanderMarkdownData = {
  content: string
  title: string
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createExpanderContentHtml(content: string) {
  const trimmedContent = content.trim()
  const safeContent = escapeHtmlText(trimmedContent || 'Content')

  return safeContent.replace(/\r?\n/g, '<br />\n')
}

export function createExpanderMarkdown({
  content,
  title,
}: CreateExpanderMarkdownData) {
  const safeTitle = escapeHtmlText(title.trim() || 'Title')

  return `<details>\n<summary>${safeTitle}</summary>\n\n<div>\n${createExpanderContentHtml(content)}\n</div>\n</details>`
}
