import { useCallback, useEffect, useRef } from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { DraftEditorSettings } from '../../settings/settingsTypes'
import type { ViewMode } from '../workspaceTypes'

const FOLLOW_EDITED_SECTION_DEBOUNCE_MS = 60
const FOLLOW_EDITED_SECTION_SCROLL_PADDING = 16

type PreviewSourceAnchor = {
  editorScrollTop: number
  previewScrollTop: number
  sourceLine: number
}

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function interpolate(
  value: number,
  inputStart: number,
  inputEnd: number,
  outputStart: number,
  outputEnd: number,
) {
  if (inputEnd <= inputStart) {
    return value >= inputEnd ? outputEnd : outputStart
  }

  const progress = clamp((value - inputStart) / (inputEnd - inputStart), 0, 1)
  return outputStart + (outputEnd - outputStart) * progress
}

function getEditorMaxScrollTop(editor: monaco.editor.IStandaloneCodeEditor) {
  return Math.max(editor.getScrollHeight() - editor.getLayoutInfo().height, 0)
}

function getPreviewMaxScrollTop(previewScrollElement: HTMLDivElement) {
  return Math.max(
    previewScrollElement.scrollHeight - previewScrollElement.clientHeight,
    0,
  )
}

function getPreviewElementScrollTop(
  previewScrollElement: HTMLDivElement,
  targetElement: HTMLElement,
) {
  const previewBounds = previewScrollElement.getBoundingClientRect()
  const targetBounds = targetElement.getBoundingClientRect()

  return targetBounds.top - previewBounds.top + previewScrollElement.scrollTop
}

function getEditorScrollTopForLine(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  maxScrollTop: number,
) {
  const model = editor.getModel()
  const lineCount = model?.getLineCount() ?? lineNumber
  const clampedLineNumber = clamp(Math.trunc(lineNumber), 1, lineCount)

  return clamp(editor.getTopForLineNumber(clampedLineNumber), 0, maxScrollTop)
}

function getPreviewSourceAnchors(
  editor: monaco.editor.IStandaloneCodeEditor,
  previewScrollElement: HTMLDivElement,
): PreviewSourceAnchor[] {
  const previewTopBySourceLine = new Map<number, number>()
  const editorMaxScrollTop = getEditorMaxScrollTop(editor)
  const previewMaxScrollTop = getPreviewMaxScrollTop(previewScrollElement)
  const elements = previewScrollElement.querySelectorAll<HTMLElement>(
    '[data-source-line]',
  )

  for (const element of elements) {
    const sourceLine = getPreviewBlockSourceLine(element)

    if (sourceLine === null) {
      continue
    }

    const previewScrollTop = clamp(
      getPreviewElementScrollTop(previewScrollElement, element),
      0,
      previewMaxScrollTop,
    )
    const previousScrollTop = previewTopBySourceLine.get(sourceLine)

    previewTopBySourceLine.set(
      sourceLine,
      previousScrollTop === undefined
        ? previewScrollTop
        : Math.min(previousScrollTop, previewScrollTop),
    )
  }

  return Array.from(previewTopBySourceLine, ([sourceLine, previewScrollTop]) => ({
    editorScrollTop: getEditorScrollTopForLine(
      editor,
      sourceLine,
      editorMaxScrollTop,
    ),
    previewScrollTop,
    sourceLine,
  })).sort((left, right) => left.sourceLine - right.sourceLine)
}

