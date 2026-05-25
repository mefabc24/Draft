import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { clamp } from '../../shared/utils/clamp'
import {
  createSelectionFromOffsets,
  getSelectionOffsets,
  isSelectionAllowedForToolbar,
} from '../../editor/monaco/markdownCommandAdapter'
import type { PreviewSelectionSnapshot } from '../toolbarTypes'
import type { ViewMode } from '../../workspace/workspaceTypes'

function getSourceSpanOffset(
  element: HTMLElement,
  boundary: 'end' | 'start',
) {
  const value =
    boundary === 'start'
      ? Number(element.dataset.sourceStart)
      : Number(element.dataset.sourceEnd)

  return Number.isFinite(value) ? value : null
}

function getMarkdownSourceElementOffset(
  element: HTMLElement,
  boundary: 'end' | 'start',
) {
  const value =
    boundary === 'start'
      ? Number(element.dataset.sourceMarkdownStart)
      : Number(element.dataset.sourceMarkdownEnd)

  return Number.isFinite(value) ? value : null
}

function isInsidePreviewCodeElement(
  node: Node,
  previewContentElement: HTMLDivElement,
) {
  const element =
    node instanceof Element ? node : node.parentElement
  const codeElement = element?.closest('pre')

  return !!codeElement && previewContentElement.contains(codeElement)
}

function findClosestSourceSpan(
  node: Node,
  previewContentElement: HTMLDivElement,
) {
  const element =
    node instanceof Element ? node : node.parentElement
  const sourceSpan = element?.closest<HTMLElement>(
    '[data-source-start][data-source-end]',
  )

  return sourceSpan && previewContentElement.contains(sourceSpan)
    ? sourceSpan
    : null
}

function findClosestSourceSpanFromTextNode(node: Node) {
  return node.parentElement?.closest<HTMLElement>(
    '[data-source-start][data-source-end]',
  ) ?? null
}

function findFirstSourceSpan(node: Node | null): HTMLElement | null {
  if (!node) {
    return null
  }

  if (
    node instanceof HTMLElement &&
    node.matches('[data-source-start][data-source-end]')
  ) {
    return node
  }

  if (node instanceof Element || node instanceof DocumentFragment) {
    return node.querySelector<HTMLElement>(
      '[data-source-start][data-source-end]',
    )
  }

  return findClosestSourceSpanFromTextNode(node)
}

function findLastSourceSpan(node: Node | null): HTMLElement | null {
  if (!node) {
    return null
  }

  if (
    node instanceof HTMLElement &&
    node.matches('[data-source-start][data-source-end]')
  ) {
    return node
  }

  if (node instanceof Element || node instanceof DocumentFragment) {
    const sourceSpans = node.querySelectorAll<HTMLElement>(
      '[data-source-start][data-source-end]',
    )

    return sourceSpans[sourceSpans.length - 1] ?? null
  }

  return findClosestSourceSpanFromTextNode(node)
}

function getPreviewBoundarySourceOffset(
  container: Node,
  offset: number,
  previewContentElement: HTMLDivElement,
  boundary: 'end' | 'start',
) {
  if (isInsidePreviewCodeElement(container, previewContentElement)) {
    return null
  }

  if (container.nodeType === Node.TEXT_NODE) {
    const sourceSpan = findClosestSourceSpan(container, previewContentElement)
    const sourceStart = sourceSpan
      ? getSourceSpanOffset(sourceSpan, 'start')
      : null
    const textLength = container.textContent?.length ?? 0

    return sourceStart === null
      ? null
      : sourceStart + clamp(offset, 0, textLength)
  }

  if (!(container instanceof Element || container instanceof DocumentFragment)) {
    return null
  }

  const childNodes = container.childNodes
  const previousNode = offset > 0 ? childNodes[offset - 1] : null
  const nextNode = childNodes[offset] ?? null
  const primarySpan =
    boundary === 'start'
      ? findFirstSourceSpan(nextNode)
      : findLastSourceSpan(previousNode)
  const primaryOffset = primarySpan
    ? getSourceSpanOffset(primarySpan, boundary)
    : null

  if (primaryOffset !== null) {
    return primaryOffset
  }

  const fallbackSpan =
    boundary === 'start'
      ? findLastSourceSpan(previousNode)
      : findFirstSourceSpan(nextNode)

  return fallbackSpan
    ? getSourceSpanOffset(fallbackSpan, boundary === 'start' ? 'end' : 'start')
    : null
}

function getPreviewSelectionRect(range: Range) {
  const rects = Array.from(range.getClientRects())
  const visibleRect = rects.find(
    (rect) => rect.width > 0 && rect.height > 0,
  )
  const rect = visibleRect ?? range.getBoundingClientRect()

  return rect.width > 0 && rect.height > 0 ? rect : null
}

function getSelectedText(value: string) {
  return value.replace(/\r\n/g, '\n')
}

