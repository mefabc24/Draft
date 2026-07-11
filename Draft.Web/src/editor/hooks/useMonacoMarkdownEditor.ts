import { useCallback, useEffect, useRef, type Dispatch, type RefObject } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { DraftEditorSettings } from '../../settings/settingsTypes'
import {
  defaultShortcutBindings,
  getShortcutBinding,
  shortcutActionIds,
  type ShortcutActionId,
  type ShortcutBindings,
} from '../../shortcuts/shortcutSettings'
import {
  eventMatchesShortcutAction,
  getMonacoShortcutKeybinding,
} from '../../shortcuts/shortcutMatching'
import { useTranslation } from '../../localization/useTranslation'
import { getEditorTheme, registerEditorThemes } from '../../themes'
import { syncCurrentLineDecorations } from '../monaco/currentLineDecorations'
import { duplicateCurrentLine } from '../monaco/duplicateLine'
import {
  EDITOR_LINE_NUMBER_LEFT_PADDING_PX,
  EDITOR_PADDING,
  EDITOR_SCROLL_SENSITIVITY,
  getEditorFontLoadTarget,
  getEditorSettingsOptions,
} from '../monaco/editorOptions'
import {
  closeMarkdownHtmlTagOnGreaterThan,
  completeMarkdownHtmlOpeningBracket,
  completeMarkdownHtmlSelfClosingSlash,
  mirrorMarkdownHtmlTagNameOnContentChange,
} from '../monaco/htmlTagClosing'
import { moveEditorLines } from '../monaco/lineMovement'
import { continueMarkdownBlockOnEnter } from '../monaco/markdownContinuation'
import { indentEmptyMarkdownListItemOnTab } from '../monaco/markdownListIndentation'
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
  shortcutBindings: ShortcutBindings
}

function remeasureEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  window.requestAnimationFrame(() => {
    monaco.editor.remeasureFonts()
    editor.layout()
  })
}

