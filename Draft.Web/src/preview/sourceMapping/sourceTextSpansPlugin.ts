import type { HastNode } from '../previewTypes'

function getSourceOffset(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function shouldSkipSourceTextMapping(node: HastNode) {
  return node.type === 'element' && node.tagName === 'pre'
}

const MARKDOWN_SOURCE_ELEMENT_TAGS = new Set([
  'a',
  'code',
  'del',
  'em',
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

  const startOffset = getSourceOffset(node.position?.start?.offset)
  const endOffset = getSourceOffset(node.position?.end?.offset)

  if (startOffset === null || endOffset === null || startOffset >= endOffset) {
    return
  }

  node.properties = {
    ...node.properties,
    'data-source-markdown-end': String(endOffset),
    'data-source-markdown-start': String(startOffset),
  }
}

function wrapSourceMappedTextNodes(node: HastNode) {
  if (!node.children || shouldSkipSourceTextMapping(node)) {
    return
  }

  annotateMarkdownSourceElement(node)

  node.children = node.children.map((child) => {
    if (child.type !== 'text') {
      wrapSourceMappedTextNodes(child)
      return child
    }

    const startOffset = getSourceOffset(child.position?.start?.offset)
    const endOffset = getSourceOffset(child.position?.end?.offset)

    if (
      startOffset === null ||
      endOffset === null ||
      startOffset >= endOffset ||
      typeof child.value !== 'string'
    ) {
      return child
    }

    return {
      type: 'element',
      tagName: 'span',
      properties: {
        'data-source-end': String(endOffset),
        'data-source-start': String(startOffset),
        className: ['preview-source-text'],
      },
      children: [child],
      position: child.position,
    } satisfies HastNode
  })
}

export function rehypeSourceTextSpans() {
  return (tree: HastNode) => {
    wrapSourceMappedTextNodes(tree)
  }
}
