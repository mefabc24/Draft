import { useCallback, useEffect, useRef } from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { DraftEditorSettings } from '../../settings/settingsTypes'
import type { ViewMode } from '../workspaceTypes'

const FOLLOW_EDITED_SECTION_DEBOUNCE_MS = 60
const FOLLOW_EDITED_SECTION_SCROLL_PADDING = 16

type CurrentRef<T> = {
  current: T
}

type UsePreviewScrollSyncOptions = {
  editorRef: CurrentRef<monaco.editor.IStandaloneCodeEditor | null>
  previewScrollRef: CurrentRef<HTMLDivElement | null>
  settingsRef: CurrentRef<DraftEditorSettings>
  viewModeRef: CurrentRef<ViewMode>
}

function getPreviewBlockSourceLine(element: HTMLElement) {
  const value = Number(element.dataset.sourceLine)
  return Number.isFinite(value) && value > 0 ? value : null
}

function findPreviewBlockForEditorLine(
  previewScrollElement: HTMLDivElement,
  lineNumber: number,
) {
  const elements = previewScrollElement.querySelectorAll<HTMLElement>(
    '[data-source-line]',
  )
  let closestPreviousElement: HTMLElement | null = null
  let closestPreviousLine = -Infinity
  let closestNextElement: HTMLElement | null = null
  let closestNextLine = Infinity

  for (const element of elements) {
    const sourceLine = getPreviewBlockSourceLine(element)

    if (sourceLine === null) {
      continue
    }

    if (sourceLine <= lineNumber && sourceLine >= closestPreviousLine) {
      closestPreviousElement = element
      closestPreviousLine = sourceLine
      continue
    }

    if (sourceLine > lineNumber && sourceLine < closestNextLine) {
      closestNextElement = element
      closestNextLine = sourceLine
    }
  }

  return closestPreviousElement ?? closestNextElement
}

function getPreviewScrollTopForElement(
  previewScrollElement: HTMLDivElement,
  targetElement: HTMLElement,
) {
  const previewBounds = previewScrollElement.getBoundingClientRect()
  const targetBounds = targetElement.getBoundingClientRect()
  const targetTop =
    targetBounds.top - previewBounds.top + previewScrollElement.scrollTop
  const maxScrollTop = Math.max(
    previewScrollElement.scrollHeight - previewScrollElement.clientHeight,
    0,
  )

  return Math.min(
    Math.max(targetTop - FOLLOW_EDITED_SECTION_SCROLL_PADDING, 0),
    maxScrollTop,
  )
}

