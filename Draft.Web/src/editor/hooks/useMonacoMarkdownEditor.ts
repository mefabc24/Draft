import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { DraftEditorSettings } from '../../settings/settingsTypes'
import { getEditorTheme, registerEditorThemes } from '../../themes'
import { syncCurrentLineDecorations } from '../monaco/currentLineDecorations'
import { duplicateCurrentLine } from '../monaco/duplicateLine'
import {
  EDITOR_PADDING,
  EDITOR_SCROLL_SENSITIVITY,
  getEditorFontLoadTarget,
  getEditorSettingsOptions,
} from '../monaco/editorOptions'
import { continueMarkdownBlockOnEnter } from '../monaco/markdownContinuation'
import { moveSelectionsByWord } from '../monaco/wordNavigation'

type CurrentRef<T> = {
  current: T
}

type UseMonacoMarkdownEditorOptions = {
  editorHostRef: RefObject<HTMLDivElement | null>
  editorRef: CurrentRef<monaco.editor.IStandaloneCodeEditor | null>
  hasReceivedDocumentFromHostRef: CurrentRef<boolean>
  initialMarkdownRef: CurrentRef<string>
  isApplyingDocumentFromHostRef: CurrentRef<boolean>
  onCursorPositionChanged: (editor: monaco.editor.IStandaloneCodeEditor) => void
  onDocumentChanged: (markdown: string) => void
  onFollowEditedSection: () => void
  onMarkdownChange: Dispatch<string>
  onSyncEditorScrollbar: () => void
  onSyncPreviewScrollFromEditor: () => void
  setEditorInstance: Dispatch<monaco.editor.IStandaloneCodeEditor | null>
  settingsRef: CurrentRef<DraftEditorSettings>
}

function remeasureEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  window.requestAnimationFrame(() => {
    monaco.editor.remeasureFonts()
    editor.layout()
  })
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }

  return (
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

export function useMonacoMarkdownEditor({
  editorHostRef,
  editorRef,
  hasReceivedDocumentFromHostRef,
  initialMarkdownRef,
  isApplyingDocumentFromHostRef,
  onCursorPositionChanged,
  onDocumentChanged,
  onFollowEditedSection,
  onMarkdownChange,
  onSyncEditorScrollbar,
  onSyncPreviewScrollFromEditor,
  setEditorInstance,
  settingsRef,
}: UseMonacoMarkdownEditorOptions) {
  const currentLineDecorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null)

  const applyEditorSettings = useCallback(
    (settings: DraftEditorSettings) => {
      registerEditorThemes()
      monaco.editor.setTheme(getEditorTheme(settings.activeEditorThemeId).monacoThemeName)

      const editor = editorRef.current

      if (!editor) {
        return
      }

      editor.updateOptions(getEditorSettingsOptions(settings))

      const model = editor.getModel()

      if (model) {
        model.updateOptions({
          tabSize: settings.tabSize,
          insertSpaces: settings.insertSpacesInsteadOfTabs,
        })
        monaco.editor.setModelLanguage(
          model,
          settings.markdownSyntaxHighlighting ? 'markdown' : 'plaintext',
        )
      }

      const currentLineDecorations = currentLineDecorationsRef.current

      if (currentLineDecorations) {
        syncCurrentLineDecorations(
          editor,
          currentLineDecorations,
          settings.highlightCurrentLine,
        )
      }

      remeasureEditor(editor)
      onSyncEditorScrollbar()
      if (settings.previewScrollSyncMode === 'FollowEditedSection') {
        onFollowEditedSection()
      } else {
        onSyncPreviewScrollFromEditor()
      }
      void document.fonts.load(getEditorFontLoadTarget(settings)).then(() => {
        if (editorRef.current !== editor) {
          return
        }

        remeasureEditor(editor)
        onSyncEditorScrollbar()
      })
    },
    [
      currentLineDecorationsRef,
      editorRef,
      onFollowEditedSection,
      onSyncEditorScrollbar,
      onSyncPreviewScrollFromEditor,
    ],
  )

  useEffect(() => {
    if (!editorHostRef.current) {
      return
    }

    registerEditorThemes()
    monaco.editor.setTheme(
      getEditorTheme(settingsRef.current.activeEditorThemeId).monacoThemeName,
    )

    const currentEditorSettings = settingsRef.current
    const editor = monaco.editor.create(editorHostRef.current, {
      value: initialMarkdownRef.current,
      language: currentEditorSettings.markdownSyntaxHighlighting ? 'markdown' : 'plaintext',
      automaticLayout: true,
      detectIndentation: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: EDITOR_PADDING,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      parameterHints: { enabled: false },
      wordBasedSuggestions: 'off',
      inlineSuggest: { enabled: false },
      snippetSuggestions: 'none',
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      contextmenu: false,
      cursorWidth: 2,
      cursorHeight: 22,
      mouseWheelScrollSensitivity: EDITOR_SCROLL_SENSITIVITY,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
      },
      theme: getEditorTheme(currentEditorSettings.activeEditorThemeId).monacoThemeName,
      ...getEditorSettingsOptions(currentEditorSettings),
    })
    editor.getModel()?.updateOptions({
      tabSize: currentEditorSettings.tabSize,
      insertSpaces: currentEditorSettings.insertSpacesInsteadOfTabs,
    })

    const currentLineDecorations = editor.createDecorationsCollection()
    currentLineDecorationsRef.current = currentLineDecorations
    const syncPersistentCurrentLine = () => {
      syncCurrentLineDecorations(
        editor,
        currentLineDecorations,
        settingsRef.current.highlightCurrentLine,
      )
    }

    syncPersistentCurrentLine()

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
      () => {
        duplicateCurrentLine(editor)
      },
    )
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.LeftArrow,
      () => {
        moveSelectionsByWord(editor, 'left', false)
      },
    )
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow,
      () => {
        moveSelectionsByWord(editor, 'right', false)
      },
    )
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.LeftArrow,
      () => {
        moveSelectionsByWord(editor, 'left', true)
      },
    )
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.RightArrow,
      () => {
        moveSelectionsByWord(editor, 'right', true)
      },
    )
    const markdownContinuationSub = editor.onKeyDown((event) => {
      if (
        event.keyCode !== monaco.KeyCode.Enter ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return
      }

      if (continueMarkdownBlockOnEnter(editor)) {
        event.preventDefault()
      }
    })

    const contentSub = editor.onDidChangeModelContent(() => {
      const nextMarkdown = editor.getValue()

      onMarkdownChange(nextMarkdown)

      if (isApplyingDocumentFromHostRef.current || !hasReceivedDocumentFromHostRef.current) {
        return
      }

      onDocumentChanged(nextMarkdown)
    })
    const selectionSub = editor.onDidChangeCursorSelection(() => {
      syncPersistentCurrentLine()
      onCursorPositionChanged(editor)
      onFollowEditedSection()
    })
    const scrollSub = editor.onDidScrollChange(() => {
      onSyncEditorScrollbar()
      onSyncPreviewScrollFromEditor()
    })
    const layoutSub = editor.onDidLayoutChange(() => {
      onSyncEditorScrollbar()
    })
    const contentSizeSub = editor.onDidContentSizeChange(() => {
      onSyncEditorScrollbar()
      if (settingsRef.current.previewScrollSyncMode === 'FollowEditedSection') {
        onFollowEditedSection()
      } else {
        onSyncPreviewScrollFromEditor()
      }
    })
    const handleGlobalUndoRedo = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        editor.hasTextFocus() ||
        isEditableKeyboardTarget(event.target) ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const isUndo = key === 'z' && !event.shiftKey
      const isRedo = key === 'z' && event.shiftKey

      if (!isUndo && !isRedo) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      editor.trigger('draft.globalUndoRedo', isUndo ? 'undo' : 'redo', null)
    }

    editorRef.current = editor
    setEditorInstance(editor)
    onCursorPositionChanged(editor)

    const syncEditorFontMetrics = () => {
      if (editorRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
    }

    syncEditorFontMetrics()
    onSyncEditorScrollbar()
    void document.fonts
      .load(getEditorFontLoadTarget(settingsRef.current))
      .then(syncEditorFontMetrics)
    void document.fonts.ready.then(syncEditorFontMetrics)
    document.fonts.addEventListener('loadingdone', syncEditorFontMetrics)
    document.addEventListener('keydown', handleGlobalUndoRedo, true)

    return () => {
      document.removeEventListener('keydown', handleGlobalUndoRedo, true)
      document.fonts.removeEventListener('loadingdone', syncEditorFontMetrics)
      contentSizeSub.dispose()
      layoutSub.dispose()
      scrollSub.dispose()
      selectionSub.dispose()
      contentSub.dispose()
      markdownContinuationSub.dispose()
      editor.dispose()
      editorRef.current = null
      setEditorInstance(null)
      currentLineDecorationsRef.current = null
    }
  }, [
    currentLineDecorationsRef,
    editorHostRef,
    editorRef,
    hasReceivedDocumentFromHostRef,
    initialMarkdownRef,
    isApplyingDocumentFromHostRef,
    onCursorPositionChanged,
    onDocumentChanged,
    onFollowEditedSection,
    onMarkdownChange,
    onSyncEditorScrollbar,
    onSyncPreviewScrollFromEditor,
    setEditorInstance,
    settingsRef,
  ])

  const resyncEditorLayout = useCallback(() => {
    const editor = editorRef.current

    if (!editor) {
      return undefined
    }

    window.requestAnimationFrame(() => {
      if (editorRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      onSyncEditorScrollbar()
      if (settingsRef.current.previewScrollSyncMode === 'FollowEditedSection') {
        onFollowEditedSection()
      } else {
        onSyncPreviewScrollFromEditor()
      }
    })

    const timeoutId = window.setTimeout(() => {
      if (editorRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      onSyncEditorScrollbar()
      if (settingsRef.current.previewScrollSyncMode === 'FollowEditedSection') {
        onFollowEditedSection()
      } else {
        onSyncPreviewScrollFromEditor()
      }
    }, 240)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    editorRef,
    onFollowEditedSection,
    onSyncEditorScrollbar,
    onSyncPreviewScrollFromEditor,
    settingsRef,
  ])

  return {
    applyEditorSettings,
    resyncEditorLayout,
  }
}
