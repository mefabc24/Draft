import type { HastNode } from '../previewTypes'

function getSourceOffset(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function shouldSkipSourceTextMapping(node: HastNode) {
  return node.type === 'element' && node.tagName === 'pre'
}

function wrapSourceMappedTextNodes(node: HastNode) {
  if (!node.children || shouldSkipSourceTextMapping(node)) {
    return
  }

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
