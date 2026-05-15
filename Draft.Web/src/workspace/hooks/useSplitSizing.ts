import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import {
  readStoredSplitEditorRatio,
  writeStoredSplitEditorRatio,
} from '../../settings/splitSizingStorage'
import type { ViewMode } from '../workspaceTypes'

const DEFAULT_SPLIT_RATIO = 0.5
const MIN_SPLIT_PANE_WIDTH = 280

function clampSplitEditorRatio(editorRatio: number, workspaceWidth: number) {
  const normalizedRatio =
    Number.isFinite(editorRatio) && editorRatio > 0 && editorRatio < 1
      ? editorRatio
      : DEFAULT_SPLIT_RATIO

  if (
    !Number.isFinite(workspaceWidth) ||
    workspaceWidth < MIN_SPLIT_PANE_WIDTH * 2
  ) {
    return DEFAULT_SPLIT_RATIO
  }

  const minRatio = MIN_SPLIT_PANE_WIDTH / workspaceWidth
  const maxRatio = 1 - minRatio

  return Math.min(Math.max(normalizedRatio, minRatio), maxRatio)
}

type UseSplitSizingOptions = {
  viewMode: ViewMode
  workspaceRef: RefObject<HTMLElement | null>
}

export function useSplitSizing({
  viewMode,
  workspaceRef,
}: UseSplitSizingOptions) {
  const [splitEditorRatio, setSplitEditorRatio] = useState(
    readStoredSplitEditorRatio,
  )
  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const [isSplitResizing, setIsSplitResizing] = useState(false)
  const splitResizerRef = useRef<HTMLDivElement | null>(null)
  const splitResizePointerOffsetRef = useRef(0)
  const splitResizePointerIdRef = useRef<number | null>(null)
  const isSplitResizingRef = useRef(false)
  const clampedSplitEditorRatio = useMemo(
    () => clampSplitEditorRatio(splitEditorRatio, workspaceWidth),
    [splitEditorRatio, workspaceWidth],
  )

  const clearSplitResizeState = useCallback(() => {
    isSplitResizingRef.current = false
    splitResizePointerIdRef.current = null
    splitResizePointerOffsetRef.current = 0
    setIsSplitResizing(false)
  }, [])

  const releaseSplitResizePointer = useCallback((pointerId: number) => {
    const resizerElement = splitResizerRef.current

    if (resizerElement?.hasPointerCapture(pointerId)) {
      resizerElement.releasePointerCapture(pointerId)
    }
  }, [])

  const resizeSplitFromPointer = useCallback((clientX: number) => {
    const workspaceElement = workspaceRef.current

    if (!workspaceElement) {
      return
    }

    const { left, width } = workspaceElement.getBoundingClientRect()

    if (width <= 0) {
      return
    }

    const dividerX = clientX - left - splitResizePointerOffsetRef.current
    const nextRatio = clampSplitEditorRatio(dividerX / width, width)

    setSplitEditorRatio((currentRatio) =>
      Math.abs(currentRatio - nextRatio) < 0.0001 ? currentRatio : nextRatio,
    )
  }, [workspaceRef])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (viewMode !== 'split') {
      return
    }

    const workspaceElement = workspaceRef.current

    if (!workspaceElement) {
      return
    }

    const { left, width } = workspaceElement.getBoundingClientRect()

    if (width <= 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    splitResizePointerOffsetRef.current =
      event.clientX - (left + clampedSplitEditorRatio * width)
    splitResizePointerIdRef.current = event.pointerId
    isSplitResizingRef.current = true
    setIsSplitResizing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    resizeSplitFromPointer(event.clientX)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isSplitResizingRef.current ||
      splitResizePointerIdRef.current !== event.pointerId
    ) {
      return
    }

    event.preventDefault()
    resizeSplitFromPointer(event.clientX)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isSplitResizingRef.current ||
      splitResizePointerIdRef.current !== event.pointerId
    ) {
      return
    }

    event.preventDefault()
    releaseSplitResizePointer(event.pointerId)
    clearSplitResizeState()
  }

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (splitResizePointerIdRef.current === event.pointerId) {
      clearSplitResizeState()
    }
  }

  const splitResizerProps: HTMLAttributes<HTMLDivElement> = {
    onLostPointerCapture: handleLostPointerCapture,
    onPointerCancel: handlePointerEnd,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
  }

  useEffect(() => {
    writeStoredSplitEditorRatio(splitEditorRatio)
  }, [splitEditorRatio])

  useEffect(() => {
    const workspaceElement = workspaceRef.current

    if (!workspaceElement) {
      return
    }

    const updateWorkspaceWidth = () => {
      setWorkspaceWidth(workspaceElement.getBoundingClientRect().width)
    }

    updateWorkspaceWidth()

    const resizeObserver = new ResizeObserver(updateWorkspaceWidth)
    resizeObserver.observe(workspaceElement)

    return () => {
      resizeObserver.disconnect()
    }
  }, [workspaceRef])

  useEffect(() => {
    if (!isSplitResizing) {
      return
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isSplitResizing])

  useEffect(() => {
    if (viewMode === 'split') {
      return
    }

    const pointerId = splitResizePointerIdRef.current

    if (pointerId !== null) {
      releaseSplitResizePointer(pointerId)
    }

    isSplitResizingRef.current = false
    splitResizePointerIdRef.current = null
    splitResizePointerOffsetRef.current = 0

    const animationFrameId = window.requestAnimationFrame(() => {
      setIsSplitResizing(false)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [releaseSplitResizePointer, viewMode])

  useEffect(() => {
    return () => {
      const pointerId = splitResizePointerIdRef.current

      if (pointerId !== null) {
        releaseSplitResizePointer(pointerId)
      }
    }
  }, [releaseSplitResizePointer])

  return {
    clampedSplitEditorRatio,
    isSplitResizing,
    splitResizerProps,
    splitResizerRef,
  }
}
