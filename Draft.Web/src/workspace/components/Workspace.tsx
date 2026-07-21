import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import FloatingMarkdownToolbar from '../../toolbar/components/FloatingMarkdownToolbar'
import MarkdownEditorPane from '../../editor/components/MarkdownEditorPane'
import PaneHeader from './PaneHeader'
import PreviewPane from '../../preview/components/PreviewPane'
import WorkspaceDevMenu from '../../dev/components/WorkspaceDevMenu'
import WorkspaceSplitResizer from './WorkspaceSplitResizer'
import { getEditorTheme, getPreviewTheme, getPreviewThemeStyle } from '../../themes'
import { useEditorScrollbar } from '../../editor/hooks/useEditorScrollbar'
import { useMonacoMarkdownEditor } from '../../editor/hooks/useMonacoMarkdownEditor'
import { countMarkdownWords } from '../../markdown'
import { LocalizationProvider } from '../../localization/LocalizationProvider'
import { translate } from '../../localization/localization'
import { DEFAULT_EDITOR_SETTINGS } from '../../settings/defaultEditorSettings'
import { parseSettingsChangedMessage } from '../../settings/settingsMessageParser'
import type {
  DraftEditorSettings,
  FloatingMarkdownToolbarMode,
} from '../../settings/settingsTypes'
import {
  addWebViewMessageListener,
  setPreviewExportHtmlHandler,
  setDraftViewModeHandler,
} from '../../app/webview/draftWebViewBridge'
import {
  DEFAULT_FILE_NAME,
  parseGoToPositionMessage,
  parseLoadDocumentMessage,
  parseStartupStateMessage,
  parseWebViewRecord,
  parseWorkspaceModeMessage,
  postCursorPositionChanged as postCursorPositionChangedMessage,
  postDocumentChanged,
  postOpenRequested,
  postSaveRequested,
  postStartupStateApplied,
  postWorkspaceReady,
  postWorkspaceMode,
  type GoToPositionMessage,
  type LoadDocumentMessage,
  type StartupStateMessage,
} from '../../app/webview/draftWebViewMessages'
import type { WebViewMessageEvent } from '../../app/webview/webViewTypes'
import { createPreviewExportHtml } from '../../export/previewExport'
import {
  addBrowserShortcutGuard,
  type BrowserShortcutDraftCommand,
} from '../../shortcuts/browserShortcutGuard'
import { defaultShortcutBindings } from '../../shortcuts/shortcutSettings'
import { usePreviewScrollSync } from '../hooks/usePreviewScrollSync'
import { useSplitSizing } from '../hooks/useSplitSizing'
import { isViewMode, type ViewMode } from '../workspaceTypes'
import { usePreviewClipboardHistory } from '../../preview/hooks/usePreviewClipboardHistory'

function getSelectedCharacterCount(editor: monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return 0
  }

  return selections.reduce((total, selection) => {
    const isEmptySelection =
      selection.selectionStartLineNumber === selection.positionLineNumber &&
      selection.selectionStartColumn === selection.positionColumn

    if (isEmptySelection) {
      return total
    }

    return total + model.getValueInRange(selection).length
  }, 0)
}

function postCursorPositionChanged(editor: monaco.editor.IStandaloneCodeEditor) {
  const position = editor.getPosition()

  postCursorPositionChangedMessage({
    line: position?.lineNumber ?? 1,
    column: position?.column ?? 1,
    selectedCharacterCount: getSelectedCharacterCount(editor),
  })
}

function isDraftWebViewHost() {
  return window.chrome?.webview !== undefined
}

