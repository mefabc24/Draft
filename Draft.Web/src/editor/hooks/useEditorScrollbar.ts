import {
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

const MIN_EDITOR_THUMB_HEIGHT = 56

type EditorScrollbarElements = {
  editor: monaco.editor.IStandaloneCodeEditor
  scrollbarElement: HTMLDivElement
  thumbElement: HTMLDivElement
}

function setScrollbarFlag(
  scrollbarElement: HTMLDivElement,
  key: 'dragging' | 'scrollable',
  enabled: boolean,
) {
  scrollbarElement.dataset[key] = enabled ? 'true' : 'false'
}

function getTrackMetrics(scrollbarElement: HTMLDivElement) {
  const { top } = scrollbarElement.getBoundingClientRect()

  return {
    trackHeight: scrollbarElement.clientHeight,
    trackTop: top + scrollbarElement.clientTop,
  }
}

function syncEditorScrollbarThumb({
  editor,
  scrollbarElement,
  thumbElement,
}: EditorScrollbarElements) {
  const viewportHeight = editor.getLayoutInfo().height
  const contentHeight = editor.getScrollHeight()
  const maxScrollTop = Math.max(contentHeight - viewportHeight, 0)
  const { trackHeight } = getTrackMetrics(scrollbarElement)
  const isScrollable = maxScrollTop > 0

  setScrollbarFlag(scrollbarElement, 'scrollable', isScrollable)

  if (!isScrollable) {
    thumbElement.style.height = `${trackHeight}px`
    thumbElement.style.transform = 'translateY(0)'
    return
  }

  const thumbHeight = Math.min(
    Math.max((viewportHeight / contentHeight) * trackHeight, MIN_EDITOR_THUMB_HEIGHT),
    trackHeight,
  )
  const maxThumbTop = Math.max(trackHeight - thumbHeight, 0)
  const thumbTop =
    maxScrollTop === 0 ? 0 : (editor.getScrollTop() / maxScrollTop) * maxThumbTop

  thumbElement.style.height = `${thumbHeight}px`
  thumbElement.style.transform = `translateY(${thumbTop}px)`
}

function scrollEditorFromPointer(
  { editor, scrollbarElement, thumbElement }: EditorScrollbarElements,
  clientY: number,
  thumbOffset: number,
) {
  const { trackHeight, trackTop } = getTrackMetrics(scrollbarElement)
  const thumbHeight = thumbElement.getBoundingClientRect().height
  const maxThumbTop = Math.max(trackHeight - thumbHeight, 0)
  const thumbTop = Math.min(
    Math.max(clientY - trackTop - thumbOffset, 0),
    maxThumbTop,
  )
  const maxScrollTop = Math.max(editor.getScrollHeight() - editor.getLayoutInfo().height, 0)

  editor.setScrollTop(maxThumbTop === 0 ? 0 : (thumbTop / maxThumbTop) * maxScrollTop)
}

export function useEditorScrollbar(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>,
) {
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)

  const syncScrollbarPosition = useCallback(() => {
    const activeEditor = editorRef.current
    const scrollbarElement = scrollbarRef.current
    const thumbElement = thumbRef.current

    if (!activeEditor || !scrollbarElement || !thumbElement) {
      return
    }

    syncEditorScrollbarThumb({
      editor: activeEditor,
      scrollbarElement,
      thumbElement,
    })
  }, [editorRef])

  const scrollFromPointer = useCallback(
    (clientY: number, thumbOffset: number) => {
      const activeEditor = editorRef.current
      const scrollbarElement = scrollbarRef.current
      const thumbElement = thumbRef.current

      if (!activeEditor || !scrollbarElement || !thumbElement) {
        return
      }

      scrollEditorFromPointer(
        { editor: activeEditor, scrollbarElement, thumbElement },
        clientY,
        thumbOffset,
      )
    },
    [editorRef],
  )

  const setDraggingState = useCallback((dragging: boolean) => {
    const scrollbarElement = scrollbarRef.current

    if (!scrollbarElement) {
      return
    }

    setScrollbarFlag(scrollbarElement, 'dragging', dragging)
  }, [])

  const stopDragging = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return
      }

      isDraggingRef.current = false
      setDraggingState(false)

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [setDraggingState],
  )

  const scrollbarProps: HTMLAttributes<HTMLDivElement> = {
    onPointerDown: (event) => {
      if (event.target !== event.currentTarget) {
        return
      }

      const thumbElement = thumbRef.current

      if (!thumbElement) {
        return
      }

      scrollFromPointer(event.clientY, thumbElement.offsetHeight / 2)
      syncScrollbarPosition()
    },
  }

  const thumbProps: HTMLAttributes<HTMLDivElement> = {
    onPointerCancel: stopDragging,
    onPointerDown: (event) => {
      event.preventDefault()
      event.stopPropagation()
      dragOffsetRef.current =
        event.clientY - event.currentTarget.getBoundingClientRect().top
      isDraggingRef.current = true
      setDraggingState(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event) => {
      if (!isDraggingRef.current) {
        return
      }

      event.preventDefault()
      scrollFromPointer(event.clientY, dragOffsetRef.current)
      syncScrollbarPosition()
    },
    onPointerUp: stopDragging,
  }

  useEffect(() => {
    const scrollbarElement = scrollbarRef.current

    if (!editor || !scrollbarElement) {
      return
    }

    const resizeObserver = new ResizeObserver(syncScrollbarPosition)
    resizeObserver.observe(scrollbarElement)

    return () => {
      resizeObserver.disconnect()
    }
  }, [editor, syncScrollbarPosition])

  useEffect(() => {
    return () => {
      isDraggingRef.current = false
      setDraggingState(false)
    }
  }, [setDraggingState])

  return {
    scrollbarProps,
    scrollbarRef,
    syncScrollbarPosition,
    thumbProps,
    thumbRef,
  }
}
