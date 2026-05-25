import { useCallback, useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { EDITOR_EMPTY_LINE_INSERT_BUTTON_LEFT } from '../monaco/editorOptions'

const BUTTON_SIZE = 24
const HIDE_DELAY_MS = 80
const INSERT_BUTTON_SELECTOR = '.empty-line-insert-button'

export type HoveredEditorLine = {
  lineNumber: number
  left: number
  top: number
}

function getTargetLineNumber(target: monaco.editor.IMouseTarget | null) {
  if (!target) {
    return null
  }

  switch (target.type) {
    case monaco.editor.MouseTargetType.CONTENT_EMPTY:
      return target.detail.isAfterLines ? null : target.position.lineNumber
    case monaco.editor.MouseTargetType.CONTENT_TEXT:
    case monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN:
    case monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS:
    case monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS:
      return target.position.lineNumber
    default:
      return null
  }
}

function getEmptyLinePosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
): HoveredEditorLine | null {
  const model = editor.getModel()

  if (!model || lineNumber < 1 || lineNumber > model.getLineCount()) {
    return null
  }

  if (model.getLineContent(lineNumber).trim().length > 0) {
    return null
  }

  const visiblePosition = editor.getScrolledVisiblePosition({
    column: 1,
    lineNumber,
  })

  if (!visiblePosition) {
    return null
  }

  return {
    lineNumber,
    left: EDITOR_EMPTY_LINE_INSERT_BUTTON_LEFT,
    top: visiblePosition.top + (visiblePosition.height - BUTTON_SIZE) / 2,
  }
}

function isSameHoveredLine(
  first: HoveredEditorLine | null,
  second: HoveredEditorLine | null,
) {
  return (
    first?.lineNumber === second?.lineNumber &&
    first?.left === second?.left &&
    first?.top === second?.top
  )
}

export function useHoveredEditorLine(
  editor: monaco.editor.IStandaloneCodeEditor | null,
) {
  const [hoveredLine, setHoveredLineState] =
    useState<HoveredEditorLine | null>(null)
  const hoveredLineNumberRef = useRef<number | null>(null)
  const lastMousePointRef = useRef<{ clientX: number; clientY: number } | null>(
    null,
  )
  const hideTimeoutRef = useRef<number | null>(null)
  const updateFrameRef = useRef<number | null>(null)

  const clearPendingHide = useCallback(() => {
    if (hideTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = null
  }, [])

  const updatePointerPoint = useCallback((clientX: number, clientY: number) => {
    lastMousePointRef.current = { clientX, clientY }
  }, [])

  const setHoveredLine = useCallback((nextLine: HoveredEditorLine | null) => {
    hoveredLineNumberRef.current = nextLine?.lineNumber ?? null
    setHoveredLineState((currentLine) =>
      isSameHoveredLine(currentLine, nextLine) ? currentLine : nextLine,
    )
  }, [])

  const hideHoveredLine = useCallback(() => {
    clearPendingHide()
    hoveredLineNumberRef.current = null
    setHoveredLine(null)
  }, [clearPendingHide, setHoveredLine])

  const scheduleHideHoveredLine = useCallback((pointerPoint?: {
    clientX: number
    clientY: number
  }) => {
    clearPendingHide()

    if (pointerPoint) {
      lastMousePointRef.current = pointerPoint
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      const lastMousePoint = lastMousePointRef.current

      if (lastMousePoint) {
        const pointerTarget = document.elementFromPoint(
          lastMousePoint.clientX,
          lastMousePoint.clientY,
        )

        if (pointerTarget?.closest(INSERT_BUTTON_SELECTOR)) {
          hideTimeoutRef.current = null
          return
        }
      }

      hideTimeoutRef.current = null
      hoveredLineNumberRef.current = null
      setHoveredLine(null)
    }, HIDE_DELAY_MS)
  }, [clearPendingHide, setHoveredLine])

  const updateFromLineNumber = useCallback(
    (
      activeEditor: monaco.editor.IStandaloneCodeEditor,
      lineNumber: number | null,
    ) => {
      setHoveredLine(
        lineNumber === null
          ? null
          : getEmptyLinePosition(activeEditor, lineNumber),
      )
    },
    [setHoveredLine],
  )

  const updateFromTarget = useCallback(
    (
      activeEditor: monaco.editor.IStandaloneCodeEditor,
      target: monaco.editor.IMouseTarget | null,
    ) => {
      updateFromLineNumber(activeEditor, getTargetLineNumber(target))
    },
    [updateFromLineNumber],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    const updateFromCurrentPointer = () => {
      updateFrameRef.current = null

      const lastMousePoint = lastMousePointRef.current

      if (lastMousePoint) {
        updateFromTarget(
          editor,
          editor.getTargetAtClientPoint(
            lastMousePoint.clientX,
            lastMousePoint.clientY,
          ),
        )
        return
      }

      updateFromLineNumber(editor, hoveredLineNumberRef.current)
    }

    const schedulePositionUpdate = () => {
      if (updateFrameRef.current !== null) {
        window.cancelAnimationFrame(updateFrameRef.current)
      }

      updateFrameRef.current = window.requestAnimationFrame(
        updateFromCurrentPointer,
      )
    }

    const mouseMoveDisposable = editor.onMouseMove((event) => {
      clearPendingHide()
      updatePointerPoint(
        event.event.browserEvent.clientX,
        event.event.browserEvent.clientY,
      )
      updateFromTarget(editor, event.target)
    })
    const mouseLeaveDisposable = editor.onMouseLeave(() => {
      lastMousePointRef.current = null
      scheduleHideHoveredLine()
    })
    const scrollDisposable = editor.onDidScrollChange(schedulePositionUpdate)
    const layoutDisposable = editor.onDidLayoutChange(schedulePositionUpdate)
    const contentDisposable = editor.onDidChangeModelContent(
      schedulePositionUpdate,
    )
    const modelDisposable = editor.onDidChangeModel(schedulePositionUpdate)
    const configurationDisposable = editor.onDidChangeConfiguration(
      schedulePositionUpdate,
    )

    return () => {
      mouseMoveDisposable.dispose()
      mouseLeaveDisposable.dispose()
      scrollDisposable.dispose()
      layoutDisposable.dispose()
      contentDisposable.dispose()
      modelDisposable.dispose()
      configurationDisposable.dispose()
      lastMousePointRef.current = null

      if (updateFrameRef.current !== null) {
        window.cancelAnimationFrame(updateFrameRef.current)
        updateFrameRef.current = null
      }

      hideHoveredLine()
    }
  }, [
    clearPendingHide,
    editor,
    hideHoveredLine,
    scheduleHideHoveredLine,
    updatePointerPoint,
    updateFromLineNumber,
    updateFromTarget,
  ])

  return {
    clearPendingHide,
    hoveredLine,
    scheduleHideHoveredLine,
    updatePointerPoint,
  }
}
