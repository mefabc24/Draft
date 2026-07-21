import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

const MIN_CODE_BLOCK_THUMB_WIDTH = 56

type ScrollbarElements = {
  scrollElement: HTMLPreElement
  scrollbarElement: HTMLDivElement
  thumbElement: HTMLDivElement
}

function getScrollbarElements(
  scrollRef: RefObject<HTMLPreElement | null>,
  scrollbarRef: RefObject<HTMLDivElement | null>,
  thumbRef: RefObject<HTMLDivElement | null>,
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
  const { left } = scrollbarElement.getBoundingClientRect()

  return {
    trackLeft: left + scrollbarElement.clientLeft,
    trackWidth: scrollbarElement.clientWidth,
  }
}

function syncCodeBlockThumb({
  scrollElement,
  scrollbarElement,
  thumbElement,
}: ScrollbarElements) {
  const viewportWidth = scrollElement.clientWidth
  const contentWidth = scrollElement.scrollWidth
  const maxScrollLeft = Math.max(contentWidth - viewportWidth, 0)
  const { trackWidth } = getTrackMetrics(scrollbarElement)
  const isScrollable = maxScrollLeft > 0

  setScrollbarFlag(scrollbarElement, 'scrollable', isScrollable)

  if (!isScrollable) {
    thumbElement.style.width = `${trackWidth}px`
    thumbElement.style.transform = 'translateX(0)'
    return
  }

  const thumbWidth = Math.min(
    Math.max(
      (viewportWidth / contentWidth) * trackWidth,
      MIN_CODE_BLOCK_THUMB_WIDTH,
    ),
    trackWidth,
  )
  const maxThumbLeft = Math.max(trackWidth - thumbWidth, 0)
  const thumbLeft =
    maxScrollLeft === 0
      ? 0
      : (scrollElement.scrollLeft / maxScrollLeft) * maxThumbLeft

  thumbElement.style.width = `${thumbWidth}px`
  thumbElement.style.transform = `translateX(${thumbLeft}px)`
}

function scrollCodeBlockFromPointer(
  { scrollElement, scrollbarElement, thumbElement }: ScrollbarElements,
  clientX: number,
  thumbOffset: number,
) {
  const { trackLeft, trackWidth } = getTrackMetrics(scrollbarElement)
  const thumbWidth = thumbElement.getBoundingClientRect().width
  const maxThumbLeft = Math.max(trackWidth - thumbWidth, 0)
  const thumbLeft = Math.min(
    Math.max(clientX - trackLeft - thumbOffset, 0),
    maxThumbLeft,
  )
  const maxScrollLeft = Math.max(
    scrollElement.scrollWidth - scrollElement.clientWidth,
    0,
  )

  scrollElement.scrollLeft =
    maxThumbLeft === 0 ? 0 : (thumbLeft / maxThumbLeft) * maxScrollLeft
}

export function usePreviewCodeBlockScrollbar(
  scrollRef: RefObject<HTMLPreElement | null>,
  contentVersion: string,
) {
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)

  const getElements = useCallback(
    () => getScrollbarElements(scrollRef, scrollbarRef, thumbRef),
    [scrollRef],
  )

  const syncThumbPosition = useCallback(() => {
    const elements = getElements()

    if (elements) {
      syncCodeBlockThumb(elements)
    }
  }, [getElements])

  const scrollFromPointer = useCallback(
    (clientX: number, thumbOffset: number) => {
      const elements = getElements()

      if (elements) {
        scrollCodeBlockFromPointer(elements, clientX, thumbOffset)
      }
    },
    [getElements],
  )

  const setDraggingState = useCallback((dragging: boolean) => {
    const scrollbarElement = scrollbarRef.current

    if (scrollbarElement) {
      setScrollbarFlag(scrollbarElement, 'dragging', dragging)
    }
  }, [])

  useEffect(() => {
    const scrollElement = scrollRef.current
    const scrollbarElement = scrollbarRef.current

    if (!scrollElement || !scrollbarElement) {
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
    resizeObserver.observe(scrollbarElement)

    if (scrollElement.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(scrollElement.firstElementChild)
    }

    window.addEventListener('resize', scheduleSync)

    return () => {
      scrollElement.removeEventListener('scroll', scheduleSync)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleSync)

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [contentVersion, scrollRef, syncThumbPosition])

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

  return {
    scrollbarRef,
    thumbRef,
    handleTrackPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const thumbElement = thumbRef.current

      if (!thumbElement) {
        return
      }

      scrollFromPointer(event.clientX, thumbElement.offsetWidth / 2)
      syncThumbPosition()
    },
    handleThumbPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragOffsetRef.current =
        event.clientX - event.currentTarget.getBoundingClientRect().left
      isDraggingRef.current = true
      setDraggingState(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    handleThumbPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      scrollFromPointer(event.clientX, dragOffsetRef.current)
      syncThumbPosition()
    },
    handleThumbPointerUp: releaseThumbDrag,
    handleThumbPointerCancel: releaseThumbDrag,
  }
}
