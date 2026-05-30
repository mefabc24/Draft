import type { HastNode } from '../previewTypes'

type DraftExtensionFragment =
  | {
      kind: 'text'
      value: string
      endIndex: number
      startIndex: number
    }
  | {
      kind: 'highlight'
      value: string
      contentEndIndex: number
      contentStartIndex: number
      endIndex: number
      startIndex: number
    }
  | {
      kind: 'spoiler'
      value: string
      contentEndIndex: number
      contentStartIndex: number
      endIndex: number
      startIndex: number
    }
  | {
      kind: 'badge'
      color: string | null
      value: string
      contentEndIndex: number
      contentStartIndex: number
      endIndex: number
      startIndex: number
    }

const skippedDraftExtensionElementTags = new Set([
  'code',
  'kbd',
  'pre',
  'samp',
  'script',
  'style',
])

const validBadgeColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu

function getSourceOffset(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function createSourcePosition(
  node: HastNode,
  startIndex: number,
  endIndex: number,
) {
  const startOffset = getSourceOffset(node.position?.start?.offset)

  if (startOffset === null) {
    return undefined
  }

  return {
    start: {
      offset: startOffset + startIndex,
    },
    end: {
      offset: startOffset + endIndex,
    },
  }
}

function appendTextFragment(
  fragments: DraftExtensionFragment[],
  value: string,
  startIndex: number,
  endIndex: number,
) {
  if (!value) {
    return
  }

  const previousFragment = fragments.at(-1)

  if (
    previousFragment?.kind === 'text' &&
    previousFragment.endIndex === startIndex
  ) {
    previousFragment.value += value
    previousFragment.endIndex = endIndex
    return
  }

  fragments.push({
    kind: 'text',
    value,
    endIndex,
    startIndex,
  })
}

function normalizeBadgeColor(value: string) {
  const trimmedValue = value.trim()

  return validBadgeColorPattern.test(trimmedValue) ? trimmedValue : null
}

function getTrimmedRange(value: string, startIndex: number, endIndex: number) {
  let trimmedStartIndex = startIndex
  let trimmedEndIndex = endIndex

  while (
    trimmedStartIndex < trimmedEndIndex &&
    /\s/u.test(value[trimmedStartIndex])
  ) {
    trimmedStartIndex += 1
  }

  while (
    trimmedEndIndex > trimmedStartIndex &&
    /\s/u.test(value[trimmedEndIndex - 1])
  ) {
    trimmedEndIndex -= 1
  }

  return {
    endIndex: trimmedEndIndex,
    startIndex: trimmedStartIndex,
  }
}

function parseBadgeContent(value: string) {
  const separatorIndex = value.indexOf('|')
  const labelRange = getTrimmedRange(
    value,
    0,
    separatorIndex === -1 ? value.length : separatorIndex,
  )
  const label = value.slice(labelRange.startIndex, labelRange.endIndex)

  if (!label) {
    return null
  }

  return {
    color:
      separatorIndex === -1
        ? null
        : normalizeBadgeColor(value.slice(separatorIndex + 1)),
    label,
    labelEndIndex: labelRange.endIndex,
    labelStartIndex: labelRange.startIndex,
  }
}

function hashSpoilerContent(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(36)
}

function parseDraftExtensionFragments(value: string) {
  const fragments: DraftExtensionFragment[] = []
  let index = 0

  while (index < value.length) {
    if (value.startsWith('%%', index)) {
      const closeIndex = value.indexOf('%%', index + 2)

      if (closeIndex !== -1) {
        index = closeIndex + 2
        continue
      }
    }

    if (value.startsWith('==', index)) {
      const closeIndex = value.indexOf('==', index + 2)

      if (closeIndex > index + 2) {
        fragments.push({
          kind: 'highlight',
          value: value.slice(index + 2, closeIndex),
          contentEndIndex: closeIndex,
          contentStartIndex: index + 2,
          endIndex: closeIndex + 2,
          startIndex: index,
        })
        index = closeIndex + 2
        continue
      }
    }

    if (value.startsWith('||', index)) {
      const closeIndex = value.indexOf('||', index + 2)

      if (closeIndex > index + 2) {
        fragments.push({
          kind: 'spoiler',
          value: value.slice(index + 2, closeIndex),
          contentEndIndex: closeIndex,
          contentStartIndex: index + 2,
          endIndex: closeIndex + 2,
          startIndex: index,
        })
        index = closeIndex + 2
        continue
      }
    }

    if (value.startsWith('[badge:', index)) {
      const closeIndex = value.indexOf(']', index + 7)
      const badge =
        closeIndex === -1
          ? null
          : parseBadgeContent(value.slice(index + 7, closeIndex))

      if (badge) {
        fragments.push({
          kind: 'badge',
          color: badge.color,
          value: badge.label,
          contentEndIndex: index + 7 + badge.labelEndIndex,
          contentStartIndex: index + 7 + badge.labelStartIndex,
          endIndex: closeIndex + 1,
          startIndex: index,
        })
        index = closeIndex + 1
        continue
      }
    }

    appendTextFragment(fragments, value[index], index, index + 1)
    index += 1
  }

  return fragments
}

function createTextNode(
  sourceNode: HastNode,
  value: string,
  startIndex: number,
  endIndex: number,
) {
  return {
    type: 'text',
    value,
    position: createSourcePosition(sourceNode, startIndex, endIndex),
  } satisfies HastNode
}

function createDraftExtensionElement(
  sourceNode: HastNode,
  fragment: Exclude<DraftExtensionFragment, { kind: 'text' }>,
) {
  const className = `preview-${fragment.kind}`
  const properties: Record<string, unknown> = {
    className: [className],
  }

  if (fragment.kind === 'badge' && fragment.color) {
    properties['data-badge-color'] = fragment.color
  }

  if (fragment.kind === 'spoiler') {
    const startOffset = getSourceOffset(sourceNode.position?.start?.offset)
    const spoilerStart =
      startOffset === null ? fragment.startIndex : startOffset + fragment.startIndex

    properties['data-spoiler-id'] =
      `spoiler-${spoilerStart}-${hashSpoilerContent(fragment.value)}`
  }

  return {
    type: 'element',
    tagName: 'span',
    properties,
    children: [
      createTextNode(
        sourceNode,
        fragment.value,
        fragment.contentStartIndex,
        fragment.contentEndIndex,
      ),
    ],
    position: createSourcePosition(
      sourceNode,
      fragment.startIndex,
      fragment.endIndex,
    ),
  } satisfies HastNode
}

function getDraftExtensionNodes(sourceNode: HastNode) {
  if (typeof sourceNode.value !== 'string') {
    return [sourceNode]
  }

  const fragments = parseDraftExtensionFragments(sourceNode.value)

  if (
    fragments.length === 1 &&
    fragments[0].kind === 'text' &&
    fragments[0].value === sourceNode.value
  ) {
    return [sourceNode]
  }

  return fragments.map((fragment) =>
    fragment.kind === 'text'
      ? createTextNode(
          sourceNode,
          fragment.value,
          fragment.startIndex,
          fragment.endIndex,
        )
      : createDraftExtensionElement(sourceNode, fragment),
  )
}

function isSkippedDraftExtensionElement(node: HastNode) {
  return (
    node.type === 'element' &&
    typeof node.tagName === 'string' &&
    skippedDraftExtensionElementTags.has(node.tagName)
  )
}

function isEmptyParagraph(node: HastNode) {
  return (
    node.type === 'element' &&
    node.tagName === 'p' &&
    (node.children?.every(
      (child) => child.type === 'text' && !child.value?.trim(),
    ) ??
      true)
  )
}

function transformDraftExtensionNode(node: HastNode) {
  if (!node.children || isSkippedDraftExtensionElement(node)) {
    return
  }

  const children: HastNode[] = []

  for (const child of node.children) {
    if (child.type === 'text') {
      children.push(...getDraftExtensionNodes(child))
      continue
    }

    transformDraftExtensionNode(child)

    if (!isEmptyParagraph(child)) {
      children.push(child)
    }
  }

  node.children = children
}

export function rehypeDraftMarkdownExtensions() {
  return (tree: HastNode) => {
    transformDraftExtensionNode(tree)
  }
}
