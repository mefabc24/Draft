import type { HastNode } from '../previewTypes'

function getSourceOffset(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getNodeSourceRange(node: HastNode) {
  const startOffset = getSourceOffset(node.position?.start?.offset)
  const endOffset = getSourceOffset(node.position?.end?.offset)

  if (startOffset === null || endOffset === null || startOffset >= endOffset) {
    return null
  }

  return { endOffset, startOffset }
}

function shouldSkipSourceTextMapping(node: HastNode) {
  return node.type === 'element' && node.tagName === 'pre'
}

const MARKDOWN_SOURCE_ELEMENT_TAGS = new Set([
  'a',
  'code',
  'del',
  'em',
  'img',
  'strong',
])

function annotateMarkdownSourceElement(node: HastNode) {
  if (
    node.type !== 'element' ||
    !node.tagName ||
    !MARKDOWN_SOURCE_ELEMENT_TAGS.has(node.tagName)
  ) {
    return
  }

  const sourceRange = getNodeSourceRange(node)

  if (!sourceRange) {
    return
  }

  const sourceProperties: Record<string, string> = {
    'data-source-markdown-end': String(sourceRange.endOffset),
    'data-source-markdown-start': String(sourceRange.startOffset),
  }

  if (node.tagName === 'img') {
    sourceProperties['data-source-end'] = String(sourceRange.endOffset)
    sourceProperties['data-source-start'] = String(sourceRange.startOffset)
  }

  node.properties = {
    ...node.properties,
    ...sourceProperties,
  }
}

function getInlineCodeTextRange(
  source: string,
  node: HastNode,
  child: HastNode,
) {
  if (
    node.type !== 'element' ||
    node.tagName !== 'code' ||
    typeof child.value !== 'string'
  ) {
    return null
  }

  const sourceRange = getNodeSourceRange(node)

  if (!sourceRange) {
    return null
  }

  const sourceText = source.slice(sourceRange.startOffset, sourceRange.endOffset)
  const markerMatch = sourceText.match(/^`+/u)
  const marker = markerMatch?.[0]

  if (!marker || !sourceText.endsWith(marker)) {
    return null
  }

  const contentStartOffset = sourceRange.startOffset + marker.length
  const contentEndOffset = sourceRange.endOffset - marker.length
  const contentText = source.slice(contentStartOffset, contentEndOffset)
  const visibleTextStartIndex = contentText.indexOf(child.value)
  const startOffset =
    visibleTextStartIndex === -1
      ? contentStartOffset
      : contentStartOffset + visibleTextStartIndex
  const endOffset = Math.min(startOffset + child.value.length, contentEndOffset)

  return startOffset < endOffset ? { endOffset, startOffset } : null
}

function getTextSourceRange(source: string, node: HastNode, child: HastNode) {
  return getInlineCodeTextRange(source, node, child) ?? getNodeSourceRange(child)
}

function wrapSourceMappedTextNodes(node: HastNode, source: string) {
  annotateMarkdownSourceElement(node)

  if (!node.children || shouldSkipSourceTextMapping(node)) {
    return
  }

  node.children = node.children.map((child) => {
    if (child.type !== 'text') {
      wrapSourceMappedTextNodes(child, source)
      return child
    }

    const sourceRange = getTextSourceRange(source, node, child)

    if (
      !sourceRange ||
      typeof child.value !== 'string'
    ) {
      return child
    }

    return {
      type: 'element',
      tagName: 'span',
      properties: {
        'data-source-end': String(sourceRange.endOffset),
        'data-source-start': String(sourceRange.startOffset),
        className: ['preview-source-text'],
      },
      children: [child],
      position: child.position,
    } satisfies HastNode
  })
}

export function rehypeSourceTextSpans() {
  return (tree: HastNode, file?: { value?: unknown }) => {
    wrapSourceMappedTextNodes(
      tree,
      typeof file?.value === 'string' ? file.value : '',
    )
  }
}
