import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

const MIN_PREVIEW_THUMB_HEIGHT = 56

type ScrollbarElements = {
  scrollElement: HTMLDivElement
  scrollbarElement: HTMLDivElement
  thumbElement: HTMLDivElement
}

function getScrollbarElements(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  scrollbarRef: React.RefObject<HTMLDivElement | null>,
  thumbRef: React.RefObject<HTMLDivElement | null>,
): ScrollbarElements | null {
  const scrollElement = scrollRef.current
  const scrollbarElement = scrollbarRef.current
  const thumbElement = thumbRef.current

  if (!scrollElement || !scrollbarElement || !thumbElement) {
    return null
  }

  return { scrollElement, scrollbarElement, thumbElement }
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

function syncPreviewThumb({
  scrollElement,
  scrollbarElement,
  thumbElement,
}: ScrollbarElements) {
  const viewportHeight = scrollElement.clientHeight
  const contentHeight = scrollElement.scrollHeight
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
    Math.max((viewportHeight / contentHeight) * trackHeight, MIN_PREVIEW_THUMB_HEIGHT),
    trackHeight,
  )
  const maxThumbTop = Math.max(trackHeight - thumbHeight, 0)
  const thumbTop =
    maxScrollTop === 0 ? 0 : (scrollElement.scrollTop / maxScrollTop) * maxThumbTop

  thumbElement.style.height = `${thumbHeight}px`
  thumbElement.style.transform = `translateY(${thumbTop}px)`
}

function scrollPreviewFromPointer(
  { scrollElement, scrollbarElement, thumbElement }: ScrollbarElements,
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
  const maxScrollTop = Math.max(scrollElement.scrollHeight - scrollElement.clientHeight, 0)

  scrollElement.scrollTop =
    maxThumbTop === 0 ? 0 : (thumbTop / maxThumbTop) * maxScrollTop
}

// Preview: custom scrollbar interactions
export function usePreviewScrollbar() {
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const previewContentRef = useRef<HTMLDivElement | null>(null)
  const previewScrollbarRef = useRef<HTMLDivElement | null>(null)
  const previewThumbRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)

  const syncThumbPosition = () => {
    const elements = getScrollbarElements(
      previewScrollRef,
      previewScrollbarRef,
      previewThumbRef,
    )

    if (!elements) {
      return
    }

    syncPreviewThumb(elements)
  }

  const scrollFromPointer = (clientY: number, thumbOffset: number) => {
    const elements = getScrollbarElements(
      previewScrollRef,
      previewScrollbarRef,
      previewThumbRef,
    )

    if (!elements) {
      return
    }

    scrollPreviewFromPointer(elements, clientY, thumbOffset)
  }

  const setDraggingState = (dragging: boolean) => {
    const scrollbarElement = previewScrollbarRef.current

    if (!scrollbarElement) {
      return
    }

    setScrollbarFlag(scrollbarElement, 'dragging', dragging)
  }

  const releaseThumbDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return
    }

    isDraggingRef.current = false
    setDraggingState(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  useEffect(() => {
    const scrollElement = previewScrollRef.current
    const contentElement = previewContentRef.current
    const scrollbarElement = previewScrollbarRef.current

    if (!scrollElement || !contentElement || !scrollbarElement) {
      return
    }

    let frameId = 0

    const scheduleSync = () => {
      if (frameId !== 0) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        syncThumbPosition()
      })
    }

    scheduleSync()

    scrollElement.addEventListener('scroll', scheduleSync, { passive: true })

    const resizeObserver = new ResizeObserver(scheduleSync)
    resizeObserver.observe(scrollElement)
    resizeObserver.observe(contentElement)
    resizeObserver.observe(scrollbarElement)
    window.addEventListener('resize', scheduleSync)

    return () => {
      scrollElement.removeEventListener('scroll', scheduleSync)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleSync)

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [])

  return {
    previewScrollRef,
    previewContentRef,
    previewScrollbarRef,
    previewThumbRef,
    handleTrackPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }

      const thumbElement = previewThumbRef.current

      if (!thumbElement) {
        return
      }

      scrollFromPointer(event.clientY, thumbElement.offsetHeight / 2)
      syncThumbPosition()
    },
    handleThumbPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragOffsetRef.current =
        event.clientY - event.currentTarget.getBoundingClientRect().top
      isDraggingRef.current = true
      setDraggingState(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    handleThumbPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return
      }

      event.preventDefault()
      scrollFromPointer(event.clientY, dragOffsetRef.current)
      syncThumbPosition()
    },
    handleThumbPointerUp: releaseThumbDrag,
    handleThumbPointerCancel: releaseThumbDrag,
  }
}
