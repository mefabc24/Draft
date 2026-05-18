import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { getToolbarTooltipPosition } from './useToolbarPosition'
import type { ToolbarTooltipContent } from '../components/ToolbarTooltip'
import type { ActiveToolbarTooltip, ToolbarPosition } from '../toolbarTypes'

type UseToolbarTooltipOptions = {
  toolbarPosition: ToolbarPosition | null
  toolbarRef: RefObject<HTMLDivElement | null>
  workspaceRef: RefObject<HTMLElement | null>
}

export function useToolbarTooltip({
  toolbarPosition,
  toolbarRef,
  workspaceRef,
}: UseToolbarTooltipOptions) {
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipTargetRef = useRef<HTMLElement | null>(null)
  const tooltipHideTimeoutRef = useRef<number | null>(null)
  const tooltipFrameRef = useRef<number | null>(null)
  const [activeTooltip, setActiveTooltip] =
    useState<ActiveToolbarTooltip | null>(null)
  const activeTooltipKey = activeTooltip
    ? `${activeTooltip.label}\u0000${activeTooltip.shortcut ?? ''}`
    : null

  const updateToolbarTooltipPosition = useCallback(() => {
    const toolbar = toolbarRef.current
    const tooltip = tooltipRef.current
    const target = tooltipTargetRef.current
    const container = workspaceRef.current

    if (!toolbar || !tooltip || !target || !container) {
      return
    }

    const nextPosition = getToolbarTooltipPosition(
      toolbar,
      container,
      target,
      tooltip,
    )

    setActiveTooltip((currentTooltip) =>
      currentTooltip
        ? {
            ...currentTooltip,
            ...nextPosition,
            visible: true,
          }
        : currentTooltip,
    )
  }, [toolbarRef, workspaceRef])

  const scheduleToolbarTooltipPosition = useCallback(() => {
    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current)
    }

    tooltipFrameRef.current = window.requestAnimationFrame(() => {
      tooltipFrameRef.current = null
      updateToolbarTooltipPosition()
    })
  }, [updateToolbarTooltipPosition])

  const clearToolbarTooltip = useCallback(() => {
    tooltipTargetRef.current = null

    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current)
      tooltipFrameRef.current = null
    }

    if (tooltipHideTimeoutRef.current !== null) {
      window.clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }

    setActiveTooltip(null)
  }, [])

  const hideToolbarTooltip = useCallback(() => {
    tooltipTargetRef.current = null

    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current)
      tooltipFrameRef.current = null
    }

    if (tooltipHideTimeoutRef.current !== null) {
      window.clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }

    setActiveTooltip((currentTooltip) =>
      currentTooltip ? { ...currentTooltip, visible: false } : currentTooltip,
    )

    tooltipHideTimeoutRef.current = window.setTimeout(() => {
      tooltipHideTimeoutRef.current = null
      setActiveTooltip(null)
    }, 140)
  }, [])

  const showToolbarTooltip = useCallback(
    (target: HTMLElement, tooltip: ToolbarTooltipContent) => {
      if (tooltipHideTimeoutRef.current !== null) {
        window.clearTimeout(tooltipHideTimeoutRef.current)
        tooltipHideTimeoutRef.current = null
      }

      tooltipTargetRef.current = target
      setActiveTooltip((currentTooltip) => ({
        ...tooltip,
        arrowLeft: currentTooltip?.arrowLeft ?? 12,
        left: currentTooltip?.left ?? 0,
        placement: currentTooltip?.placement ?? 'bottom',
        top: currentTooltip?.top ?? 0,
        visible: false,
      }))
      scheduleToolbarTooltipPosition()
    },
    [scheduleToolbarTooltipPosition],
  )

  useEffect(() => {
    return () => {
      if (tooltipHideTimeoutRef.current !== null) {
        window.clearTimeout(tooltipHideTimeoutRef.current)
      }

      if (tooltipFrameRef.current !== null) {
        window.cancelAnimationFrame(tooltipFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeTooltipKey) {
      return
    }

    const frameId = window.requestAnimationFrame(updateToolbarTooltipPosition)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    activeTooltipKey,
    toolbarPosition?.left,
    toolbarPosition?.top,
    updateToolbarTooltipPosition,
  ])

  useEffect(() => {
    const handleResize = () => {
      scheduleToolbarTooltipPosition()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scheduleToolbarTooltipPosition])

  return {
    activeTooltip,
    clearToolbarTooltip,
    hideToolbarTooltip,
    showToolbarTooltip,
    tooltipRef,
  }
}
