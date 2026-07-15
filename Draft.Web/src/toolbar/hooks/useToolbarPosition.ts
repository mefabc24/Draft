import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { clamp } from '../../shared/utils/clamp'
import { getPrimarySelection } from '../../editor/monaco/markdownCommandAdapter'
import type {
  ToolbarPosition,
  ToolbarTooltipPosition,
  VisibleSelectionPosition,
} from '../toolbarTypes'

const TOOLBAR_EDGE_PADDING = 8
const TOOLBAR_SELECTION_OFFSET = 10
const TOOLBAR_ESTIMATED_WIDTH = 540
const TOOLBAR_ESTIMATED_HEIGHT = 52
const TOOLBAR_TOOLTIP_EDGE_PADDING = 8
const TOOLBAR_TOOLTIP_GAP = 18

export function getEditorToolbarPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  container: HTMLElement,
  editorBody: HTMLDivElement,
  toolbar: HTMLDivElement | null,
): ToolbarPosition | null {
  const selection = getPrimarySelection(editor)

  if (!selection) {
    return null
  }

  const startPosition = selection.getStartPosition()
  const endPosition = selection.getEndPosition()
  const startVisiblePosition = editor.getScrolledVisiblePosition(startPosition)
  const endVisiblePosition = editor.getScrolledVisiblePosition(endPosition)
  const visiblePositions = [startVisiblePosition, endVisiblePosition].filter(
    (position): position is VisibleSelectionPosition => position !== null,
  )

  if (visiblePositions.length === 0) {
    return null
  }

  const containerRect = container.getBoundingClientRect()
  const editorBodyRect = editorBody.getBoundingClientRect()
  const editorOffsetLeft = editorBodyRect.left - containerRect.left
  const editorOffsetTop = editorBodyRect.top - containerRect.top
  const toolbarWidth = toolbar?.offsetWidth ?? TOOLBAR_ESTIMATED_WIDTH
  const toolbarHeight = toolbar?.offsetHeight ?? TOOLBAR_ESTIMATED_HEIGHT
  const sameLine = startPosition.lineNumber === endPosition.lineNumber
  const primaryPosition = visiblePositions[0]
  const centerX =
    sameLine && startVisiblePosition && endVisiblePosition
      ? (startVisiblePosition.left + endVisiblePosition.left) / 2
      : primaryPosition.left
  const selectionTop = Math.min(
    ...visiblePositions.map((position) => position.top),
  )
  const selectionBottom = Math.max(
    ...visiblePositions.map((position) => position.top + position.height),
  )
  const maxLeft = container.clientWidth - toolbarWidth - TOOLBAR_EDGE_PADDING
  const maxTop = container.clientHeight - toolbarHeight - TOOLBAR_EDGE_PADDING
  const preferredLeft = editorOffsetLeft + centerX - toolbarWidth / 2
  const left = clamp(preferredLeft, TOOLBAR_EDGE_PADDING, maxLeft)
  const preferredTop =
    editorOffsetTop + selectionTop - toolbarHeight - TOOLBAR_SELECTION_OFFSET
  const fallbackTop =
    editorOffsetTop + selectionBottom + TOOLBAR_SELECTION_OFFSET
  const top = clamp(
    preferredTop >= TOOLBAR_EDGE_PADDING ? preferredTop : fallbackTop,
    TOOLBAR_EDGE_PADDING,
    maxTop,
  )

  return { left, preferredLeft, top }
}

export function getPreviewToolbarPosition(
  container: HTMLElement,
  selectionRect: DOMRect,
  toolbar: HTMLDivElement | null,
): ToolbarPosition {
  const containerRect = container.getBoundingClientRect()
  const toolbarWidth = toolbar?.offsetWidth ?? TOOLBAR_ESTIMATED_WIDTH
  const toolbarHeight = toolbar?.offsetHeight ?? TOOLBAR_ESTIMATED_HEIGHT
  const centerX =
    selectionRect.left - containerRect.left + selectionRect.width / 2
  const selectionTop = selectionRect.top - containerRect.top
  const selectionBottom = selectionRect.bottom - containerRect.top
  const maxLeft = container.clientWidth - toolbarWidth - TOOLBAR_EDGE_PADDING
  const maxTop = container.clientHeight - toolbarHeight - TOOLBAR_EDGE_PADDING
  const preferredTop = selectionTop - toolbarHeight - TOOLBAR_SELECTION_OFFSET
  const fallbackTop = selectionBottom + TOOLBAR_SELECTION_OFFSET

  const preferredLeft = centerX - toolbarWidth / 2

  return {
    left: clamp(preferredLeft, TOOLBAR_EDGE_PADDING, maxLeft),
    preferredLeft,
    top: clamp(
      preferredTop >= TOOLBAR_EDGE_PADDING ? preferredTop : fallbackTop,
      TOOLBAR_EDGE_PADDING,
      maxTop,
    ),
  }
}

export function getToolbarTooltipPosition(
  toolbar: HTMLDivElement,
  container: HTMLElement,
  target: HTMLElement,
  tooltip: HTMLDivElement,
): ToolbarTooltipPosition {
  const toolbarRect = toolbar.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const tooltipWidth = tooltip.offsetWidth
  const tooltipHeight = tooltip.offsetHeight
  const targetCenterX = targetRect.left + targetRect.width / 2
  const minLeft =
    containerRect.left - toolbarRect.left + TOOLBAR_TOOLTIP_EDGE_PADDING
  const maxLeft =
    containerRect.right -
    toolbarRect.left -
    tooltipWidth -
    TOOLBAR_TOOLTIP_EDGE_PADDING
  const unclampedLeft = targetCenterX - toolbarRect.left - tooltipWidth / 2
  const left = clamp(unclampedLeft, minLeft, maxLeft)
  const belowTop = targetRect.bottom - toolbarRect.top + TOOLBAR_TOOLTIP_GAP
  const aboveTop =
    targetRect.top - toolbarRect.top - tooltipHeight - TOOLBAR_TOOLTIP_GAP
  const hasSpaceBelow =
    targetRect.bottom + TOOLBAR_TOOLTIP_GAP + tooltipHeight <=
    containerRect.bottom - TOOLBAR_TOOLTIP_EDGE_PADDING
  const placement = hasSpaceBelow || aboveTop < TOOLBAR_TOOLTIP_EDGE_PADDING ? 'bottom' : 'top'
  const top = placement === 'bottom' ? belowTop : aboveTop
  const arrowLeft = clamp(
    targetCenterX - toolbarRect.left - left,
    12,
    Math.max(12, tooltipWidth - 12),
  )

  return {
    arrowLeft,
    left,
    placement,
    top,
  }
}
