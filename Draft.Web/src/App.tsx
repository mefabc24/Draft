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
type ShowWhitespaceCharacters = 'Always' | 'Never' | 'Highlighted Only'
type CursorStyle = 'Line' | 'Block' | 'Underline'
type PreviewScrollSyncMode = 'Off' | 'EditorToPreview' | 'PreviewToEditor' | 'TwoWay'
type DraftEditorSettings = {
  editorFontFamily: string
  editorFontSize: number
  lineHeight: number
  wordWrap: boolean
  showLineNumbers: boolean
  highlightCurrentLine: boolean
  showWhitespaceCharacters: ShowWhitespaceCharacters
  showIndentationGuides: boolean
  tabSize: number
  insertSpacesInsteadOfTabs: boolean
  autoPairBrackets: boolean
  autoPairQuotes: boolean
  markdownSyntaxHighlighting: boolean
  cursorStyle: CursorStyle
  cursorBlinking: boolean
  previewScrollSyncMode: PreviewScrollSyncMode
  scrollPreviewToEditedSection: boolean
}
type SettingsChangedMessage = {
  type: 'settingsChanged'
} & DraftEditorSettings

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

const EDITOR_SCROLL_SENSITIVITY = 1.5
const MIN_EDITOR_THUMB_HEIGHT = 56
const DEFAULT_FILE_NAME = 'untitled.md'
const WORKSPACE_MODE_MESSAGE_TYPE = 'workspaceModeChanged'
const LOAD_DOCUMENT_MESSAGE_TYPE = 'loadDocument'
const DOCUMENT_CHANGED_MESSAGE_TYPE = 'documentChanged'
const CURSOR_POSITION_CHANGED_MESSAGE_TYPE = 'cursorPositionChanged'
const SETTINGS_CHANGED_MESSAGE_TYPE = 'settingsChanged'

function stripMarkdownSyntax(content: string) {
  return content
    .replace(/^\s{0,3}(?:`{3,}|~{3,}).*$/gm, ' ')
    .replace(/^\s{0,3}\[[^\]]+\]:\s+\S+.*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+/gm, ' ')
    .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ')
    .replace(/^\s{0,3}(?:=+|-+)\s*$/gm, ' ')
    .replace(/\[[ xX]\]\s+/g, ' ')
    .replace(/<[^>\r\n]+>/g, ' ')
    .replace(/[`*_~|]/g, ' ')
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1')
}

function countMarkdownWords(content: string) {
  const words = stripMarkdownSyntax(content).match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)
  return words ? words.length : 0
}