function Workspace() {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [markdown, setMarkdown] = useState('')
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME)
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [floatingMarkdownToolbarMode, setFloatingMarkdownToolbarMode] =
    useState<FloatingMarkdownToolbarMode>(
      DEFAULT_EDITOR_SETTINGS.floatingMarkdownToolbarMode,
    )
  const [activeEditorThemeId, setActiveEditorThemeId] = useState(
    DEFAULT_EDITOR_SETTINGS.activeEditorThemeId,
  )
  const [activePreviewThemeId, setActivePreviewThemeId] = useState(
    DEFAULT_EDITOR_SETTINGS.activePreviewThemeId,
  )
  const [shortcutBindings, setShortcutBindings] = useState(defaultShortcutBindings)
  const [appLanguage, setAppLanguage] = useState(
    DEFAULT_EDITOR_SETTINGS.appLanguage,
  )
  const initialMarkdownRef = useRef(markdown)
  const hasReceivedDocumentFromHostRef = useRef(false)
  const isApplyingDocumentFromHostRef = useRef(false)
  const fileNameRef = useRef(fileName)
  const markdownRef = useRef(markdown)
  const activePreviewThemeIdRef = useRef(activePreviewThemeId)
  const workspaceRef = useRef<HTMLElement | null>(null)
  const editorBodyRef = useRef<HTMLDivElement | null>(null)
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const previewContentRef = useRef<HTMLDivElement | null>(null)
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  )
  const draftEditorSettingsRef = useRef<DraftEditorSettings>(DEFAULT_EDITOR_SETTINGS)
  const viewModeRef = useRef<ViewMode>(viewMode)
  const suppressNextWorkspaceModePostRef = useRef(false)
  const hasAppliedStartupStateRef = useRef(false)
  const documentGenerationRef = useRef<number | null>(null)
  const postCurrentDocumentChanged = useCallback((content: string) => {
    postDocumentChanged(content, documentGenerationRef.current)
  }, [])
  const {
    clampedSplitEditorRatio,
    isSplitResizing,
    splitResizerProps,
    splitResizerRef,
  } = useSplitSizing({ viewMode, workspaceRef })
  const {
    scrollbarProps: editorScrollbarProps,
    scrollbarRef: editorScrollbarRef,
    syncScrollbarPosition: syncEditorScrollbarPosition,
    thumbProps: editorThumbProps,
    thumbRef: editorThumbRef,
  } = useEditorScrollbar(editorInstance, editorInstanceRef)
  const {
    handlePreviewScroll,
    scheduleFollowEditedSection,
    syncPreviewScrollFromEditor,
  } = usePreviewScrollSync({
    editorRef: editorInstanceRef,
    previewScrollRef,
    settingsRef: draftEditorSettingsRef,
    viewModeRef,
  })
  usePreviewClipboardHistory(previewContentRef)
  const {
    applyEditorSettings,
    resyncEditorLayout,
  } = useMonacoMarkdownEditor({
    editorHostRef,
    editorRef: editorInstanceRef,
    hasReceivedDocumentFromHostRef,
    initialMarkdownRef,
    isApplyingDocumentFromHostRef,
    onCursorPositionChanged: postCursorPositionChanged,
    onDocumentChanged: postCurrentDocumentChanged,
    onFollowEditedSection: scheduleFollowEditedSection,
    onMarkdownChange: setMarkdown,
    onSyncEditorScrollbar: syncEditorScrollbarPosition,
    onSyncPreviewScrollFromEditor: syncPreviewScrollFromEditor,
    setEditorInstance,
    settingsRef: draftEditorSettingsRef,
    shortcutBindings,
  })
  const activeEditorTheme = useMemo(
    () => getEditorTheme(activeEditorThemeId),
    [activeEditorThemeId],
  )
  const workspaceStyle = useMemo(
    () =>
      ({
        ...activeEditorTheme.chromeVariables,
        '--split-editor-pane-width': `${clampedSplitEditorRatio * 100}%`,
        '--split-preview-pane-width': `${(1 - clampedSplitEditorRatio) * 100}%`,
      }) as CSSProperties,
    [activeEditorTheme, clampedSplitEditorRatio],
  )
  const activePreviewTheme = useMemo(
    () => getPreviewTheme(activePreviewThemeId),
    [activePreviewThemeId],
  )
  const previewThemeStyle = useMemo(
    () => getPreviewThemeStyle(activePreviewTheme),
    [activePreviewTheme],
  )

  const applyDraftEditorSettings = (settings: DraftEditorSettings) => {
    draftEditorSettingsRef.current = settings
    setAppLanguage(settings.appLanguage)
    setFloatingMarkdownToolbarMode(settings.floatingMarkdownToolbarMode)
    setActiveEditorThemeId(settings.activeEditorThemeId)
    setActivePreviewThemeId(settings.activePreviewThemeId)
    setShortcutBindings(settings.shortcuts)
    applyEditorSettings(settings)
  }

  const applyDocumentContentFromHost = (message: {
    content: string
    documentGeneration: number | null
    fileName: string
  }) => {
    const editor = editorInstanceRef.current

    hasReceivedDocumentFromHostRef.current = true
    hasAppliedStartupStateRef.current = true
    documentGenerationRef.current = message.documentGeneration
    isApplyingDocumentFromHostRef.current = true
    initialMarkdownRef.current = message.content
    setFileName(message.fileName)
    setMarkdown(message.content)

    if (editor) {
      try {
        if (editor.getValue() !== message.content) {
          editor.setValue(message.content)
        }
      } finally {
        isApplyingDocumentFromHostRef.current = false
      }
    } else {
      isApplyingDocumentFromHostRef.current = false
    }
  }

  const applyDocumentFromHost = (message: LoadDocumentMessage) => {
    applyDocumentContentFromHost(message)
  }

  const applyStartupStateFromHost = (message: StartupStateMessage) => {
    applyDraftEditorSettings(message.settings)
    hasAppliedStartupStateRef.current = true
    documentGenerationRef.current = message.documentGeneration

    if (message.workspaceMode !== viewModeRef.current) {
      suppressNextWorkspaceModePostRef.current = true
      setViewMode(message.workspaceMode)
    }

    applyDocumentContentFromHost({
      content: message.document.content,
      documentGeneration: message.documentGeneration,
      fileName: message.document.displayFileName,
    })
    postStartupStateApplied(message.documentGeneration)
  }

  const applyGoToPositionFromHost = (message: GoToPositionMessage) => {
    const editor = editorInstanceRef.current
    const model = editor?.getModel()

    if (!editor || !model) {
      return
    }

    const lineNumber = Math.min(
      Math.max(Math.trunc(message.line), 1),
      model.getLineCount(),
    )
    const column = Math.min(
      Math.max(Math.trunc(message.column), 1),
      model.getLineMaxColumn(lineNumber),
    )
    const position = { lineNumber, column }

    editor.setPosition(position)
    editor.revealPositionInCenterIfOutsideViewport(position)
    editor.focus()
    postCursorPositionChanged(editor)
    scheduleFollowEditedSection()
  }

  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

  useEffect(() => {
    fileNameRef.current = fileName
  }, [fileName])

  useEffect(() => {
    markdownRef.current = markdown
  }, [markdown])

  useEffect(() => {
    activePreviewThemeIdRef.current = activePreviewThemeId
  }, [activePreviewThemeId])

  useEffect(() => {
    return setPreviewExportHtmlHandler((options) =>
      createPreviewExportHtml({
        fileName: fileNameRef.current,
        layout: options?.layout,
        markdown: editorInstanceRef.current?.getValue() ?? markdownRef.current,
        previewThemeId:
          options?.previewThemeId ?? activePreviewThemeIdRef.current,
      }),
    )
  }, [])

  useEffect(() => {
    return setDraftViewModeHandler((mode) => {
      if (isViewMode(mode) && mode !== viewModeRef.current) {
        suppressNextWorkspaceModePostRef.current = true
        setViewMode(mode)
      }
    })
  }, [])

  useEffect(() => {
    const handleWebViewMessage = (event: WebViewMessageEvent) => {
      const record = parseWebViewRecord(event.data)

      if (!record) {
        return
      }

      const startupStateMessage = parseStartupStateMessage(record)

      if (startupStateMessage) {
        applyStartupStateFromHost(startupStateMessage)
        return
      }

      const settingsMessage = parseSettingsChangedMessage(record)

      if (settingsMessage) {
        applyDraftEditorSettings(settingsMessage)
        return
      }

      const goToPositionMessage = parseGoToPositionMessage(record)

      if (goToPositionMessage) {
        applyGoToPositionFromHost(goToPositionMessage)
        return
      }

      const workspaceMessage = parseWorkspaceModeMessage(record)

      if (workspaceMessage) {
        if (workspaceMessage.mode !== viewModeRef.current) {
          suppressNextWorkspaceModePostRef.current = true
          setViewMode(workspaceMessage.mode)
        }
        return
      }

      const loadDocumentMessage = parseLoadDocumentMessage(record)

      if (loadDocumentMessage) {
        applyDocumentFromHost(loadDocumentMessage)
      }
    }

    const removeWebViewMessageListener = addWebViewMessageListener(handleWebViewMessage)
    const readyFrameId = window.requestAnimationFrame(() => {
      postWorkspaceReady()
    })
    const fallbackTimeoutId = window.setTimeout(() => {
      if (
        hasAppliedStartupStateRef.current ||
        hasReceivedDocumentFromHostRef.current
      ) {
        return
      }

      hasAppliedStartupStateRef.current = true
      hasReceivedDocumentFromHostRef.current = true
      documentGenerationRef.current = null
    }, 5000)

    return () => {
      window.cancelAnimationFrame(readyFrameId)
      window.clearTimeout(fallbackTimeoutId)
      removeWebViewMessageListener()
    }
    // WebView messages read current editor/session state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasAppliedStartupStateRef.current) {
      return
    }

    if (suppressNextWorkspaceModePostRef.current) {
      suppressNextWorkspaceModePostRef.current = false
      return
    }

    postWorkspaceMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    const handleDraftShortcutCommand = (command: BrowserShortcutDraftCommand) => {
      switch (command) {
        case 'open':
          postOpenRequested()
          return
        case 'save':
          postSaveRequested()
          return
      }
    }

    return addBrowserShortcutGuard({
      allowDeveloperShortcuts: import.meta.env.DEV && !isDraftWebViewHost(),
      getShortcutBindings: () => draftEditorSettingsRef.current.shortcuts,
      onDraftCommand: handleDraftShortcutCommand,
    })
  }, [])

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (draftEditorSettingsRef.current.previewScrollSyncMode === 'FollowEditedSection') {
        scheduleFollowEditedSection()
        return
      }

      syncPreviewScrollFromEditor()
    })
    // Scroll syncing reads current editor/session state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown])

  useEffect(() => {
    return resyncEditorLayout()
  }, [clampedSplitEditorRatio, resyncEditorLayout, viewMode])

  const previewWordCount = useMemo(() => {
    return countMarkdownWords(markdown)
  }, [markdown])
  const livePreviewLabel = useMemo(
    () =>
      translate('workspace.livePreview', {
        language: appLanguage,
      }),
    [appLanguage],
  )
  const previewWordCountLabel = useMemo(
    () =>
      translate(
        previewWordCount === 1
          ? 'workspace.wordCountOne'
          : 'workspace.wordCount',
        {
          language: appLanguage,
          params: { count: previewWordCount },
        },
      ),
    [appLanguage, previewWordCount],
  )

  return (
    <LocalizationProvider language={appLanguage}>
      <main
        className="app-shell"
        onContextMenu={(event) => event.preventDefault()}
      >
        <section
          ref={workspaceRef}
          className={`workspace ${viewMode}`}
          style={workspaceStyle}
          data-split-resizing={isSplitResizing ? 'true' : 'false'}
        >
          <MarkdownEditorPane
            ariaHidden={viewMode === 'preview'}
            editor={editorInstance}
            editorBodyRef={editorBodyRef}
            shortcutBindings={shortcutBindings}
            editorHostRef={editorHostRef}
            header={(
              <PaneHeader
                leftLabel={fileName}
                rightItems={['UTF-8', 'Markdown']}
              />
            )}
            scrollbarProps={editorScrollbarProps}
            scrollbarRef={editorScrollbarRef}
            thumbProps={editorThumbProps}
            thumbRef={editorThumbRef}
          />

          <WorkspaceSplitResizer
            isResizing={isSplitResizing}
            resizerProps={splitResizerProps}
            resizerRef={splitResizerRef}
          />

          <PreviewPane
            markdown={markdown}
            header={(
              <PaneHeader
                leftLabel={livePreviewLabel}
                rightItems={[previewWordCountLabel]}
              />
            )}
            ariaHidden={viewMode === 'editor'}
            previewTheme={activePreviewTheme}
            previewThemeStyle={previewThemeStyle}
            previewContentElementRef={previewContentRef}
            previewScrollElementRef={previewScrollRef}
            onPreviewScroll={handlePreviewScroll}
          />
          <FloatingMarkdownToolbar
            editor={editorInstance}
            editorBodyRef={editorBodyRef}
            onRequestEditorMode={() => {
              setViewMode((currentViewMode) =>
                currentViewMode === 'preview' ? 'editor' : currentViewMode,
              )
            }}
            previewContentRef={previewContentRef}
            previewScrollElementRef={previewScrollRef}
            shortcutBindings={shortcutBindings}
            toolbarMode={floatingMarkdownToolbarMode}
            viewMode={viewMode}
            workspaceRef={workspaceRef}
          />
        </section>
        <WorkspaceDevMenu
          activePreviewThemeId={activePreviewThemeId}
          onPreviewThemeChange={setActivePreviewThemeId}
        />
      </main>
    </LocalizationProvider>
  )
}

export default Workspace
