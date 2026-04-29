import { useEffect, useMemo, useRef, useState } from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import './App.css'
import PaneHeader from './PaneHeader'
import PreviewPane from './PreviewPane'
import {
  DRAFT_CURRENT_LINE_DECORATION_CLASS,
  DRAFT_THEME_NAME,
  registerDraftTheme,
} from './theme'

type ViewMode = 'editor' | 'split' | 'preview'
type WebViewMessageEvent = Event & { data: unknown }
type WorkspaceModeMessage = {
  type: 'workspaceModeChanged'
  mode: ViewMode
}
type LoadDocumentMessage = {
  type: 'loadDocument'
  content: string
  fileName: string
}

declare global {
  interface Window {
    setDraftViewMode?: (mode: ViewMode) => void
    chrome?: {
      webview?: {
        addEventListener: (
          type: 'message',
          listener: (event: WebViewMessageEvent) => void,
        ) => void
        removeEventListener: (
          type: 'message',
          listener: (event: WebViewMessageEvent) => void,
        ) => void
        postMessage: (message: string) => void
      }
    }
  }
}

const EDITOR_FONT_FAMILY = "'JetBrains Mono', Consolas, 'Courier New', monospace"
const EDITOR_FONT_SIZE = 18
const EDITOR_FONT_LOAD_TARGET = `${EDITOR_FONT_SIZE}px 'JetBrains Mono'`
const EDITOR_SCROLL_SENSITIVITY = 1.5
const MIN_EDITOR_THUMB_HEIGHT = 56
const DEFAULT_FILE_NAME = 'untitled.md'
const WORKSPACE_MODE_MESSAGE_TYPE = 'workspaceModeChanged'
const LOAD_DOCUMENT_MESSAGE_TYPE = 'loadDocument'
const DOCUMENT_CHANGED_MESSAGE_TYPE = 'documentChanged'

const EDITOR_PADDING: monaco.editor.IEditorPaddingOptions = {
  top: 16,
  bottom: 16,
}

function getCurrentLineDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.editor.IModelDeltaDecoration[] {
  const selections = editor.getSelections()

  if (!selections || selections.length === 0) {
    return []
  }

  const lineNumbers = new Set<number>()
  const decorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const selection of selections) {
    const lineNumber = selection.positionLineNumber

    if (lineNumbers.has(lineNumber)) {
      continue
    }

    lineNumbers.add(lineNumber)
    decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        className: DRAFT_CURRENT_LINE_DECORATION_CLASS,
        isWholeLine: true,
      },
    })
  }

  return decorations
}

function syncCurrentLineDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
  decorations: monaco.editor.IEditorDecorationsCollection,
) {
  decorations.set(getCurrentLineDecorations(editor))
}

type EditorScrollbarElements = {
  editor: monaco.editor.IStandaloneCodeEditor
  scrollbarElement: HTMLDivElement
  thumbElement: HTMLDivElement
}

function remeasureEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  window.requestAnimationFrame(() => {
    monaco.editor.remeasureFonts()
    editor.layout()
  })
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

function syncEditorScrollbarThumb({
  editor,
  scrollbarElement,
  thumbElement,
}: EditorScrollbarElements) {
  const viewportHeight = editor.getLayoutInfo().height
  const contentHeight = editor.getScrollHeight()
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
    Math.max((viewportHeight / contentHeight) * trackHeight, MIN_EDITOR_THUMB_HEIGHT),
    trackHeight,
  )
  const maxThumbTop = Math.max(trackHeight - thumbHeight, 0)
  const thumbTop =
    maxScrollTop === 0 ? 0 : (editor.getScrollTop() / maxScrollTop) * maxThumbTop

  thumbElement.style.height = `${thumbHeight}px`
  thumbElement.style.transform = `translateY(${thumbTop}px)`
}

function scrollEditorFromPointer(
  { editor, scrollbarElement, thumbElement }: EditorScrollbarElements,
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
  const maxScrollTop = Math.max(editor.getScrollHeight() - editor.getLayoutInfo().height, 0)

  editor.setScrollTop(maxThumbTop === 0 ? 0 : (thumbTop / maxThumbTop) * maxScrollTop)
}

