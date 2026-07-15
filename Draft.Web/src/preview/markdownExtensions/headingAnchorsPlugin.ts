import { createUniqueHeadingId } from '../anchors/headingAnchorUtils'
import type { HastNode } from '../previewTypes'

const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

function isElementNode(
  node: HastNode,
): node is HastNode & { tagName: string } {
  return node.type === 'element' && typeof node.tagName === 'string'
}

function isHeadingNode(node: HastNode) {
  return isElementNode(node) && headingTags.has(node.tagName)
}

function getNodeId(node: HastNode) {
  const id = node.properties?.id

  return typeof id === 'string' && id ? id : null
}

function getNodeTextContent(node: HastNode): string {
  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value
  }

  if (isElementNode(node) && node.tagName === 'img') {
    const altText = node.properties?.alt

    return typeof altText === 'string' ? altText : ''
  }

  return node.children?.map(getNodeTextContent).join('') ?? ''
}

function collectExistingIds(node: HastNode, ids: Set<string>) {
  const id = getNodeId(node)

  if (id) {
    ids.add(id)
  }

  node.children?.forEach((child) => {
    collectExistingIds(child, ids)
  })
}

function addHeadingIds(node: HastNode, usedIds: Set<string>) {
  if (isHeadingNode(node) && !getNodeId(node)) {
    node.properties = {
      ...node.properties,
      id: createUniqueHeadingId(getNodeTextContent(node), usedIds),
    }
  }

  node.children?.forEach((child) => {
    addHeadingIds(child, usedIds)
  })
}

export function rehypeHeadingAnchors() {
  return (tree: HastNode) => {
    const usedIds = new Set<string>()

    collectExistingIds(tree, usedIds)
    addHeadingIds(tree, usedIds)
  }
}
