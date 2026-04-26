import { useEffect, useMemo, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import './App.css'
import PaneHeader from './PaneHeader'
import PreviewPane from './PreviewPane'

type ViewMode = 'editor' | 'split' | 'preview'

const EDITOR_FONT_FAMILY = "'JetBrains Mono', Consolas, 'Courier New', monospace"
const EDITOR_FONT_SIZE = 18
const EDITOR_FONT_LOAD_TARGET = `${EDITOR_FONT_SIZE}px 'JetBrains Mono'`
const EDITOR_FILE_LABEL = 'drafts/lorem_ipsum.md'
const EDITOR_SCROLL_SENSITIVITY = 1.5
const MIN_EDITOR_THUMB_HEIGHT = 56
const EDITOR_CURRENT_LINE_BACKGROUND = '#1B1B1B'
const EDITOR_CURRENT_LINE_DECORATION_CLASS = 'editor-current-line'

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
        className: EDITOR_CURRENT_LINE_DECORATION_CLASS,
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

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN)
  const [isEditorScrolled, setIsEditorScrolled] = useState(false)
  const editorHostRef = useRef<HTMLDivElement | null>(null)
  const editorScrollbarRef = useRef<HTMLDivElement | null>(null)
  const editorThumbRef = useRef<HTMLDivElement | null>(null)
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  )
  const editorDragOffsetRef = useRef(0)
  const isEditorDraggingRef = useRef(false)

  const showEditor = viewMode !== 'preview'
  const showPreview = viewMode !== 'editor'

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
    if (!showEditor || !editorHostRef.current) {
      editorInstanceRef.current?.dispose()
      editorInstanceRef.current = null
      setIsEditorScrolled(false)
      return
    }

    if (editorInstanceRef.current) {
      editorInstanceRef.current.updateOptions({
        padding: EDITOR_PADDING,
        lineHeight: 30,
        fontSize: EDITOR_FONT_SIZE,
        renderLineHighlight: 'gutter',
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        parameterHints: { enabled: false },
        wordBasedSuggestions: 'off',
        inlineSuggest: { enabled: false },
        snippetSuggestions: 'none',
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        cursorWidth: 4,
        cursorHeight: 20,
        mouseWheelScrollSensitivity: EDITOR_SCROLL_SENSITIVITY,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden',
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
        },
      })
      remeasureEditor(editorInstanceRef.current)
      window.requestAnimationFrame(() => {
        syncEditorScrollbarPosition()
      })
      return
    }

    monaco.editor.defineTheme('markdown-editor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#131313',
        'editor.lineHighlightBackground': EDITOR_CURRENT_LINE_BACKGROUND,
        'editor.lineHighlightBorder': '#00000000',
        'editor.wordHighlightBackground': '#3f3f4655',
        'editor.wordHighlightStrongBackground': '#3f3f4670',
        'editor.wordHighlightBorder': '#00000000',
        'editor.wordHighlightStrongBorder': '#00000000',
        'editor.selectionHighlightBackground': '#3f3f4655',
        'editor.selectionHighlightBorder': '#00000000',
        'editorOverviewRuler.border': '#00000000',
      },
    })

    const editor = monaco.editor.create(editorHostRef.current, {
      value: markdown,
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
      theme: 'markdown-editor-dark',
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
  }, [showEditor])

  useEffect(() => {
    const editor = editorInstanceRef.current
    if (!editor) return

    const currentValue = editor.getValue()
    if (currentValue !== markdown) {
      editor.setValue(markdown)
    }
  }, [markdown])

  const modeLabel = useMemo(() => {
    if (viewMode === 'editor') return 'Nur Editor'
    if (viewMode === 'preview') return 'Nur Preview'
    return 'Split 50/50'
  }, [viewMode])

  const previewWordCount = useMemo(() => {
    const words = markdown.match(/\S+/g)
    return words ? words.length : 0
  }, [markdown])

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div className="mode-buttons" role="group" aria-label="Ansichtsmodus">
          <button
            type="button"
            className={viewMode === 'editor' ? 'active' : ''}
            onClick={() => setViewMode('editor')}
          >
            Editor
          </button>
          <button
            type="button"
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
          <button
            type="button"
            className={viewMode === 'preview' ? 'active' : ''}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
        </div>
        <span className="mode-label">{modeLabel}</span>
      </header>

      <section className={`workspace ${viewMode}`}>
        {showEditor ? (
          <div
            className="editor-pane"
            data-scrolled={isEditorScrolled ? 'true' : 'false'}
            aria-label="Markdown Editor"
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
        ) : null}

        {showPreview ? (
          <PreviewPane
            markdown={markdown}
            headerLeft="Live Preview"
            headerRight={[`${previewWordCount} words`]}
          />
        ) : null}
      </section>
    </main>
  )
}

export default App