function getPreviewScrollTopFromEditor(
  editor: monaco.editor.IStandaloneCodeEditor,
  previewScrollElement: HTMLDivElement,
) {
  const editorMaxScrollTop = getEditorMaxScrollTop(editor)
  const previewMaxScrollTop = getPreviewMaxScrollTop(previewScrollElement)
  const editorScrollTop = clamp(editor.getScrollTop(), 0, editorMaxScrollTop)
  const anchors = getPreviewSourceAnchors(editor, previewScrollElement)

  if (editorMaxScrollTop === 0 || previewMaxScrollTop === 0) {
    return 0
  }

  if (anchors.length === 0) {
    return (editorScrollTop / editorMaxScrollTop) * previewMaxScrollTop
  }

  if (editorMaxScrollTop - editorScrollTop < 1) {
    return previewMaxScrollTop
  }

  const firstAnchor = anchors[0]
  const lastAnchor = anchors[anchors.length - 1]

  if (editorScrollTop <= firstAnchor.editorScrollTop) {
    return interpolate(
      editorScrollTop,
      0,
      firstAnchor.editorScrollTop,
      0,
      firstAnchor.previewScrollTop,
    )
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const previousAnchor = anchors[index - 1]
    const nextAnchor = anchors[index]

    if (editorScrollTop <= nextAnchor.editorScrollTop) {
      return interpolate(
        editorScrollTop,
        previousAnchor.editorScrollTop,
        nextAnchor.editorScrollTop,
        previousAnchor.previewScrollTop,
        nextAnchor.previewScrollTop,
      )
    }
  }

  return interpolate(
    editorScrollTop,
    lastAnchor.editorScrollTop,
    editorMaxScrollTop,
    lastAnchor.previewScrollTop,
    previewMaxScrollTop,
  )
}

function getEditorScrollTopFromPreview(
  editor: monaco.editor.IStandaloneCodeEditor,
  previewScrollElement: HTMLDivElement,
) {
  const editorMaxScrollTop = getEditorMaxScrollTop(editor)
  const previewMaxScrollTop = getPreviewMaxScrollTop(previewScrollElement)
  const previewScrollTop = clamp(
    previewScrollElement.scrollTop,
    0,
    previewMaxScrollTop,
  )
  const anchors = getPreviewSourceAnchors(editor, previewScrollElement)

  if (editorMaxScrollTop === 0 || previewMaxScrollTop === 0) {
    return 0
  }

  if (anchors.length === 0) {
    return (previewScrollTop / previewMaxScrollTop) * editorMaxScrollTop
  }

  if (previewMaxScrollTop - previewScrollTop < 1) {
    return editorMaxScrollTop
  }

  const firstAnchor = anchors[0]
  const lastAnchor = anchors[anchors.length - 1]

  if (previewScrollTop <= firstAnchor.previewScrollTop) {
    return interpolate(
      previewScrollTop,
      0,
      firstAnchor.previewScrollTop,
      0,
      firstAnchor.editorScrollTop,
    )
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const previousAnchor = anchors[index - 1]
    const nextAnchor = anchors[index]

    if (previewScrollTop <= nextAnchor.previewScrollTop) {
      return interpolate(
        previewScrollTop,
        previousAnchor.previewScrollTop,
        nextAnchor.previewScrollTop,
        previousAnchor.editorScrollTop,
        nextAnchor.editorScrollTop,
      )
    }
  }

  return interpolate(
    previewScrollTop,
    lastAnchor.previewScrollTop,
    previewMaxScrollTop,
    lastAnchor.editorScrollTop,
    editorMaxScrollTop,
  )
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
  const targetTop = getPreviewElementScrollTop(
    previewScrollElement,
    targetElement,
  )
  const maxScrollTop = getPreviewMaxScrollTop(previewScrollElement)

  return Math.min(
    Math.max(targetTop - FOLLOW_EDITED_SECTION_SCROLL_PADDING, 0),
    maxScrollTop,
  )
}

function isAfterLastPreviewSourceLine(
  previewScrollElement: HTMLDivElement,
  lineNumber: number,
) {
  const elements = previewScrollElement.querySelectorAll<HTMLElement>(
    '[data-source-line]',
  )
  let lastSourceLine = -Infinity

  for (const element of elements) {
    const sourceLine = getPreviewBlockSourceLine(element)

    if (sourceLine !== null) {
      lastSourceLine = Math.max(lastSourceLine, sourceLine)
    }
  }

  return Number.isFinite(lastSourceLine) && lineNumber > lastSourceLine
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

    const nextScrollTop = getPreviewScrollTopFromEditor(
      editor,
      previewScrollElement,
    )

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

    const nextScrollTop = getEditorScrollTopFromPreview(
      editor,
      previewScrollElement,
    )

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

    const nextScrollTop = isAfterLastPreviewSourceLine(
      previewScrollElement,
      lineNumber,
    )
      ? getPreviewMaxScrollTop(previewScrollElement)
      : getPreviewScrollTopForElement(previewScrollElement, targetElement)

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