function getWholeMarkdownElementRange(
  range: Range,
  previewContentElement: HTMLDivElement,
) {
  const startElement =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement
  const selectedText = getSelectedText(range.toString())

  if (!startElement || selectedText.length === 0) {
    return null
  }

  let bestRange: { endOffset: number; startOffset: number } | null = null

  for (
    let element: Element | null = startElement;
    element && previewContentElement.contains(element);
    element = element.parentElement
  ) {
    if (
      !(element instanceof HTMLElement) ||
      !element.matches(
        '[data-source-markdown-start][data-source-markdown-end]',
      ) ||
      !element.contains(range.startContainer) ||
      !element.contains(range.endContainer) ||
      getSelectedText(element.textContent ?? '') !== selectedText
    ) {
      continue
    }

    const startOffset = getMarkdownSourceElementOffset(element, 'start')
    const endOffset = getMarkdownSourceElementOffset(element, 'end')

    if (
      startOffset === null ||
      endOffset === null ||
      startOffset >= endOffset
    ) {
      continue
    }

    bestRange = { endOffset, startOffset }
  }

  return bestRange
}

export function getPreviewSelectionSnapshot(
  model: monaco.editor.ITextModel,
  previewContentElement: HTMLDivElement,
  viewMode: ViewMode,
): PreviewSelectionSnapshot | null {
  if (viewMode === 'editor') {
    return null
  }

  const domSelection = window.getSelection()

  if (!domSelection || domSelection.rangeCount !== 1 || domSelection.isCollapsed) {
    return null
  }

  const range = domSelection.getRangeAt(0)

  if (
    !previewContentElement.contains(range.startContainer) ||
    !previewContentElement.contains(range.endContainer) ||
    isInsidePreviewCodeElement(range.commonAncestorContainer, previewContentElement)
  ) {
    return null
  }

  const startOffset = getPreviewBoundarySourceOffset(
    range.startContainer,
    range.startOffset,
    previewContentElement,
    'start',
  )
  const endOffset = getPreviewBoundarySourceOffset(
    range.endContainer,
    range.endOffset,
    previewContentElement,
    'end',
  )
  const anchorRect = getPreviewSelectionRect(range)
  const wholeMarkdownElementRange = getWholeMarkdownElementRange(
    range,
    previewContentElement,
  )

  if (
    startOffset === null ||
    endOffset === null ||
    startOffset >= endOffset ||
    !anchorRect
  ) {
    return null
  }

  const selection = createSelectionFromOffsets(model, startOffset, endOffset)

  if (!isSelectionAllowedForToolbar(model, selection)) {
    return null
  }

  return {
    anchorRect,
    editableEndOffset: wholeMarkdownElementRange?.endOffset ?? endOffset,
    editableStartOffset: wholeMarkdownElementRange?.startOffset ?? startOffset,
    endOffset,
    selection,
    sourceKey: `preview:${startOffset}:${endOffset}`,
    startOffset,
  }
}

function findPreviewSourceSpanForOffset(
  previewContentElement: HTMLDivElement,
  sourceOffset: number,
  boundary: 'end' | 'start',
) {
  const spans = previewContentElement.querySelectorAll<HTMLElement>(
    '[data-source-start][data-source-end]',
  )

  for (const span of spans) {
    const sourceStart = getSourceSpanOffset(span, 'start')
    const sourceEnd = getSourceSpanOffset(span, 'end')

    if (sourceStart === null || sourceEnd === null) {
      continue
    }

    const isMatch =
      boundary === 'start'
        ? sourceOffset >= sourceStart && sourceOffset < sourceEnd
        : sourceOffset > sourceStart && sourceOffset <= sourceEnd

    if (isMatch) {
      return span
    }
  }

  return null
}

export function setPreviewDomSelectionFromOffsets(
  previewContentElement: HTMLDivElement,
  startOffset: number,
  endOffset: number,
) {
  const startSpan = findPreviewSourceSpanForOffset(
    previewContentElement,
    startOffset,
    'start',
  )
  const endSpan = findPreviewSourceSpanForOffset(
    previewContentElement,
    endOffset,
    'end',
  )
  const startNode = startSpan?.firstChild
  const endNode = endSpan?.firstChild

  if (
    startSpan &&
    endSpan &&
    startSpan === endSpan &&
    (!startNode || !endNode)
  ) {
    const range = document.createRange()
    range.selectNode(startSpan)

    const domSelection = window.getSelection()

    if (!domSelection) {
      return false
    }

    domSelection.removeAllRanges()
    domSelection.addRange(range)
    return true
  }

  if (
    !startSpan ||
    !endSpan ||
    !startNode ||
    !endNode ||
    startNode.nodeType !== Node.TEXT_NODE ||
    endNode.nodeType !== Node.TEXT_NODE
  ) {
    return false
  }

  const startSourceOffset = getSourceSpanOffset(startSpan, 'start')
  const endSourceOffset = getSourceSpanOffset(endSpan, 'start')

  if (startSourceOffset === null || endSourceOffset === null) {
    return false
  }

  const range = document.createRange()
  range.setStart(
    startNode,
    clamp(startOffset - startSourceOffset, 0, startNode.textContent?.length ?? 0),
  )
  range.setEnd(
    endNode,
    clamp(endOffset - endSourceOffset, 0, endNode.textContent?.length ?? 0),
  )

  const domSelection = window.getSelection()

  if (!domSelection) {
    return false
  }

  domSelection.removeAllRanges()
  domSelection.addRange(range)
  return true
}

export function getPreviewSelectionOffsets(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
) {
  return getSelectionOffsets(model, selection)
}
