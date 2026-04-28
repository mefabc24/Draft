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
const EDITOR_FILE_LABEL = 'drafts/lorem_ipsum.md'
const EDITOR_SCROLL_SENSITIVITY = 1.5
const MIN_EDITOR_THUMB_HEIGHT = 56
const WORKSPACE_MODE_MESSAGE_TYPE = 'workspaceModeChanged'
const INITIAL_MARKDOWN = `# Lorem Ipsum

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Lorem Ipsum Dolor

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Lorem Ipsum Sit

- Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- Lorem ipsum dolor sit amet, consectetur adipiscing elit.
- Lorem ipsum dolor sit amet, consectetur adipiscing elit.

### Lorem Ipsum Amet

1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
2. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
3. Lorem ipsum dolor sit amet, consectetur adipiscing elit.

### Lorem Ipsum Elit

- [x] Lorem ipsum dolor sit amet.
- [ ] Lorem ipsum dolor sit amet.
- [ ] Lorem ipsum dolor sit amet.

> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
>
> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

---

### Lorem Ipsum Table

| Lorem | Ipsum | Dolor |
| --- | --- | --- |
| Lorem ipsum | Dolor sit amet | Consectetur adipiscing |
| Sed do eiusmod | Tempor incididunt | Ut labore dolore |
| Magna aliqua | Lorem ipsum | Dolor sit amet |

### Lorem Ipsum Code

\`\`\`txt
Lorem ipsum dolor sit amet
Consectetur adipiscing elit
Sed do eiusmod tempor incididunt
Ut labore et dolore magna aliqua
\`\`\`

### Lorem Ipsum Inline

Lorem ipsum \`dolor sit amet\` consectetur **adipiscing elit** sed do *eiusmod tempor* incididunt ut labore et dolore magna aliqua.

### Lorem Ipsum Longform

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

#### Lorem Ipsum Quattuor

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

#### Lorem Ipsum Quinque

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Lorem Ipsum Finale

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
`

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

function parseWorkspaceModeMessage(data: unknown): WorkspaceModeMessage | null {
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

  const record = message as Record<string, unknown>
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

function postWorkspaceMode(mode: ViewMode) {
  window.chrome?.webview?.postMessage(
    JSON.stringify({
      type: WORKSPACE_MODE_MESSAGE_TYPE,
      mode,
    }),
  )
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN)
  const [isEditorScrolled, setIsEditorScrolled] = useState(false)
  const initialMarkdownRef = useRef(markdown)
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
      const message = parseWorkspaceModeMessage(event.data)

      if (message) {
        setViewMode(message.mode)
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

    const sub = editor.onDidChangeModelContent(() => {
      setMarkdown(editor.getValue())
    })
    const selectionSub = editor.onDidChangeCursorSelection(() => {
      syncPersistentCurrentLine()
    })
    const scrollSub = editor.onDidScrollChange((event) => {
      setIsEditorScrolled(event.scrollTop > 0)
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
      setIsEditorScrolled(false)
    }
  }, [])

  useEffect(() => {
    const editor = editorInstanceRef.current
    if (!editor) return

    const currentValue = editor.getValue()
    if (currentValue !== markdown) {
      editor.setValue(markdown)
    }
  }, [markdown])

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
    <main className="app-shell">
      <section className={`workspace ${viewMode}`}>
        <div
          className="editor-pane"
          data-scrolled={isEditorScrolled ? 'true' : 'false'}
          aria-label="Markdown Editor"
          aria-hidden={viewMode === 'preview'}
        >
          <PaneHeader
            leftLabel={EDITOR_FILE_LABEL}
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