function syncEditorLayoutVariables(editorHost: HTMLDivElement) {
  editorHost.style.setProperty(
    '--editor-line-number-left-padding',
    `${EDITOR_LINE_NUMBER_LEFT_PADDING_PX}px`,
  )
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }

  return (
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

function shouldAllowSelectionDragAndDrop(event: MouseEvent) {
  return event.button === 0 && event.shiftKey
}

function getEditorActionKeybindings(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  const keybinding = getMonacoShortcutKeybinding(bindings, actionId)

  return keybinding === null ? [] : [keybinding]
}

function normalizeShortcutText(shortcut: string) {
  return shortcut.replace(/\s+/gu, '').toLowerCase()
}

function getChangedDefaultKeybindings(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  const defaultShortcut = getShortcutBinding(defaultShortcutBindings, actionId)
  const currentShortcut = getShortcutBinding(bindings, actionId)

  if (
    normalizeShortcutText(defaultShortcut) ===
    normalizeShortcutText(currentShortcut)
  ) {
    return []
  }

  return getEditorActionKeybindings(defaultShortcutBindings, actionId)
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
  shortcutBindings,
}: UseMonacoMarkdownEditorOptions) {
  const { t } = useTranslation()
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
    const editorHost = editorHostRef.current

    if (!editorHost) {
      return
    }

    syncEditorLayoutVariables(editorHost)
    registerEditorThemes()
    monaco.editor.setTheme(
      getEditorTheme(settingsRef.current.activeEditorThemeId).monacoThemeName,
    )

    const currentEditorSettings = settingsRef.current
    const editor = monaco.editor.create(editorHost, {
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

    const markdownKeyboardSub = editor.onKeyDown((event) => {
      const browserEvent = event.browserEvent
      const settings = settingsRef.current
      const shortcuts = settings.shortcuts

      const consumeKeyboardEvent = () => {
        event.preventDefault()
        event.stopPropagation()
      }

      const isPlainTextInput =
        !browserEvent.ctrlKey &&
        !browserEvent.altKey &&
        !browserEvent.metaKey

      if (settings.autoPairBrackets && isPlainTextInput) {
        if (
          browserEvent.key === '<' &&
          completeMarkdownHtmlOpeningBracket(editor, consumeKeyboardEvent)
        ) {
          return
        }

        if (
          browserEvent.key === '>' &&
          closeMarkdownHtmlTagOnGreaterThan(editor, consumeKeyboardEvent)
        ) {
          return
        }

        if (
          browserEvent.key === '/' &&
          completeMarkdownHtmlSelfClosingSlash(editor, consumeKeyboardEvent)
        ) {
          return
        }
      }

      if (
        eventMatchesShortcutAction(
          browserEvent,
          shortcuts,
          shortcutActionIds.editorContinueMarkdownBlock,
        )
      ) {
        if (continueMarkdownBlockOnEnter(editor)) {
          event.preventDefault()
        }
        return
      }

      if (
        eventMatchesShortcutAction(
          browserEvent,
          shortcuts,
          shortcutActionIds.editorIndentListItem,
        )
      ) {
        if (indentEmptyMarkdownListItemOnTab(editor, consumeKeyboardEvent)) {
          return
        }
      }
    })

    const contentSub = editor.onDidChangeModelContent((event) => {
      if (
        settingsRef.current.autoPairBrackets &&
        mirrorMarkdownHtmlTagNameOnContentChange(editor, event)
      ) {
        return
      }

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
        editor.hasTextFocus() ||
        isEditableKeyboardTarget(event.target)
      ) {
        return
      }

      const shortcuts = settingsRef.current.shortcuts
      const isUndo = eventMatchesShortcutAction(
        event,
        shortcuts,
        shortcutActionIds.editorUndo,
      )
      const isRedo = eventMatchesShortcutAction(
        event,
        shortcuts,
        shortcutActionIds.editorRedo,
      )

      if (!isUndo && !isRedo) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      editor.trigger('draft.globalUndoRedo', isUndo ? 'undo' : 'redo', null)
    }
    const handleSelectionDragMouseDown = (event: MouseEvent) => {
      editor.updateOptions({
        dragAndDrop: shouldAllowSelectionDragAndDrop(event),
      })
    }
    const disableSelectionDragAndDrop = () => {
      editor.updateOptions({ dragAndDrop: false })
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
    editor.getDomNode()?.addEventListener(
      'mousedown',
      handleSelectionDragMouseDown,
      true,
    )
    document.addEventListener('keydown', handleGlobalUndoRedo, true)
    window.addEventListener('mouseup', disableSelectionDragAndDrop, true)
    window.addEventListener('blur', disableSelectionDragAndDrop)

    return () => {
      window.removeEventListener('blur', disableSelectionDragAndDrop)
      window.removeEventListener('mouseup', disableSelectionDragAndDrop, true)
      document.removeEventListener('keydown', handleGlobalUndoRedo, true)
      editor.getDomNode()?.removeEventListener(
        'mousedown',
        handleSelectionDragMouseDown,
        true,
      )
      document.fonts.removeEventListener('loadingdone', syncEditorFontMetrics)
      contentSizeSub.dispose()
      layoutSub.dispose()
      scrollSub.dispose()
      selectionSub.dispose()
      contentSub.dispose()
      markdownKeyboardSub.dispose()
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

  useEffect(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const actions = [
      editor.addAction({
        id: 'draft.editor.undo',
        label: t('commands.editor.undo'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorUndo,
        ),
        run: () => {
          editor.trigger('draft.shortcut', 'undo', null)
        },
      }),
      editor.addAction({
        id: 'draft.editor.redo',
        label: t('commands.editor.redo'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorRedo,
        ),
        run: () => {
          editor.trigger('draft.shortcut', 'redo', null)
        },
      }),
      editor.addAction({
        id: 'draft.editor.duplicateLine',
        label: t('commands.editor.duplicateCurrentLine'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorDuplicateLine,
        ),
        run: () => {
          duplicateCurrentLine(editor)
        },
      }),
      editor.addAction({
        id: 'draft.editor.moveLineUp',
        label: t('commands.editor.moveLineUp'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorMoveLineUp,
        ),
        run: () => {
          moveEditorLines(editor, 'up')
        },
      }),
      editor.addAction({
        id: 'draft.editor.moveLineDown',
        label: t('commands.editor.moveLineDown'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorMoveLineDown,
        ),
        run: () => {
          moveEditorLines(editor, 'down')
        },
      }),
      editor.addAction({
        id: 'draft.editor.moveCursorWordLeft',
        label: t('commands.editor.moveCursorWordLeft'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorMoveCursorWordLeft,
        ),
        run: () => {
          moveSelectionsByWord(editor, 'left', false)
        },
      }),
      editor.addAction({
        id: 'draft.editor.moveCursorWordRight',
        label: t('commands.editor.moveCursorWordRight'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorMoveCursorWordRight,
        ),
        run: () => {
          moveSelectionsByWord(editor, 'right', false)
        },
      }),
      editor.addAction({
        id: 'draft.editor.extendSelectionWordLeft',
        label: t('commands.editor.extendSelectionWordLeft'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorExtendSelectionWordLeft,
        ),
        run: () => {
          moveSelectionsByWord(editor, 'left', true)
        },
      }),
      editor.addAction({
        id: 'draft.editor.extendSelectionWordRight',
        label: t('commands.editor.extendSelectionWordRight'),
        keybindings: getEditorActionKeybindings(
          shortcutBindings,
          shortcutActionIds.editorExtendSelectionWordRight,
        ),
        run: () => {
          moveSelectionsByWord(editor, 'right', true)
        },
      }),
    ]

    for (const action of [
      shortcutActionIds.editorUndo,
      shortcutActionIds.editorRedo,
      shortcutActionIds.editorDuplicateLine,
      shortcutActionIds.editorMoveLineUp,
      shortcutActionIds.editorMoveLineDown,
      shortcutActionIds.editorMoveCursorWordLeft,
      shortcutActionIds.editorMoveCursorWordRight,
      shortcutActionIds.editorExtendSelectionWordLeft,
      shortcutActionIds.editorExtendSelectionWordRight,
    ]) {
      const keybindings = getChangedDefaultKeybindings(shortcutBindings, action)

      if (keybindings.length === 0) {
        continue
      }

      actions.push(
        editor.addAction({
          id: `draft.editor.blockDefault.${action}`,
          label: t('commands.editor.blockDefault', { action }),
          keybindings,
          run: () => {},
        }),
      )
    }

    return () => {
      for (const action of actions) {
        action.dispose()
      }
    }
  }, [editorRef, shortcutBindings, t])

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
