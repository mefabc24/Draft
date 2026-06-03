import {
  calloutLabels,
  normalizeCalloutType,
  type CalloutType,
} from '../../markdown/callouts'
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
      kind: 'tag'
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

const validTagColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu
const calloutMarkerPattern = /^\[!([A-Za-z]+)\](?:[ \t]*(?:\r?\n|$))/u

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

function createAbsoluteSourcePosition(
  startOffset: number | null,
  endOffset: number | null,
) {
  if (startOffset === null || endOffset === null || startOffset >= endOffset) {
    return undefined
  }

  return {
    start: {
      offset: startOffset,
    },
    end: {
      offset: endOffset,
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

function normalizeTagColor(value: string) {
  const trimmedValue = value.trim()

  return validTagColorPattern.test(trimmedValue) ? trimmedValue : null
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

function parseTagContent(value: string) {
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
        : normalizeTagColor(value.slice(separatorIndex + 1)),
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

    const tagMarker = value.startsWith('[tag:', index)
      ? '[tag:'
      : value.startsWith('[badge:', index)
        ? '[badge:'
        : null

    if (tagMarker) {
      const contentStartIndex = index + tagMarker.length
      const closeIndex = value.indexOf(']', contentStartIndex)
      const tag =
        closeIndex === -1
          ? null
          : parseTagContent(value.slice(contentStartIndex, closeIndex))

      if (tag) {
        fragments.push({
          kind: 'tag',
          color: tag.color,
          value: tag.label,
          contentEndIndex: contentStartIndex + tag.labelEndIndex,
          contentStartIndex: contentStartIndex + tag.labelStartIndex,
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

function getClassNames(properties: Record<string, unknown> | undefined) {
  const className = properties?.className

  if (Array.isArray(className)) {
    return className.filter(
      (value): value is string => typeof value === 'string',
    )
  }

  return typeof className === 'string' ? className.split(/\s+/u) : []
}

function addClassNames(node: HastNode, classNames: string[]) {
  node.properties = {
    ...node.properties,
    className: [...getClassNames(node.properties), ...classNames],
  }
}

function createDraftExtensionElement(
  sourceNode: HastNode,
  fragment: Exclude<DraftExtensionFragment, { kind: 'text' }>,
) {
  const className = `preview-${fragment.kind}`
  const properties: Record<string, unknown> = {
    className: [className],
  }

  if (fragment.kind === 'tag' && fragment.color) {
    properties['data-tag-color'] = fragment.color
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

function getNodeTextContent(node: HastNode): string {
  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value
  }

  return node.children?.map(getNodeTextContent).join('') ?? ''
}

function createSpoilerElementFromChildren(
  children: HastNode[],
  openMarkerNode: HastNode,
  closeMarkerNode: HastNode,
) {
  const startOffset = getSourceOffset(openMarkerNode.position?.start?.offset)
  const endOffset = getSourceOffset(closeMarkerNode.position?.end?.offset)
  const spoilerStart = startOffset === null ? 'unknown' : String(startOffset)
  const spoilerText = children.map(getNodeTextContent).join('')

  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['preview-spoiler'],
      'data-spoiler-id': `spoiler-${spoilerStart}-${hashSpoilerContent(spoilerText)}`,
    },
    children,
    position: createAbsoluteSourcePosition(startOffset, endOffset),
  } satisfies HastNode
}

type SpoilerNodeBuffer = {
  children: HastNode[]
  openMarkerNode: HastNode
}

function addSpoilerTextSegment(
  targetChildren: HastNode[],
  sourceNode: HastNode,
  value: string,
  startIndex: number,
  endIndex: number,
) {
  if (!value) {
    return
  }

  targetChildren.push(createTextNode(sourceNode, value, startIndex, endIndex))
}

function getSpoilerTextTarget(
  outputChildren: HastNode[],
  spoilerBuffer: SpoilerNodeBuffer | null,
) {
  return spoilerBuffer?.children ?? outputChildren
}

function groupSpoilerTextNode(
  sourceNode: HastNode,
  outputChildren: HastNode[],
  spoilerBuffer: SpoilerNodeBuffer | null,
) {
  if (typeof sourceNode.value !== 'string') {
    return spoilerBuffer
  }

  const { value } = sourceNode
  let currentIndex = 0
  let currentSpoilerBuffer = spoilerBuffer

  while (currentIndex < value.length) {
    const markerIndex = value.indexOf('||', currentIndex)

    if (markerIndex === -1) {
      addSpoilerTextSegment(
        getSpoilerTextTarget(outputChildren, currentSpoilerBuffer),
        sourceNode,
        value.slice(currentIndex),
        currentIndex,
        value.length,
      )
      break
    }

    addSpoilerTextSegment(
      getSpoilerTextTarget(outputChildren, currentSpoilerBuffer),
      sourceNode,
      value.slice(currentIndex, markerIndex),
      currentIndex,
      markerIndex,
    )

    const markerNode = createTextNode(
      sourceNode,
      '||',
      markerIndex,
      markerIndex + 2,
    )

    if (currentSpoilerBuffer) {
      outputChildren.push(
        createSpoilerElementFromChildren(
          currentSpoilerBuffer.children,
          currentSpoilerBuffer.openMarkerNode,
          markerNode,
        ),
      )
      currentSpoilerBuffer = null
    } else {
      currentSpoilerBuffer = {
        children: [],
        openMarkerNode: markerNode,
      }
    }

    currentIndex = markerIndex + 2
  }

  return currentSpoilerBuffer
}

function groupSpoilerSiblingNodes(children: HastNode[]) {
  const outputChildren: HastNode[] = []
  let spoilerBuffer: SpoilerNodeBuffer | null = null

  for (const child of children) {
    if (child.type === 'text') {
      spoilerBuffer = groupSpoilerTextNode(
        child,
        outputChildren,
        spoilerBuffer,
      )
      continue
    }

    if (spoilerBuffer) {
      spoilerBuffer.children.push(child)
      continue
    }

    outputChildren.push(child)
  }

  if (spoilerBuffer) {
    outputChildren.push(spoilerBuffer.openMarkerNode, ...spoilerBuffer.children)
  }

  return outputChildren
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

function isWhitespaceTextNode(node: HastNode) {
  return node.type === 'text' && !node.value?.trim()
}

function getFirstMeaningfulChild(children: HastNode[]) {
  for (const child of children) {
    if (!isWhitespaceTextNode(child)) {
      return child
    }
  }

  return null
}

function getCalloutMarkerFromParagraph(paragraphNode: HastNode) {
  if (paragraphNode.type !== 'element' || paragraphNode.tagName !== 'p') {
    return null
  }

  const firstChild = paragraphNode.children?.[0]

  if (firstChild?.type !== 'text' || typeof firstChild.value !== 'string') {
    return null
  }

  const markerMatch = calloutMarkerPattern.exec(firstChild.value)

  if (!markerMatch) {
    return null
  }

  return {
    calloutType: normalizeCalloutType(markerMatch[1] ?? ''),
    firstChild,
    markerEndIndex: markerMatch[0].length,
  }
}

function removeCalloutMarkerFromParagraph(
  paragraphNode: HastNode,
  markerNode: HastNode,
  markerEndIndex: number,
) {
  if (!paragraphNode.children || typeof markerNode.value !== 'string') {
    return
  }

  const remainingValue = markerNode.value.slice(markerEndIndex)
  const markerNodeIndex = paragraphNode.children.indexOf(markerNode)

  if (markerNodeIndex === -1) {
    return
  }

  if (!remainingValue) {
    paragraphNode.children.splice(markerNodeIndex, 1)
    return
  }

  paragraphNode.children.splice(
    markerNodeIndex,
    1,
    createTextNode(
      markerNode,
      remainingValue,
      markerEndIndex,
      markerNode.value.length,
    ),
  )
}

function annotateCalloutBlockquote(node: HastNode, calloutType: CalloutType) {
  addClassNames(node, [
    'preview-callout',
    `preview-callout-${calloutType}`,
  ])
  node.properties = {
    ...node.properties,
    'data-callout-label': calloutLabels[calloutType],
    'data-callout-type': calloutType,
  }
}

function transformCalloutBlockquote(node: HastNode) {
  if (
    node.type !== 'element' ||
    node.tagName !== 'blockquote' ||
    !node.children
  ) {
    return
  }

  const firstMeaningfulChild = getFirstMeaningfulChild(node.children)
  if (!firstMeaningfulChild) {
    return
  }

  const marker = getCalloutMarkerFromParagraph(firstMeaningfulChild)

  if (!marker) {
    return
  }

  removeCalloutMarkerFromParagraph(
    firstMeaningfulChild,
    marker.firstChild,
    marker.markerEndIndex,
  )
  annotateCalloutBlockquote(node, marker.calloutType)
}

function transformDraftExtensionNode(node: HastNode) {
  if (!node.children || isSkippedDraftExtensionElement(node)) {
    return
  }

  transformCalloutBlockquote(node)

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

  node.children = groupSpoilerSiblingNodes(children)
}

export function rehypeDraftMarkdownExtensions() {
  return (tree: HastNode) => {
    transformDraftExtensionNode(tree)
  }
}
