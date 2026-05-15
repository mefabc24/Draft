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
  type MarkdownEditorCommand,
} from '../../editor/monaco/markdownCommandAdapter'
import type {
  ActiveFormats,
  HeadingValue,
  ListValue,
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
  const dismissedSelectionKeyRef = useRef<string | null>(null)
  const toolbarInteractionRef = useRef(false)
  const toolbarInteractionTimeoutRef = useRef<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null)
  const [headingValue, setHeadingValue] = useState<HeadingValue>('normal')
  const [listValue, setListValue] = useState<ListValue>('none')
  const [activeFormats, setActiveFormats] =
    useState<ActiveFormats>(EMPTY_ACTIVE_FORMATS)

  useEffect(() => {
    openDropdownRef.current = openDropdown
  }, [openDropdown])

  const clearSavedSelection = useCallback(() => {
    savedModelRef.current = null
    savedPreviewSelectionRef.current = null
    savedSelectionsRef.current = null
    savedSelectionSourceRef.current = null
  }, [])

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
    const preferEditorSelection = editorHasSelection && !!editor?.hasTextFocus()
    const previewSelection =
      !preferEditorSelection && previewAllowed ? rawPreviewSelection : null

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

    if (rawPreviewSelection && !previewAllowed && !preferEditorSelection) {
      clearSavedSelection()
      clearToolbarTooltip()
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (!previewSelection && currentEditorSelections.length === 0) {
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

    if (
      source === 'editor' &&
      !editor.hasTextFocus() &&
      openDropdownRef.current === null &&
      !toolbarInteractionRef.current
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
    setPosition,
    toolbarMode,
    toolbarRef,
    viewMode,
    workspaceRef,
  ])

  const updateToolbarSoon = useCallback(() => {
    window.requestAnimationFrame(updateToolbar)
  }, [updateToolbar])

  const restorePreviewSelectionSoon = useCallback(
    (selections: monaco.Selection[]) => {
      const model = editor?.getModel()
      const previewContentElement = previewContentRef.current
      const selection = selections.find((item) => !isEmptySelection(item)) ?? null

      if (!model || !previewContentElement || !selection) {
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
            return
          }

          updateToolbar()
        })
      })
    },
    [
      clearSavedSelection,
      clearToolbarTooltip,
      editor,
      previewContentRef,
      setPosition,
      updateToolbar,
    ],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    const selectionDisposable = editor.onDidChangeCursorSelection(updateToolbar)
    const scrollDisposable = editor.onDidScrollChange(updateToolbar)
    const layoutDisposable = editor.onDidLayoutChange(updateToolbar)
    const contentSizeDisposable = editor.onDidContentSizeChange(updateToolbar)
    const focusDisposable = editor.onDidFocusEditorWidget(updateToolbar)
    const blurDisposable = editor.onDidBlurEditorWidget(() => {
      window.setTimeout(updateToolbar, 0)
    })
    const previewScrollElement = previewScrollElementRef.current

    document.addEventListener('selectionchange', updateToolbar)
    document.addEventListener('keyup', updateToolbar, true)
    window.addEventListener('resize', updateToolbar)
    previewScrollElement?.addEventListener('scroll', updateToolbar)
    const initialFrameId = window.requestAnimationFrame(updateToolbar)

    return () => {
      window.cancelAnimationFrame(initialFrameId)
      selectionDisposable.dispose()
      scrollDisposable.dispose()
      layoutDisposable.dispose()
      contentSizeDisposable.dispose()
      focusDisposable.dispose()
      blurDisposable.dispose()
      document.removeEventListener('selectionchange', updateToolbar)
      document.removeEventListener('keyup', updateToolbar, true)
      window.removeEventListener('resize', updateToolbar)
      previewScrollElement?.removeEventListener('scroll', updateToolbar)
    }
  }, [editor, previewScrollElementRef, updateToolbar])

  useEffect(() => {
    return () => {
      if (toolbarInteractionTimeoutRef.current !== null) {
        window.clearTimeout(toolbarInteractionTimeoutRef.current)
      }
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

      hideToolbarTooltip()

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
    },
    [
      clearSavedSelection,
      editor,
      hideToolbarTooltip,
      onRequestEditorMode,
      restorePreviewSelectionSoon,
      restoreSavedSelection,
      setPosition,
      updateToolbar,
      updateToolbarSoon,
      viewMode,
    ],
  )

  useToolbarKeyboardCommands({
    editor,
    runEditorCommand,
    savedSelectionSourceRef,
  })

  return {
    activeFormats,
    headingValue,
    listValue,
    markToolbarInteraction,
    openDropdown,
    runEditorCommand,
    setOpenDropdown,
  }
}