export function usePreviewScrollSync({
  editorRef,
  previewScrollRef,
  settingsRef,
  viewModeRef,
}: UsePreviewScrollSyncOptions) {
  const scrollSyncSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollSyncReleaseTimeoutRef = useRef(0)
  const followEditedSectionTimeoutRef = useRef(0)
  const followEditedSectionAnimationFrameRef = useRef(0)

  const releaseScrollSyncSource = useCallback((source: 'editor' | 'preview') => {
    if (scrollSyncReleaseTimeoutRef.current !== 0) {
      window.clearTimeout(scrollSyncReleaseTimeoutRef.current)
    }

    scrollSyncReleaseTimeoutRef.current = window.setTimeout(() => {
      if (scrollSyncSourceRef.current === source) {
        scrollSyncSourceRef.current = null
      }

      scrollSyncReleaseTimeoutRef.current = 0
    }, 0)
  }, [])

  const isScrollSyncActive = useCallback(() => {
    const mode = settingsRef.current.previewScrollSyncMode

    return (
      viewModeRef.current === 'split' &&
      mode !== 'Off' &&
      mode !== 'FollowEditedSection'
    )
  }, [settingsRef, viewModeRef])

  const isFollowEditedSectionActive = useCallback(() => {
    return (
      viewModeRef.current === 'split' &&
      settingsRef.current.previewScrollSyncMode === 'FollowEditedSection'
    )
  }, [settingsRef, viewModeRef])

  const canSyncPreviewFromEditor = useCallback(() => {
    const mode = settingsRef.current.previewScrollSyncMode

    return mode === 'EditorToPreview' || mode === 'TwoWay'
  }, [settingsRef])

  const canSyncEditorFromPreview = useCallback(() => {
    const mode = settingsRef.current.previewScrollSyncMode

    return mode === 'PreviewToEditor' || mode === 'TwoWay'
  }, [settingsRef])

  const syncPreviewScrollFromEditor = useCallback(() => {
    if (
      !isScrollSyncActive() ||
      !canSyncPreviewFromEditor() ||
      scrollSyncSourceRef.current === 'preview'
    ) {
      return
    }

    const editor = editorRef.current
    const previewScrollElement = previewScrollRef.current

    if (!editor || !previewScrollElement) {
      return
    }

    const editorMaxScrollTop = Math.max(
      editor.getScrollHeight() - editor.getLayoutInfo().height,
      0,
    )
    const previewMaxScrollTop = Math.max(
      previewScrollElement.scrollHeight - previewScrollElement.clientHeight,
      0,
    )
    const nextScrollTop =
      editorMaxScrollTop === 0
        ? 0
        : (editor.getScrollTop() / editorMaxScrollTop) * previewMaxScrollTop

    if (Math.abs(previewScrollElement.scrollTop - nextScrollTop) < 1) {
      return
    }

    scrollSyncSourceRef.current = 'editor'
    previewScrollElement.scrollTop = nextScrollTop
    releaseScrollSyncSource('editor')
  }, [
    canSyncPreviewFromEditor,
    editorRef,
    isScrollSyncActive,
    previewScrollRef,
    releaseScrollSyncSource,
  ])

  const syncEditorScrollFromPreview = useCallback(() => {
    if (
      !isScrollSyncActive() ||
      !canSyncEditorFromPreview() ||
      scrollSyncSourceRef.current === 'editor'
    ) {
      return
    }

    const editor = editorRef.current
    const previewScrollElement = previewScrollRef.current

    if (!editor || !previewScrollElement) {
      return
    }

    const previewMaxScrollTop = Math.max(
      previewScrollElement.scrollHeight - previewScrollElement.clientHeight,
      0,
    )
    const editorMaxScrollTop = Math.max(
      editor.getScrollHeight() - editor.getLayoutInfo().height,
      0,
    )
    const nextScrollTop =
      previewMaxScrollTop === 0
        ? 0
        : (previewScrollElement.scrollTop / previewMaxScrollTop) * editorMaxScrollTop

    if (Math.abs(editor.getScrollTop() - nextScrollTop) < 1) {
      return
    }

    scrollSyncSourceRef.current = 'preview'
    editor.setScrollTop(nextScrollTop)
    releaseScrollSyncSource('preview')
  }, [
    canSyncEditorFromPreview,
    editorRef,
    isScrollSyncActive,
    previewScrollRef,
    releaseScrollSyncSource,
  ])

  const followEditedSection = useCallback(() => {
    if (
      !isFollowEditedSectionActive() ||
      scrollSyncSourceRef.current === 'preview'
    ) {
      return
    }

    const editor = editorRef.current
    const previewScrollElement = previewScrollRef.current

    if (!editor || !previewScrollElement) {
      return
    }

    const lineNumber = editor.getPosition()?.lineNumber ?? 1
    const targetElement = findPreviewBlockForEditorLine(
      previewScrollElement,
      lineNumber,
    )

    if (!targetElement) {
      return
    }

    const nextScrollTop = getPreviewScrollTopForElement(
      previewScrollElement,
      targetElement,
    )

    if (Math.abs(previewScrollElement.scrollTop - nextScrollTop) < 1) {
      return
    }

    scrollSyncSourceRef.current = 'editor'
    previewScrollElement.scrollTop = nextScrollTop
    releaseScrollSyncSource('editor')
  }, [
    editorRef,
    isFollowEditedSectionActive,
    previewScrollRef,
    releaseScrollSyncSource,
  ])

  const scheduleFollowEditedSection = useCallback(() => {
    if (followEditedSectionTimeoutRef.current !== 0) {
      window.clearTimeout(followEditedSectionTimeoutRef.current)
    }

    followEditedSectionTimeoutRef.current = window.setTimeout(() => {
      followEditedSectionTimeoutRef.current = 0

      if (followEditedSectionAnimationFrameRef.current !== 0) {
        window.cancelAnimationFrame(followEditedSectionAnimationFrameRef.current)
      }

      followEditedSectionAnimationFrameRef.current = window.requestAnimationFrame(() => {
        followEditedSectionAnimationFrameRef.current = 0
        followEditedSection()
      })
    }, FOLLOW_EDITED_SECTION_DEBOUNCE_MS)
  }, [followEditedSection])

  const handlePreviewScroll = useCallback(() => {
    syncEditorScrollFromPreview()
  }, [syncEditorScrollFromPreview])

  useEffect(() => {
    return () => {
      if (scrollSyncReleaseTimeoutRef.current !== 0) {
        window.clearTimeout(scrollSyncReleaseTimeoutRef.current)
        scrollSyncReleaseTimeoutRef.current = 0
      }
      if (followEditedSectionTimeoutRef.current !== 0) {
        window.clearTimeout(followEditedSectionTimeoutRef.current)
        followEditedSectionTimeoutRef.current = 0
      }
      if (followEditedSectionAnimationFrameRef.current !== 0) {
        window.cancelAnimationFrame(followEditedSectionAnimationFrameRef.current)
        followEditedSectionAnimationFrameRef.current = 0
      }
    }
  }, [])

  return {
    handlePreviewScroll,
    scheduleFollowEditedSection,
    syncPreviewScrollFromEditor,
  }
}