function isViewMode(value: string): value is ViewMode {
  return value === 'editor' || value === 'split' || value === 'preview'
}

function parseWebViewRecord(data: unknown): Record<string, unknown> | null {
  let message = data

  if (typeof message === 'string') {
    try {
      message = JSON.parse(message) as unknown
    } catch {
      return null
    }
  }

  if (!message || typeof message !== 'object') {
    return null
  }

  return message as Record<string, unknown>
}

function parseWorkspaceModeMessage(
  record: Record<string, unknown>,
): WorkspaceModeMessage | null {
  const type = record.type ?? record.Type
  const mode = record.mode ?? record.Mode

  if (type !== WORKSPACE_MODE_MESSAGE_TYPE || typeof mode !== 'string' || !isViewMode(mode)) {
    return null
  }

  return {
    type: WORKSPACE_MODE_MESSAGE_TYPE,
    mode,
  }
}

function parseLoadDocumentMessage(
  record: Record<string, unknown>,
): LoadDocumentMessage | null {
  const type = record.type ?? record.Type
  const content = record.content ?? record.Content
  const fileName = record.fileName ?? record.FileName

  if (
    type !== LOAD_DOCUMENT_MESSAGE_TYPE ||
    typeof content !== 'string' ||
    typeof fileName !== 'string'
  ) {
    return null
  }

  return {
    type: LOAD_DOCUMENT_MESSAGE_TYPE,
    content,
    fileName: fileName.trim() || DEFAULT_FILE_NAME,
  }
}

function postWorkspaceMode(mode: ViewMode) {
  window.chrome?.webview?.postMessage(
    JSON.stringify({
      type: WORKSPACE_MODE_MESSAGE_TYPE,
      mode,
    }),
  )
}

function postDocumentChanged(content: string) {
  window.chrome?.webview?.postMessage(
    JSON.stringify({
      type: DOCUMENT_CHANGED_MESSAGE_TYPE,
      content,
    }),
  )
}

type WordNavigationCharacterKind = 'whitespace' | 'word' | 'symbol'

function getWordNavigationCharacterKind(value: string): WordNavigationCharacterKind {
  if (/\s/u.test(value)) {
    return 'whitespace'
  }

  if (/[\p{L}\p{N}_]/u.test(value)) {
    return 'word'
  }

  return 'symbol'
}

function getNextWordOffset(text: string, offset: number) {
  if (offset >= text.length) {
    return text.length
  }

  let nextOffset = offset
  const currentKind = getWordNavigationCharacterKind(text[nextOffset])

  if (currentKind === 'whitespace') {
    while (
      nextOffset < text.length &&
      getWordNavigationCharacterKind(text[nextOffset]) === 'whitespace'
    ) {
      nextOffset += 1
    }

    return nextOffset
  }

  while (
    nextOffset < text.length &&
    getWordNavigationCharacterKind(text[nextOffset]) === currentKind
  ) {
    nextOffset += 1
  }

  return nextOffset
}

function getPreviousWordOffset(text: string, offset: number) {
  if (offset <= 0) {
    return 0
  }

  let previousOffset = offset
  const previousKind = getWordNavigationCharacterKind(text[previousOffset - 1])

  if (previousKind === 'whitespace') {
    while (
      previousOffset > 0 &&
      getWordNavigationCharacterKind(text[previousOffset - 1]) === 'whitespace'
    ) {
      previousOffset -= 1
    }

    return previousOffset
  }

  while (
    previousOffset > 0 &&
    getWordNavigationCharacterKind(text[previousOffset - 1]) === previousKind
  ) {
    previousOffset -= 1
  }

  return previousOffset
}