const DEFAULT_EDITOR_SETTINGS: DraftEditorSettings = {
  editorFontFamily: 'JetBrains Mono',
  editorFontSize: 18,
  lineHeight: 1.6,
  wordWrap: true,
  showLineNumbers: true,
  highlightCurrentLine: true,
  showWhitespaceCharacters: 'Never',
  showIndentationGuides: false,
  tabSize: 4,
  insertSpacesInsteadOfTabs: true,
  autoPairBrackets: true,
  autoPairQuotes: true,
  markdownSyntaxHighlighting: true,
  cursorStyle: 'Line',
  cursorBlinking: true,
  previewScrollSyncMode: 'TwoWay',
  scrollPreviewToEditedSection: false,
}

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
  enabled: boolean,
) {
  if (!enabled) {
    decorations.set([])
    return
  }

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

function readRecordValue(record: Record<string, unknown>, camelName: string) {
  const pascalName = `${camelName[0]?.toUpperCase() ?? ''}${camelName.slice(1)}`
  return record[camelName] ?? record[pascalName]
}

function readString(
  record: Record<string, unknown>,
  name: string,
  fallback: string,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'string' && value.trim() ? value : fallback
}

function readNumber(
  record: Record<string, unknown>,
  name: string,
  fallback: number,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(
  record: Record<string, unknown>,
  name: string,
  fallback: boolean,
) {
  const value = readRecordValue(record, name)
  return typeof value === 'boolean' ? value : fallback
}

function readShowWhitespaceCharacters(
  record: Record<string, unknown>,
): ShowWhitespaceCharacters {
  const value = readRecordValue(record, 'showWhitespaceCharacters')

  if (value === 'Always' || value === 'Never' || value === 'Highlighted Only') {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.showWhitespaceCharacters
}

function readCursorStyle(record: Record<string, unknown>): CursorStyle {
  const value = readRecordValue(record, 'cursorStyle')

  if (value === 'Line' || value === 'Block' || value === 'Underline') {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.cursorStyle
}

function readPreviewScrollSyncMode(
  record: Record<string, unknown>,
): PreviewScrollSyncMode {
  const value = readRecordValue(record, 'previewScrollSyncMode')

  if (
    value === 'Off' ||
    value === 'EditorToPreview' ||
    value === 'PreviewToEditor' ||
    value === 'TwoWay'
  ) {
    return value
  }

  return DEFAULT_EDITOR_SETTINGS.previewScrollSyncMode
}

function parseSettingsChangedMessage(
  record: Record<string, unknown>,
): SettingsChangedMessage | null {
  const type = record.type ?? record.Type

  if (type !== SETTINGS_CHANGED_MESSAGE_TYPE) {
    return null
  }

  return {
    type: SETTINGS_CHANGED_MESSAGE_TYPE,
    editorFontFamily: readString(
      record,
      'editorFontFamily',
      DEFAULT_EDITOR_SETTINGS.editorFontFamily,
    ),
    editorFontSize: readNumber(
      record,
      'editorFontSize',
      DEFAULT_EDITOR_SETTINGS.editorFontSize,
    ),
    lineHeight: readNumber(
      record,
      'lineHeight',
      DEFAULT_EDITOR_SETTINGS.lineHeight,
    ),
    wordWrap: readBoolean(record, 'wordWrap', DEFAULT_EDITOR_SETTINGS.wordWrap),
    showLineNumbers: readBoolean(
      record,
      'showLineNumbers',
      DEFAULT_EDITOR_SETTINGS.showLineNumbers,
    ),
    highlightCurrentLine: readBoolean(
      record,
      'highlightCurrentLine',
      DEFAULT_EDITOR_SETTINGS.highlightCurrentLine,
    ),
    showWhitespaceCharacters: readShowWhitespaceCharacters(record),
    showIndentationGuides: readBoolean(
      record,
      'showIndentationGuides',
      DEFAULT_EDITOR_SETTINGS.showIndentationGuides,
    ),
    tabSize: readNumber(record, 'tabSize', DEFAULT_EDITOR_SETTINGS.tabSize),
    insertSpacesInsteadOfTabs: readBoolean(
      record,
      'insertSpacesInsteadOfTabs',
      DEFAULT_EDITOR_SETTINGS.insertSpacesInsteadOfTabs,
    ),
    autoPairBrackets: readBoolean(
      record,
      'autoPairBrackets',
      DEFAULT_EDITOR_SETTINGS.autoPairBrackets,
    ),
    autoPairQuotes: readBoolean(
      record,
      'autoPairQuotes',
      DEFAULT_EDITOR_SETTINGS.autoPairQuotes,
    ),
    markdownSyntaxHighlighting: readBoolean(
      record,
      'markdownSyntaxHighlighting',
      DEFAULT_EDITOR_SETTINGS.markdownSyntaxHighlighting,
    ),
    cursorStyle: readCursorStyle(record),
    cursorBlinking: readBoolean(
      record,
      'cursorBlinking',
      DEFAULT_EDITOR_SETTINGS.cursorBlinking,
    ),
    previewScrollSyncMode: readPreviewScrollSyncMode(record),
    scrollPreviewToEditedSection: readBoolean(
      record,
      'scrollPreviewToEditedSection',
      DEFAULT_EDITOR_SETTINGS.scrollPreviewToEditedSection,
    ),
  }
}

function getEditorFontFamilyCss(fontFamily: string) {
  switch (fontFamily) {
    case 'Cascadia Code':
      return "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace"
    case 'Cascadia Mono':
      return "'Cascadia Mono', 'JetBrains Mono', Consolas, 'Courier New', monospace"
    case 'Consolas':
      return "Consolas, 'JetBrains Mono', 'Courier New', monospace"
    case 'JetBrains Mono':
    default:
      return "'JetBrains Mono', Consolas, 'Courier New', monospace"
  }
}

function getEditorFontLoadTarget(settings: DraftEditorSettings) {
  return `${settings.editorFontSize}px ${getEditorFontFamilyCss(settings.editorFontFamily)}`
}

function getEditorLineHeightPixels(settings: DraftEditorSettings) {
  return Math.max(1, Math.round(settings.editorFontSize * settings.lineHeight))
}

function getRenderWhitespace(
  value: ShowWhitespaceCharacters,
): monaco.editor.IEditorOptions['renderWhitespace'] {
  switch (value) {
    case 'Always':
      return 'all'
    case 'Highlighted Only':
      return 'selection'
    case 'Never':
    default:
      return 'none'
  }
}

function getCursorStyle(
  value: CursorStyle,
): monaco.editor.IEditorOptions['cursorStyle'] {
  switch (value) {
    case 'Block':
      return 'block'
    case 'Underline':
      return 'underline'
    case 'Line':
    default:
      return 'line'
  }
}

function getEditorSettingsOptions(
  settings: DraftEditorSettings,
): monaco.editor.IEditorOptions {
  return {
    wordWrap: settings.wordWrap ? 'on' : 'off',
    fontSize: settings.editorFontSize,
    lineHeight: getEditorLineHeightPixels(settings),
    fontFamily: getEditorFontFamilyCss(settings.editorFontFamily),
    renderLineHighlight: settings.highlightCurrentLine ? 'gutter' : 'none',
    lineNumbers: settings.showLineNumbers ? 'on' : 'off',
    renderWhitespace: getRenderWhitespace(settings.showWhitespaceCharacters),
    guides: { indentation: settings.showIndentationGuides },
    autoClosingBrackets: settings.autoPairBrackets ? 'always' : 'never',
    autoClosingQuotes: settings.autoPairQuotes ? 'always' : 'never',
    cursorStyle: getCursorStyle(settings.cursorStyle),
    cursorBlinking: settings.cursorBlinking ? 'blink' : 'solid',
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

  window.chrome?.webview?.postMessage(
    JSON.stringify({
      type: CURSOR_POSITION_CHANGED_MESSAGE_TYPE,
      line: position?.lineNumber ?? 1,
      column: position?.column ?? 1,
      selectedCharacterCount: getSelectedCharacterCount(editor),
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
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  )
  const currentLineDecorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const draftEditorSettingsRef = useRef<DraftEditorSettings>(DEFAULT_EDITOR_SETTINGS)
  const editorDragOffsetRef = useRef(0)
  const isEditorDraggingRef = useRef(false)
  const viewModeRef = useRef<ViewMode>(viewMode)
  const scrollSyncSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollSyncReleaseTimeoutRef = useRef(0)

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

  const releaseScrollSyncSource = (source: 'editor' | 'preview') => {
    if (scrollSyncReleaseTimeoutRef.current !== 0) {
      window.clearTimeout(scrollSyncReleaseTimeoutRef.current)
    }

    scrollSyncReleaseTimeoutRef.current = window.setTimeout(() => {
      if (scrollSyncSourceRef.current === source) {
        scrollSyncSourceRef.current = null
      }

      scrollSyncReleaseTimeoutRef.current = 0
    }, 0)
  }

  const isScrollSyncActive = () => {
    return (
      viewModeRef.current === 'split' &&
      draftEditorSettingsRef.current.previewScrollSyncMode !== 'Off'
    )
  }

  const canSyncPreviewFromEditor = () => {
    const mode = draftEditorSettingsRef.current.previewScrollSyncMode

    return mode === 'EditorToPreview' || mode === 'TwoWay'
  }

  const canSyncEditorFromPreview = () => {
    const mode = draftEditorSettingsRef.current.previewScrollSyncMode

    return mode === 'PreviewToEditor' || mode === 'TwoWay'
  }

  const syncPreviewScrollFromEditor = () => {
    if (
      !isScrollSyncActive() ||
      !canSyncPreviewFromEditor() ||
      scrollSyncSourceRef.current === 'preview'
    ) {
      return
    }

    const editor = editorInstanceRef.current
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
  }

  const syncEditorScrollFromPreview = () => {
    if (
      !isScrollSyncActive() ||
      !canSyncEditorFromPreview() ||
      scrollSyncSourceRef.current === 'editor'
    ) {
      return
    }

    const editor = editorInstanceRef.current
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
  }

  const handlePreviewScroll = () => {
    syncEditorScrollFromPreview()
  }

  const applyDraftEditorSettings = (settings: DraftEditorSettings) => {
    draftEditorSettingsRef.current = settings

    const editor = editorInstanceRef.current

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

    // TODO: Map Monaco cursor/source positions to rendered Markdown blocks before
    // enabling scrollPreviewToEditedSection beyond persisted settings state.
    remeasureEditor(editor)
    syncEditorScrollbarPosition()
    syncPreviewScrollFromEditor()
    void document.fonts.load(getEditorFontLoadTarget(settings)).then(() => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      syncEditorScrollbarPosition()
    })
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
    viewModeRef.current = viewMode
  }, [viewMode])

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

      const settingsMessage = parseSettingsChangedMessage(record)

      if (settingsMessage) {
        applyDraftEditorSettings(settingsMessage)
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
    window.requestAnimationFrame(() => {
      syncPreviewScrollFromEditor()
    })
  }, [markdown])

  useEffect(() => {
    if (!editorHostRef.current) {
      return
    }

    registerDraftTheme()
    monaco.editor.setTheme(DRAFT_THEME_NAME)

    const currentEditorSettings = draftEditorSettingsRef.current
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
      theme: DRAFT_THEME_NAME,
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
        draftEditorSettingsRef.current.highlightCurrentLine,
      )
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
      postCursorPositionChanged(editor)
    })
    const scrollSub = editor.onDidScrollChange(() => {
      syncEditorScrollbarPosition()
      syncPreviewScrollFromEditor()
    })
    const layoutSub = editor.onDidLayoutChange(() => {
      syncEditorScrollbarPosition()
    })
    const contentSizeSub = editor.onDidContentSizeChange(() => {
      syncEditorScrollbarPosition()
      syncPreviewScrollFromEditor()
    })

    editorInstanceRef.current = editor
    postCursorPositionChanged(editor)

    const syncEditorFontMetrics = () => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
    }

    syncEditorFontMetrics()
    syncEditorScrollbarPosition()
    void document.fonts
      .load(getEditorFontLoadTarget(draftEditorSettingsRef.current))
      .then(syncEditorFontMetrics)
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
      if (scrollSyncReleaseTimeoutRef.current !== 0) {
        window.clearTimeout(scrollSyncReleaseTimeoutRef.current)
        scrollSyncReleaseTimeoutRef.current = 0
      }
      contentSizeSub.dispose()
      layoutSub.dispose()
      scrollSub.dispose()
      selectionSub.dispose()
      sub.dispose()
      editor.dispose()
      editorInstanceRef.current = null
      currentLineDecorationsRef.current = null
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
      syncPreviewScrollFromEditor()
    })

    const timeoutId = window.setTimeout(() => {
      if (editorInstanceRef.current !== editor) {
        return
      }

      remeasureEditor(editor)
      syncEditorScrollbarPosition()
      syncPreviewScrollFromEditor()
    }, 240)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [viewMode])

  const previewWordCount = useMemo(() => {
    return countMarkdownWords(markdown)
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
          previewScrollElementRef={previewScrollRef}
          onPreviewScroll={handlePreviewScroll}
        />
      </section>
    </main>
  )
}

export default App
