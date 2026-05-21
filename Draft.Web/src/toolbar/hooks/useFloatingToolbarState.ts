import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  canRunMarkdownToolbarCommand,
  cloneSelections,
  createSelectionFromOffsets,
  detectHeadingValue,
  detectInlineFormats,
  detectListValue,
  EMPTY_ACTIVE_FORMATS,
  getNonEmptySelections,
  getSelectionKey,
  getSelectionOffsets,
  isEmptySelection,
  isSelectionAllowedForToolbar,
  isSelectionValidForModel,
  replaceMarkdownSourceRange,
  type MarkdownEditorCommand,
} from '../../editor/monaco/markdownCommandAdapter'
import type {
  ActiveFormats,
  EditableMarkdownSourceRange,
  HeadingValue,
  MarkdownLinkContext,
  ListValue,
} from '../../markdown'
import {
  createMarkdownLinkText,
  getEditableMarkdownSourceRange,
  getLinkEditState,
  getPreviewSelectionRangeForEditedMarkdown,
} from '../../markdown'
import type { FloatingMarkdownToolbarMode } from '../../settings/settingsTypes'
import type { ViewMode } from '../../workspace/workspaceTypes'
import {
  getPreviewSelectionSnapshot,
  setPreviewDomSelectionFromOffsets,
} from './usePreviewToolbarSelection'
import {
  getEditorToolbarPosition,
  getPreviewToolbarPosition,
} from './useToolbarPosition'
import { useToolbarKeyboardCommands } from './useToolbarKeyboardCommands'
import {
  isFloatingToolbarEnabledInEditor,
  isFloatingToolbarEnabledInPreview,
} from '../toolbarMode'
import type {
  DropdownId,
  PreviewSelectionSnapshot,
  ToolbarPosition,
  ToolbarSelectionSource,
} from '../toolbarTypes'

type UseFloatingToolbarStateOptions = {
  clearToolbarTooltip: () => void
  editor: monaco.editor.IStandaloneCodeEditor | null
  editorBodyRef: RefObject<HTMLDivElement | null>
  hideToolbarTooltip: () => void
  onRequestEditorMode: () => void
  position: ToolbarPosition | null
  previewContentRef: RefObject<HTMLDivElement | null>
  previewScrollElementRef: RefObject<HTMLDivElement | null>
  setPosition: Dispatch<SetStateAction<ToolbarPosition | null>>
  toolbarMode: FloatingMarkdownToolbarMode
  toolbarRef: RefObject<HTMLDivElement | null>
  viewMode: ViewMode
  workspaceRef: RefObject<HTMLElement | null>
}

type PreviewEditSession = EditableMarkdownSourceRange & {
  sourceKey: string
}

type LinkEditSession = MarkdownLinkContext & {
  source: ToolbarSelectionSource
  sourceKey: string
}

type LinkEditInitialState = {
  label: string
  url: string
}

const PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_CLASS =
  'is-preview-toolbar-command-suppressed'
const PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_FRAMES = 4
const PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_TIMEOUT_MS = 180
const PREVIEW_TOOLBAR_COMMAND_SOURCE_LOCK_TIMEOUT_MS = 500

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }

  return (
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

export function useFloatingToolbarState({
  clearToolbarTooltip,
  editor,
  editorBodyRef,
  hideToolbarTooltip,
  onRequestEditorMode,
  position,
  previewContentRef,
  previewScrollElementRef,
  setPosition,
  toolbarMode,
  toolbarRef,
  viewMode,
  workspaceRef,
}: UseFloatingToolbarStateOptions) {
  const openDropdownRef = useRef<DropdownId | null>(null)
  const savedModelRef = useRef<monaco.editor.ITextModel | null>(null)
  const savedPreviewSelectionRef = useRef<PreviewSelectionSnapshot | null>(null)
  const savedSelectionsRef = useRef<monaco.Selection[] | null>(null)
  const savedSelectionSourceRef = useRef<ToolbarSelectionSource | null>(null)
  const previewEditSessionRef = useRef<PreviewEditSession | null>(null)
  const linkEditSessionRef = useRef<LinkEditSession | null>(null)
  const dismissedSelectionKeyRef = useRef<string | null>(null)
  const isApplyingToolbarCommandRef = useRef(false)
  const isPreviewToolbarCommandSourceLockedRef = useRef(false)
  const toolbarInteractionRef = useRef(false)
  const toolbarInteractionTimeoutRef = useRef<number | null>(null)
  const editorMouseSelectionRef = useRef(false)
  const pendingEditorMouseSelectionUpdateRef = useRef(false)
  const toolbarUpdateFrameRef = useRef<number | null>(null)
  const previewToolbarCommandSuppressionFrameRef = useRef<number | null>(null)
  const previewToolbarCommandSuppressionNodeRef = useRef<HTMLElement | null>(
    null,
  )
  const previewToolbarCommandSuppressionTimeoutRef = useRef<number | null>(null)
  const previewToolbarCommandSourceLockTimeoutRef = useRef<number | null>(null)
  const restoreEditorFocusOnNextToolbarUpdateRef = useRef(false)
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null)
  const [headingValue, setHeadingValue] = useState<HeadingValue>('normal')
  const [listValue, setListValue] = useState<ListValue>('none')
  const [selectionSource, setSelectionSource] =
    useState<ToolbarSelectionSource | null>(null)
  const [previewEditRange, setPreviewEditRange] =
    useState<EditableMarkdownSourceRange | null>(null)
  const [previewEditSession, setPreviewEditSessionState] =
    useState<PreviewEditSession | null>(null)
  const [linkEditRange, setLinkEditRange] =
    useState<MarkdownLinkContext | null>(null)
  const [linkEditSession, setLinkEditSessionState] =
    useState<LinkEditSession | null>(null)
  const [activeFormats, setActiveFormats] =
    useState<ActiveFormats>(EMPTY_ACTIVE_FORMATS)

  useEffect(() => {
    openDropdownRef.current = openDropdown
  }, [openDropdown])

  const setPreviewEditSession = useCallback(
    (session: PreviewEditSession | null) => {
      previewEditSessionRef.current = session
      setPreviewEditSessionState(session)
    },
    [],
  )

  const setLinkEditSession = useCallback((session: LinkEditSession | null) => {
    linkEditSessionRef.current = session
    setLinkEditSessionState(session)
  }, [])

  const clearSavedSelection = useCallback(() => {
    savedModelRef.current = null
    savedPreviewSelectionRef.current = null
    savedSelectionsRef.current = null
    savedSelectionSourceRef.current = null
    setSelectionSource(null)
    setPreviewEditRange(null)
    setPreviewEditSession(null)
    setLinkEditRange(null)
    setLinkEditSession(null)
  }, [setLinkEditSession, setPreviewEditSession])

  const markToolbarInteraction = useCallback(() => {
    toolbarInteractionRef.current = true

    if (toolbarInteractionTimeoutRef.current !== null) {
      window.clearTimeout(toolbarInteractionTimeoutRef.current)
    }

    toolbarInteractionTimeoutRef.current = window.setTimeout(() => {
      toolbarInteractionRef.current = false
      toolbarInteractionTimeoutRef.current = null
    }, 250)
  }, [])

  const clearPreviewToolbarCommandSuppressionTimers = useCallback(() => {
    if (previewToolbarCommandSuppressionFrameRef.current !== null) {
      window.cancelAnimationFrame(previewToolbarCommandSuppressionFrameRef.current)
      previewToolbarCommandSuppressionFrameRef.current = null
    }

    if (previewToolbarCommandSuppressionTimeoutRef.current !== null) {
      window.clearTimeout(previewToolbarCommandSuppressionTimeoutRef.current)
      previewToolbarCommandSuppressionTimeoutRef.current = null
    }
  }, [])

  const releasePreviewToolbarCommandSuppression = useCallback(() => {
    clearPreviewToolbarCommandSuppressionTimers()
    previewToolbarCommandSuppressionNodeRef.current?.classList.remove(
      PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_CLASS,
    )
    previewToolbarCommandSuppressionNodeRef.current = null
  }, [clearPreviewToolbarCommandSuppressionTimers])

  const releasePreviewToolbarCommandSourceLock = useCallback(() => {
    if (previewToolbarCommandSourceLockTimeoutRef.current !== null) {
      window.clearTimeout(previewToolbarCommandSourceLockTimeoutRef.current)
      previewToolbarCommandSourceLockTimeoutRef.current = null
    }

    isPreviewToolbarCommandSourceLockedRef.current = false
  }, [])

  const lockPreviewToolbarCommandSource = useCallback(() => {
    if (previewToolbarCommandSourceLockTimeoutRef.current !== null) {
      window.clearTimeout(previewToolbarCommandSourceLockTimeoutRef.current)
    }

    isPreviewToolbarCommandSourceLockedRef.current = true
    previewToolbarCommandSourceLockTimeoutRef.current = window.setTimeout(
      releasePreviewToolbarCommandSourceLock,
      PREVIEW_TOOLBAR_COMMAND_SOURCE_LOCK_TIMEOUT_MS,
    )
  }, [releasePreviewToolbarCommandSourceLock])

  const suppressPreviewToolbarEditorSelection = useCallback(() => {
    const editorNode = editor?.getDomNode()

    if (!editorNode) {
      return
    }

    if (
      previewToolbarCommandSuppressionNodeRef.current &&
      previewToolbarCommandSuppressionNodeRef.current !== editorNode
    ) {
      previewToolbarCommandSuppressionNodeRef.current.classList.remove(
        PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_CLASS,
      )
    }

    clearPreviewToolbarCommandSuppressionTimers()
    editorNode.classList.add(PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_CLASS)
    previewToolbarCommandSuppressionNodeRef.current = editorNode

    let remainingFrames = PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_FRAMES
    const releaseAfterFrames = () => {
      remainingFrames -= 1

      if (remainingFrames <= 0) {
        releasePreviewToolbarCommandSuppression()
        return
      }

      previewToolbarCommandSuppressionFrameRef.current =
        window.requestAnimationFrame(releaseAfterFrames)
    }

    previewToolbarCommandSuppressionFrameRef.current =
      window.requestAnimationFrame(releaseAfterFrames)
    previewToolbarCommandSuppressionTimeoutRef.current = window.setTimeout(
      releasePreviewToolbarCommandSuppression,
      PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_TIMEOUT_MS,
    )
  }, [
    clearPreviewToolbarCommandSuppressionTimers,
    editor,
    releasePreviewToolbarCommandSuppression,
  ])

  const restoreSavedSelection = useCallback((options: { focusEditor?: boolean } = {}) => {
    if (!editor) {
      return false
    }

    const model = editor.getModel()
    const savedSelections = savedSelectionsRef.current

    if (
      !model ||
      savedModelRef.current !== model ||
      !savedSelections ||
      savedSelections.length === 0 ||
      savedSelections.some((selection) => !isSelectionValidForModel(model, selection))
    ) {
      clearSavedSelection()
      return false
    }

    editor.setSelections(cloneSelections(savedSelections))
    if (options.focusEditor ?? true) {
      editor.focus()
    }
    return true
  }, [clearSavedSelection, editor])

  const updateToolbar = useCallback(() => {
    const model = editor?.getModel()
    const workspaceElement = workspaceRef.current
    const editorBodyElement = editorBodyRef.current
    const previewContentElement = previewContentRef.current
    const savedSource = savedSelectionSourceRef.current
    const editorAllowed = isFloatingToolbarEnabledInEditor(toolbarMode)
    const previewAllowed = isFloatingToolbarEnabledInPreview(toolbarMode)
    const currentEditorSelections =
      editor && editorAllowed ? getNonEmptySelections(editor) : []
    const rawPreviewSelection =
      model && previewContentElement
        ? getPreviewSelectionSnapshot(model, previewContentElement, viewMode)
        : null
    const editorHasSelection =
      editorAllowed && currentEditorSelections.length > 0
    const previewSelection =
      previewAllowed ? rawPreviewSelection : null
    const shouldIgnoreTransientPreviewCommandEditorSelection =
      savedSource === 'preview' &&
      !previewSelection &&
      editorHasSelection &&
      isPreviewToolbarCommandSourceLockedRef.current

    if (
      !editor ||
      !workspaceElement ||
      !editorBodyElement ||
      !model ||
      toolbarMode === 'Disabled'
    ) {
      clearSavedSelection()
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (shouldIgnoreTransientPreviewCommandEditorSelection) {
      return
    }

    if (rawPreviewSelection && !previewAllowed) {
      clearSavedSelection()
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (!previewSelection && currentEditorSelections.length === 0) {
      if (previewEditSessionRef.current || linkEditSessionRef.current) {
        clearToolbarTooltip()
        setOpenDropdown(null)
        return
      }

      if (toolbarInteractionRef.current && savedSelectionsRef.current) {
        return
      }

      clearSavedSelection()
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    const source: ToolbarSelectionSource = previewSelection ? 'preview' : 'editor'
    const currentSelections = previewSelection
      ? [previewSelection.selection]
      : currentEditorSelections
    const selectionKey = previewSelection
      ? previewSelection.sourceKey
      : `editor:${getSelectionKey(currentSelections)}`

    if (dismissedSelectionKeyRef.current === selectionKey) {
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (
      currentSelections.some(
        (selection) => !isSelectionAllowedForToolbar(model, selection),
      )
    ) {
      clearSavedSelection()
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    dismissedSelectionKeyRef.current = null
    savedModelRef.current = model
    savedPreviewSelectionRef.current = previewSelection
    savedSelectionsRef.current = cloneSelections(currentSelections)
    savedSelectionSourceRef.current = source
    setSelectionSource(source)

    if (
      source === 'preview' &&
      editorHasSelection &&
      !isApplyingToolbarCommandRef.current
    ) {
      const currentPosition =
        editor.getPosition() ?? previewSelection?.selection.getStartPosition()

      if (currentPosition) {
        editor.setPosition(currentPosition)
      }
    }

    const nextPreviewEditRange =
      source === 'preview' && previewSelection
        ? getEditableMarkdownSourceRange(model.getValue(), {
            endOffset: previewSelection.editableEndOffset,
            startOffset: previewSelection.editableStartOffset,
          })
        : null
    const primarySelection = currentSelections.find(
      (selection) => !isEmptySelection(selection),
    )
    const nextLinkEditRange = primarySelection
      ? getLinkEditState(
          model.getValue(),
          getSelectionOffsets(model, primarySelection),
        )
      : null

    setPreviewEditRange(nextPreviewEditRange)
    setLinkEditRange(nextLinkEditRange)

    if (
      source !== 'preview' ||
      !nextPreviewEditRange ||
      previewEditSessionRef.current?.sourceKey !== selectionKey
    ) {
      setPreviewEditSession(null)
    }
    if (
      !nextLinkEditRange ||
      linkEditSessionRef.current?.sourceKey !== selectionKey
    ) {
      setLinkEditSession(null)
    }

    if (
      source === 'editor' &&
      !editor.hasTextFocus() &&
      openDropdownRef.current === null &&
      !toolbarInteractionRef.current &&
      !previewEditSessionRef.current &&
      !linkEditSessionRef.current
    ) {
      clearToolbarTooltip()
      setPosition(null)
      return
    }

    const nextPosition =
      source === 'preview' && previewSelection
        ? getPreviewToolbarPosition(
            workspaceElement,
            previewSelection.anchorRect,
            toolbarRef.current,
          )
        : getEditorToolbarPosition(
            editor,
            workspaceElement,
            editorBodyElement,
            toolbarRef.current,
          )

    setActiveFormats(detectInlineFormats(editor, currentSelections))
    setHeadingValue(detectHeadingValue(editor, currentSelections))
    setListValue(detectListValue(editor, currentSelections))
    setPosition((currentPosition) => {
      if (
        currentPosition &&
        nextPosition &&
        currentPosition.left === nextPosition.left &&
        currentPosition.top === nextPosition.top
      ) {
        return currentPosition
      }

      return nextPosition
    })
  }, [
    clearSavedSelection,
    clearToolbarTooltip,
    editor,
    editorBodyRef,
    previewContentRef,
    setLinkEditSession,
    setPreviewEditSession,
    setPosition,
    toolbarMode,
    toolbarRef,
    viewMode,
    workspaceRef,
  ])

  const updateToolbarSoon = useCallback(
    (options: { restoreEditorFocusAfterMouseSelection?: boolean } = {}) => {
      if (options.restoreEditorFocusAfterMouseSelection) {
        restoreEditorFocusOnNextToolbarUpdateRef.current = true
      }

      if (toolbarUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(toolbarUpdateFrameRef.current)
      }

      toolbarUpdateFrameRef.current = window.requestAnimationFrame(() => {
        toolbarUpdateFrameRef.current = null

        const shouldRestoreEditorFocus =
          restoreEditorFocusOnNextToolbarUpdateRef.current
        restoreEditorFocusOnNextToolbarUpdateRef.current = false

        if (
          shouldRestoreEditorFocus &&
          editor &&
          getNonEmptySelections(editor).length > 0 &&
          !editor.hasTextFocus() &&
          openDropdownRef.current === null &&
          !toolbarInteractionRef.current &&
          !previewEditSessionRef.current &&
          !linkEditSessionRef.current
        ) {
          editor.focus()
        }

        updateToolbar()
      })
    },
    [editor, updateToolbar],
  )

  const finishEditorMouseSelection = useCallback(() => {
    if (!editorMouseSelectionRef.current) {
      return
    }

    const hadPendingSelectionUpdate =
      pendingEditorMouseSelectionUpdateRef.current

    editorMouseSelectionRef.current = false
    pendingEditorMouseSelectionUpdateRef.current = false
    // Monaco completes drag selection/focus bookkeeping on mouseup. Deferring
    // toolbar state until the next frame keeps the overlay from intercepting
    // that mouseup and restores text focus only if the drag selection lost it.
    updateToolbarSoon({
      restoreEditorFocusAfterMouseSelection: hadPendingSelectionUpdate,
    })
  }, [updateToolbarSoon])

  const restorePreviewSelectionSoon = useCallback(
    (selections: monaco.Selection[]) => {
      const model = editor?.getModel()
      const previewContentElement = previewContentRef.current
      const selection = selections.find((item) => !isEmptySelection(item)) ?? null

      if (!model || !previewContentElement || !selection) {
        releasePreviewToolbarCommandSourceLock()
        return
      }

      const { endOffset, startOffset } = getSelectionOffsets(model, selection)

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const nextPreviewContentElement = previewContentRef.current

          if (
            !nextPreviewContentElement ||
            !setPreviewDomSelectionFromOffsets(
              nextPreviewContentElement,
              startOffset,
              endOffset,
            )
          ) {
            clearSavedSelection()
            clearToolbarTooltip()
            setOpenDropdown(null)
            setPosition(null)
            releasePreviewToolbarCommandSourceLock()
            return
          }

          updateToolbar()
          releasePreviewToolbarCommandSourceLock()
        })
      })
    },
    [
      clearSavedSelection,
      clearToolbarTooltip,
      editor,
      previewContentRef,
      releasePreviewToolbarCommandSourceLock,
      setPosition,
      updateToolbar,
    ],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    const scheduleToolbarUpdate = () => {
      if (editorMouseSelectionRef.current) {
        pendingEditorMouseSelectionUpdateRef.current = true
        return
      }

      updateToolbarSoon()
    }
    const selectionDisposable = editor.onDidChangeCursorSelection(
      scheduleToolbarUpdate,
    )
    const mouseDownDisposable = editor.onMouseDown((event) => {
      if (!event.event.leftButton) {
        return
      }

      editorMouseSelectionRef.current = true
      pendingEditorMouseSelectionUpdateRef.current = false
    })
    const mouseUpDisposable = editor.onMouseUp(finishEditorMouseSelection)
    const scrollDisposable = editor.onDidScrollChange(scheduleToolbarUpdate)
    const layoutDisposable = editor.onDidLayoutChange(scheduleToolbarUpdate)
    const contentSizeDisposable =
      editor.onDidContentSizeChange(scheduleToolbarUpdate)
    const focusDisposable = editor.onDidFocusEditorWidget(scheduleToolbarUpdate)
    const blurDisposable = editor.onDidBlurEditorWidget(() => {
      window.setTimeout(scheduleToolbarUpdate, 0)
    })
    const previewScrollElement = previewScrollElementRef.current

    document.addEventListener('selectionchange', scheduleToolbarUpdate)
    document.addEventListener('keyup', scheduleToolbarUpdate, true)
    window.addEventListener('mouseup', finishEditorMouseSelection, true)
    window.addEventListener('resize', scheduleToolbarUpdate)
    previewScrollElement?.addEventListener('scroll', scheduleToolbarUpdate)
    const initialFrameId = window.requestAnimationFrame(updateToolbar)

    return () => {
      window.cancelAnimationFrame(initialFrameId)
      selectionDisposable.dispose()
      mouseDownDisposable.dispose()
      mouseUpDisposable.dispose()
      scrollDisposable.dispose()
      layoutDisposable.dispose()
      contentSizeDisposable.dispose()
      focusDisposable.dispose()
      blurDisposable.dispose()
      document.removeEventListener('selectionchange', scheduleToolbarUpdate)
      document.removeEventListener('keyup', scheduleToolbarUpdate, true)
      window.removeEventListener('mouseup', finishEditorMouseSelection, true)
      window.removeEventListener('resize', scheduleToolbarUpdate)
      previewScrollElement?.removeEventListener('scroll', scheduleToolbarUpdate)
    }
  }, [
    editor,
    finishEditorMouseSelection,
    previewScrollElementRef,
    updateToolbar,
    updateToolbarSoon,
  ])

  useEffect(() => {
    return () => {
      if (toolbarInteractionTimeoutRef.current !== null) {
        window.clearTimeout(toolbarInteractionTimeoutRef.current)
      }
      if (toolbarUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(toolbarUpdateFrameRef.current)
      }
      if (previewToolbarCommandSourceLockTimeoutRef.current !== null) {
        window.clearTimeout(previewToolbarCommandSourceLockTimeoutRef.current)
      }
      if (previewToolbarCommandSuppressionFrameRef.current !== null) {
        window.cancelAnimationFrame(
          previewToolbarCommandSuppressionFrameRef.current,
        )
      }
      if (previewToolbarCommandSuppressionTimeoutRef.current !== null) {
        window.clearTimeout(previewToolbarCommandSuppressionTimeoutRef.current)
      }
      previewToolbarCommandSuppressionNodeRef.current?.classList.remove(
        PREVIEW_TOOLBAR_COMMAND_SUPPRESSION_CLASS,
      )
      isPreviewToolbarCommandSourceLockedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!position) {
      return
    }

    const frameId = window.requestAnimationFrame(updateToolbar)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [position, updateToolbar])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      const editorNode = editor.getDomNode()
      const previewContentElement = previewContentRef.current

      if (!(target instanceof Node)) {
        return
      }

      if (
        toolbarRef.current?.contains(target) ||
        editorNode?.contains(target) ||
        previewContentElement?.contains(target)
      ) {
        return
      }

      toolbarInteractionRef.current = false
      clearSavedSelection()
      clearToolbarTooltip()
      setOpenDropdown(null)
      setPosition(null)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const currentSelections = getNonEmptySelections(editor)
        const savedSelections = savedSelectionsRef.current
        const savedSource = savedSelectionSourceRef.current
        const savedPreviewSelection = savedPreviewSelectionRef.current

        dismissedSelectionKeyRef.current =
          savedSource === 'preview' && savedPreviewSelection
            ? savedPreviewSelection.sourceKey
            : currentSelections.length > 0
              ? `editor:${getSelectionKey(currentSelections)}`
              : savedSelections
                ? `editor:${getSelectionKey(savedSelections)}`
                : null
        if (savedSource === 'preview') {
          window.getSelection()?.removeAllRanges()
        }
        clearSavedSelection()
        toolbarInteractionRef.current = false
        clearToolbarTooltip()
        setOpenDropdown(null)
        setPosition(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    clearSavedSelection,
    clearToolbarTooltip,
    editor,
    previewContentRef,
    setPosition,
    toolbarRef,
  ])

  const runEditorCommand = useCallback(
    (
      command: MarkdownEditorCommand,
      options: {
        focusEditor?: boolean
        restoreSavedSelection?: boolean
        switchPreviewLinkToEditor?: boolean
      } = {},
    ) => {
      if (!editor) {
        return
      }

      const source = savedSelectionSourceRef.current ?? 'editor'
      const focusEditor = options.focusEditor ?? source === 'editor'
      const shouldRestoreSelection = options.restoreSavedSelection ?? true

      if (source === 'preview') {
        lockPreviewToolbarCommandSource()
        suppressPreviewToolbarEditorSelection()
      }

      hideToolbarTooltip()
      setPreviewEditSession(null)
      setLinkEditSession(null)

      isApplyingToolbarCommandRef.current = true
      try {
        if (
          shouldRestoreSelection &&
          !restoreSavedSelection({ focusEditor })
        ) {
          setOpenDropdown(null)
          setPosition(null)
          return
        }

        if (!canRunMarkdownToolbarCommand(editor)) {
          setOpenDropdown(null)
          setPosition(null)
          return
        }

        dismissedSelectionKeyRef.current = null
        command(editor, { focusEditor })
        const nextSelections = editor.getSelections() ?? []
        const shouldSwitchPreviewToEditor =
          source === 'preview' &&
          !!options.switchPreviewLinkToEditor &&
          nextSelections.every(isEmptySelection)
        setOpenDropdown(null)

        if (shouldSwitchPreviewToEditor) {
          releasePreviewToolbarCommandSuppression()
          releasePreviewToolbarCommandSourceLock()
          window.getSelection()?.removeAllRanges()
          savedSelectionSourceRef.current = 'editor'
          savedPreviewSelectionRef.current = null
          savedSelectionsRef.current = cloneSelections(nextSelections)
          if (viewMode === 'preview') {
            onRequestEditorMode()
          }
          window.requestAnimationFrame(() => {
            editor.focus()
            updateToolbar()
          })
          return
        }

        if (source === 'preview') {
          const nextNonEmptySelections = nextSelections.filter(
            (selection) => !isEmptySelection(selection),
          )

          if (nextNonEmptySelections.length === 0) {
            clearSavedSelection()
            setPosition(null)
            return
          }

          savedSelectionSourceRef.current = 'preview'
          savedSelectionsRef.current = cloneSelections(nextNonEmptySelections)
          restorePreviewSelectionSoon(nextNonEmptySelections)
          return
        }

        updateToolbarSoon()
      } finally {
        isApplyingToolbarCommandRef.current = false
      }
    },
    [
      clearSavedSelection,
      editor,
      hideToolbarTooltip,
      lockPreviewToolbarCommandSource,
      onRequestEditorMode,
      restorePreviewSelectionSoon,
      restoreSavedSelection,
      releasePreviewToolbarCommandSuppression,
      releasePreviewToolbarCommandSourceLock,
      setLinkEditSession,
      setPreviewEditSession,
      setPosition,
      suppressPreviewToolbarEditorSelection,
      updateToolbar,
      updateToolbarSoon,
      viewMode,
    ],
  )

  const openPreviewEditMenu = useCallback(() => {
    const model = savedModelRef.current
    const previewSelection = savedPreviewSelectionRef.current

    if (
      !model ||
      savedSelectionSourceRef.current !== 'preview' ||
      !previewSelection
    ) {
      return null
    }

    const editableRange = getEditableMarkdownSourceRange(model.getValue(), {
      endOffset: previewSelection.editableEndOffset,
      startOffset: previewSelection.editableStartOffset,
    })

    if (!editableRange) {
      return null
    }

    markToolbarInteraction()
    hideToolbarTooltip()
    setOpenDropdown(null)
    setLinkEditSession(null)
    setPreviewEditRange(editableRange)
    setSelectionSource('preview')
    setPreviewEditSession({
      ...editableRange,
      sourceKey: previewSelection.sourceKey,
    })
    return editableRange.text
  }, [
    hideToolbarTooltip,
    markToolbarInteraction,
    setLinkEditSession,
    setPreviewEditSession,
  ])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handlePreviewEditShortcut = (event: KeyboardEvent) => {
      if (
        savedSelectionSourceRef.current !== 'preview' ||
        !(event.ctrlKey || event.metaKey) ||
        !event.shiftKey ||
        event.altKey ||
        event.key.toLowerCase() !== 'e' ||
        isEditableKeyboardTarget(event.target)
      ) {
        return
      }

      const sourceText = openPreviewEditMenu()

      if (sourceText === null) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
    }

    document.addEventListener('keydown', handlePreviewEditShortcut)

    return () => {
      document.removeEventListener('keydown', handlePreviewEditShortcut)
    }
  }, [editor, openPreviewEditMenu])

  const closePreviewEditMenu = useCallback(() => {
    setPreviewEditSession(null)
  }, [setPreviewEditSession])

  const cancelPreviewEditMenu = useCallback(() => {
    const savedSelections = savedSelectionsRef.current
      ? cloneSelections(savedSelectionsRef.current)
      : null
    const savedSource = savedSelectionSourceRef.current

    markToolbarInteraction()
    setPreviewEditSession(null)

    if (savedSource === 'preview' && savedSelections) {
      restorePreviewSelectionSoon(savedSelections)
    }
  }, [
    markToolbarInteraction,
    restorePreviewSelectionSoon,
    setPreviewEditSession,
  ])

  const confirmPreviewEditMenu = useCallback(
    (text: string) => {
      const session = previewEditSessionRef.current
      const model = editor?.getModel()

      if (!editor || !model || !session) {
        setPreviewEditSession(null)
        return
      }

      const currentValue = model.getValue()
      const sourceSegmentIsCurrent =
        session.endOffset <= currentValue.length &&
        currentValue.slice(session.startOffset, session.endOffset) ===
          session.text

      if (!sourceSegmentIsCurrent) {
        setPreviewEditSession(null)
        updateToolbarSoon()
        return
      }

      replaceMarkdownSourceRange(
        editor,
        {
          endOffset: session.endOffset,
          startOffset: session.startOffset,
        },
        text,
        { focusEditor: false, selectReplacement: false },
      )

      const nextPreviewSelectionRange = getPreviewSelectionRangeForEditedMarkdown(
        session.startOffset,
        text,
      )

      setPreviewEditSession(null)
      setOpenDropdown(null)
      clearSavedSelection()
      clearToolbarTooltip()

      if (!nextPreviewSelectionRange) {
        window.getSelection()?.removeAllRanges()
        toolbarInteractionRef.current = false
        setPosition(null)
        return
      }

      const nextPreviewSelection = createSelectionFromOffsets(
        model,
        nextPreviewSelectionRange.startOffset,
        nextPreviewSelectionRange.endOffset,
      )

      toolbarInteractionRef.current = true
      savedModelRef.current = model
      savedSelectionsRef.current = cloneSelections([nextPreviewSelection])
      savedSelectionSourceRef.current = 'preview'
      setSelectionSource('preview')
      setPreviewEditRange({
        ...nextPreviewSelectionRange,
        text: model
          .getValue()
          .slice(
            nextPreviewSelectionRange.startOffset,
            nextPreviewSelectionRange.endOffset,
          ),
      })
      restorePreviewSelectionSoon([nextPreviewSelection])
    },
    [
      clearSavedSelection,
      clearToolbarTooltip,
      editor,
      restorePreviewSelectionSoon,
      setPosition,
      setPreviewEditSession,
      updateToolbarSoon,
    ],
  )

  const openLinkEditMenu = useCallback((): LinkEditInitialState | null => {
    const model = savedModelRef.current
    const savedSelections = savedSelectionsRef.current
    const selection = savedSelections?.find(
      (item) => !isEmptySelection(item),
    )
    const source = savedSelectionSourceRef.current
    const sourceKey =
      source === 'preview' && savedPreviewSelectionRef.current
        ? savedPreviewSelectionRef.current.sourceKey
        : savedSelections
          ? `editor:${getSelectionKey(savedSelections)}`
          : null

    if (!model || !selection || !source || !sourceKey) {
      return null
    }

    const linkState = getLinkEditState(
      model.getValue(),
      getSelectionOffsets(model, selection),
    )

    markToolbarInteraction()
    hideToolbarTooltip()
    setOpenDropdown(null)
    setPreviewEditSession(null)
    setLinkEditRange(linkState)
    setLinkEditSession({
      ...linkState,
      source,
      sourceKey,
    })

    return {
      label: linkState.label,
      url: linkState.url,
    }
  }, [
    hideToolbarTooltip,
    markToolbarInteraction,
    setLinkEditSession,
    setPreviewEditSession,
  ])

  const closeLinkEditMenu = useCallback(() => {
    setLinkEditSession(null)
  }, [setLinkEditSession])

  const cancelLinkEditMenu = useCallback(() => {
    const savedSelections = savedSelectionsRef.current
      ? cloneSelections(savedSelectionsRef.current)
      : null
    const savedSource = savedSelectionSourceRef.current

    markToolbarInteraction()
    setLinkEditSession(null)

    if (savedSource === 'preview' && savedSelections) {
      restorePreviewSelectionSoon(savedSelections)
    }
  }, [markToolbarInteraction, restorePreviewSelectionSoon, setLinkEditSession])

  const confirmLinkEditMenu = useCallback(
    (label: string, url: string) => {
      const session = linkEditSessionRef.current
      const model = editor?.getModel()

      if (!editor || !model || !session) {
        setLinkEditSession(null)
        return
      }

      const currentValue = model.getValue()
      const sourceSegmentIsCurrent =
        session.endOffset <= currentValue.length &&
        currentValue.slice(session.startOffset, session.endOffset) ===
          session.sourceText

      if (!sourceSegmentIsCurrent) {
        setLinkEditSession(null)
        updateToolbarSoon()
        return
      }

      const nextLinkText = createMarkdownLinkText(label, url)

      replaceMarkdownSourceRange(
        editor,
        {
          endOffset: session.endOffset,
          startOffset: session.startOffset,
        },
        nextLinkText,
        {
          focusEditor: session.source === 'editor',
          selectReplacement: false,
        },
      )

      const labelSelection = createSelectionFromOffsets(
        model,
        session.startOffset + 1,
        session.startOffset + 1 + label.length,
      )

      setLinkEditSession(null)
      setOpenDropdown(null)
      clearSavedSelection()
      clearToolbarTooltip()

      if (session.source === 'preview') {
        toolbarInteractionRef.current = true
        savedModelRef.current = model
        savedSelectionsRef.current = cloneSelections([labelSelection])
        savedSelectionSourceRef.current = 'preview'
        setSelectionSource('preview')
        setLinkEditRange({
          endOffset: session.startOffset + nextLinkText.length,
          label,
          sourceText: nextLinkText,
          startOffset: session.startOffset,
          url,
        })
        restorePreviewSelectionSoon([labelSelection])
        return
      }

      editor.setSelection(labelSelection)
      editor.focus()
      updateToolbarSoon()
    },
    [
      clearSavedSelection,
      clearToolbarTooltip,
      editor,
      restorePreviewSelectionSoon,
      setLinkEditSession,
      updateToolbarSoon,
    ],
  )

  useToolbarKeyboardCommands({
    editor,
    runEditorCommand,
    savedSelectionSourceRef,
  })

  const previewEditAvailable =
    selectionSource === 'preview' &&
    (previewEditRange !== null || previewEditSession !== null)
  const previewEditSourceText =
    previewEditSession?.text ?? previewEditRange?.text ?? ''
  const linkEditAvailable =
    selectionSource === 'preview' &&
    (linkEditRange !== null || linkEditSession !== null)
  const linkEditInitialState = {
    label: linkEditSession?.label ?? linkEditRange?.label ?? '',
    url: linkEditSession?.url ?? linkEditRange?.url ?? '',
  }

  return {
    activeFormats,
    headingValue,
    listValue,
    markToolbarInteraction,
    openDropdown,
    previewEdit: {
      available: previewEditAvailable,
      close: closePreviewEditMenu,
      confirm: confirmPreviewEditMenu,
      cancel: cancelPreviewEditMenu,
      open: previewEditSession !== null,
      openMenu: openPreviewEditMenu,
      sourceText: previewEditSourceText,
    },
    linkEdit: {
      available: linkEditAvailable,
      cancel: cancelLinkEditMenu,
      close: closeLinkEditMenu,
      confirm: confirmLinkEditMenu,
      initialState: linkEditInitialState,
      open: linkEditSession !== null,
      openMenu: openLinkEditMenu,
    },
    runEditorCommand,
    setOpenDropdown,
  }
}