function moveSelectionsByWord(
  editor: monaco.editor.IStandaloneCodeEditor,
  direction: 'left' | 'right',
  select: boolean,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return
  }

  const text = model.getValue()
  const nextSelections = selections.map((selection) => {
    const activePosition = {
      lineNumber: selection.positionLineNumber,
      column: selection.positionColumn,
    }
    const activeOffset = model.getOffsetAt(activePosition)
    const nextOffset =
      direction === 'left'
        ? getPreviousWordOffset(text, activeOffset)
        : getNextWordOffset(text, activeOffset)
    const nextPosition = model.getPositionAt(nextOffset)

    if (!select) {
      return new monaco.Selection(
        nextPosition.lineNumber,
        nextPosition.column,
        nextPosition.lineNumber,
        nextPosition.column,
      )
    }

    return new monaco.Selection(
      selection.selectionStartLineNumber,
      selection.selectionStartColumn,
      nextPosition.lineNumber,
      nextPosition.column,
    )
  })

  editor.setSelections(nextSelections)
  editor.revealPositionInCenterIfOutsideViewport(nextSelections[0].getPosition())
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [markdown, setMarkdown] = useState('')
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME)
  const initialMarkdownRef = useRef(markdown)
  const hasReceivedDocumentFromHostRef = useRef(false)
  const isApplyingDocumentFromHostRef = useRef(false)
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const editorScrollbarRef = useRef<HTMLDivElement | null>(null)
  const editorThumbRef = useRef<HTMLDivElement | null>(null)
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  )
  const editorDragOffsetRef = useRef(0)
  const isEditorDraggingRef = useRef(false)

  const syncEditorScrollbarPosition = () => {
    const editor = editorInstanceRef.current
    const scrollbarElement = editorScrollbarRef.current
    const thumbElement = editorThumbRef.current

    if (!editor || !scrollbarElement || !thumbElement) {
      return
    }

    syncEditorScrollbarThumb({ editor, scrollbarElement, thumbElement })
  }

  const scrollEditorScrollbarFromPointer = (clientY: number, thumbOffset: number) => {
    const editor = editorInstanceRef.current
    const scrollbarElement = editorScrollbarRef.current
    const thumbElement = editorThumbRef.current

    if (!editor || !scrollbarElement || !thumbElement) {
      return
    }

    scrollEditorFromPointer({ editor, scrollbarElement, thumbElement }, clientY, thumbOffset)
  }

  const setEditorDraggingState = (dragging: boolean) => {
    const scrollbarElement = editorScrollbarRef.current

    if (!scrollbarElement) {
      return
    }

    setScrollbarFlag(scrollbarElement, 'dragging', dragging)
  }

  const applyDocumentFromHost = (message: LoadDocumentMessage) => {
    const editor = editorInstanceRef.current

    hasReceivedDocumentFromHostRef.current = true
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

  useEffect(() => {
    window.setDraftViewMode = (mode) => {
      if (isViewMode(mode)) {
        setViewMode(mode)
      }
    }

    return () => {
      window.setDraftViewMode = undefined
    }
  }, [])

  useEffect(() => {
    const webview = window.chrome?.webview

    if (!webview) {
      return
    }

    const handleWebViewMessage = (event: WebViewMessageEvent) => {
      const record = parseWebViewRecord(event.data)

      if (!record) {
        return
      }

      const workspaceMessage = parseWorkspaceModeMessage(record)

      if (workspaceMessage) {
        setViewMode(workspaceMessage.mode)
        return
      }

      const loadDocumentMessage = parseLoadDocumentMessage(record)

      if (loadDocumentMessage) {
        applyDocumentFromHost(loadDocumentMessage)
      }
    }

    webview.addEventListener('message', handleWebViewMessage)

    return () => {
      webview.removeEventListener('message', handleWebViewMessage)
    }
  }, [])

  useEffect(() => {
    postWorkspaceMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!editorHostRef.current) {
      return
    }

    registerDraftTheme()
    monaco.editor.setTheme(DRAFT_THEME_NAME)

    const editor = monaco.editor.create(editorHostRef.current, {
      value: initialMarkdownRef.current,
      language: 'markdown',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      fontSize: EDITOR_FONT_SIZE,
      lineHeight: 28,
      padding: EDITOR_PADDING,
      fontFamily: EDITOR_FONT_FAMILY,
      renderLineHighlight: 'gutter',
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
      theme: DRAFT_THEME_NAME,
    })

    const currentLineDecorations = editor.createDecorationsCollection()
    const syncPersistentCurrentLine = () => {
      syncCurrentLineDecorations(editor, currentLineDecorations)
    }

    syncPersistentCurrentLine()

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

    const sub = editor.onDidChangeModelContent(() => {
      const nextMarkdown = editor.getValue()

      setMarkdown(nextMarkdown)

      if (isApplyingDocumentFromHostRef.current || !hasReceivedDocumentFromHostRef.current) {
        return
      }

      postDocumentChanged(nextMarkdown)
    })
    const selectionSub = editor.onDidChangeCursorSelection(() => {
      syncPersistentCurrentLine()
    })
    const scrollSub = editor.onDidScrollChange(() => {
      syncEditorScrollbarPosition()
    })
    const layoutSub = editor.onDidLayoutChange(() => {
      syncEditorScrollbarPosition()
    })
    const contentSizeSub = editor.onDidContentSizeChange(() => {
      syncEditorScrollbarPosition()
    })

    editorInstanceRef.current = editor

    const syncEditorFontMetrics = () => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
    }

    syncEditorFontMetrics()
    syncEditorScrollbarPosition()
    void document.fonts.load(EDITOR_FONT_LOAD_TARGET).then(syncEditorFontMetrics)
    void document.fonts.ready.then(syncEditorFontMetrics)
    document.fonts.addEventListener('loadingdone', syncEditorFontMetrics)

    const scrollbarElement = editorScrollbarRef.current
    let resizeObserver: ResizeObserver | null = null

    if (scrollbarElement) {
      resizeObserver = new ResizeObserver(() => {
        syncEditorScrollbarPosition()
      })
      resizeObserver.observe(scrollbarElement)
    }

    return () => {
      document.fonts.removeEventListener('loadingdone', syncEditorFontMetrics)
      resizeObserver?.disconnect()
      contentSizeSub.dispose()
      layoutSub.dispose()
      scrollSub.dispose()
      selectionSub.dispose()
      sub.dispose()
      editor.dispose()
      editorInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const editor = editorInstanceRef.current

    if (!editor) {
      return
    }

    window.requestAnimationFrame(() => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      syncEditorScrollbarPosition()
    })

    const timeoutId = window.setTimeout(() => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      syncEditorScrollbarPosition()
    }, 240)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [viewMode])

  const previewWordCount = useMemo(() => {
    const words = markdown.match(/\S+/g)
    return words ? words.length : 0
  }, [markdown])

  return (
    <main className="app-shell" onContextMenu={(event) => event.preventDefault()}>
      <section className={`workspace ${viewMode}`}>
        <div
          className="editor-pane"
          aria-label="Markdown Editor"
          aria-hidden={viewMode === 'preview'}
        >
          <PaneHeader
            leftLabel={fileName}
            rightItems={['UTF-8', 'Markdown']}
          />
          <div className="pane-body editor-body">
            <div ref={editorHostRef} className="editor-host" />
            <div
              ref={editorScrollbarRef}
              className="editor-scrollbar"
              data-dragging="false"
              data-scrollable="false"
              aria-hidden="true"
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return
                }

                const thumbElement = editorThumbRef.current

                if (!thumbElement) {
                  return
                }

                scrollEditorScrollbarFromPointer(
                  event.clientY,
                  thumbElement.offsetHeight / 2,
                )
                syncEditorScrollbarPosition()
              }}
            >
              <div
                ref={editorThumbRef}
                className="editor-scrollbar-thumb"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  editorDragOffsetRef.current =
                    event.clientY - event.currentTarget.getBoundingClientRect().top
                  isEditorDraggingRef.current = true
                  setEditorDraggingState(true)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (!isEditorDraggingRef.current) {
                    return
                  }

                  event.preventDefault()
                  scrollEditorScrollbarFromPointer(
                    event.clientY,
                    editorDragOffsetRef.current,
                  )
                  syncEditorScrollbarPosition()
                }}
                onPointerUp={(event) => {
                  if (!isEditorDraggingRef.current) {
                    return
                  }

                  isEditorDraggingRef.current = false
                  setEditorDraggingState(false)

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                }}
                onPointerCancel={(event) => {
                  if (!isEditorDraggingRef.current) {
                    return
                  }

                  isEditorDraggingRef.current = false
                  setEditorDraggingState(false)

                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                }}
              />
            </div>
          </div>
        </div>

        <PreviewPane
          markdown={markdown}
          headerLeft="Live Preview"
          headerRight={[`${previewWordCount} words`]}
          ariaHidden={viewMode === 'editor'}
        />
      </section>
    </main>
  )
}

export default App
