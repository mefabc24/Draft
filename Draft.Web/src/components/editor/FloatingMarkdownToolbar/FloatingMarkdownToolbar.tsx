import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import ToolbarButton from './ToolbarButton'
import ToolbarDropdown, {
  type ToolbarDropdownMenuEntry,
} from './ToolbarDropdown'
import ToolbarTooltip, {
  type ToolbarTooltipContent,
  type ToolbarTooltipPlacement,
} from './ToolbarTooltip'
import './FloatingMarkdownToolbar.css'

type HeadingValue =
  | 'normal'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'blockquote'
  | 'codeblock'

type ListValue = 'none' | 'bullet' | 'numbered' | 'checklist'
type DropdownId = 'heading' | 'list'
type InlineFormat = 'bold' | 'italic' | 'strikethrough' | 'code' | 'link'
type ViewMode = 'editor' | 'split' | 'preview'
type FloatingMarkdownToolbarMode =
  | 'Disabled'
  | 'Editor'
  | 'Preview'
  | 'EditorAndPreview'
type ToolbarSelectionSource = 'editor' | 'preview'
type ToolbarIconName =
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'code'
  | 'codeBlock'
  | 'italic'
  | 'link'
  | 'noneList'
  | 'numberedList'
  | 'strikethrough'
  | 'taskList'

type ActiveFormats = Record<InlineFormat, boolean>
type ToolbarPosition = {
  left: number
  top: number
}
type VisibleSelectionPosition = {
  height: number
  left: number
  top: number
}

type FloatingMarkdownToolbarProps = {
  editor: monaco.editor.IStandaloneCodeEditor | null
  editorBodyRef: RefObject<HTMLDivElement | null>
  onRequestEditorMode: () => void
  previewContentRef: RefObject<HTMLDivElement | null>
  previewScrollElementRef: RefObject<HTMLDivElement | null>
  toolbarMode: FloatingMarkdownToolbarMode
  viewMode: ViewMode
  workspaceRef: RefObject<HTMLElement | null>
}
type InlineWrapperContext = {
  closeEndOffset: number
  closeStartOffset: number
  openEndOffset: number
  openStartOffset: number
}
type FencedCodeBlockContext =
  | {
      insideCodeBlock: false
    }
  | {
      insideCodeBlock: true
      isMarkdownCodeBlock: boolean
      language: string
    }
type SelectionOffsetRange = {
  endOffset: number
  startOffset: number
}
type PreviewSelectionSnapshot = {
  anchorRect: DOMRect
  endOffset: number
  selection: monaco.Selection
  sourceKey: string
  startOffset: number
}
type MarkdownCommandOptions = {
  focusEditor?: boolean
}
type ToolbarTooltipPosition = {
  arrowLeft: number
  left: number
  placement: ToolbarTooltipPlacement
  top: number
}
type ActiveToolbarTooltip = ToolbarTooltipContent &
  ToolbarTooltipPosition & {
    visible: boolean
  }

const TOOLBAR_EDGE_PADDING = 8
const TOOLBAR_SELECTION_OFFSET = 10
const TOOLBAR_ESTIMATED_WIDTH = 540
const TOOLBAR_ESTIMATED_HEIGHT = 52
const TOOLBAR_TOOLTIP_EDGE_PADDING = 8
const TOOLBAR_TOOLTIP_GAP = 18
const MARKDOWN_FENCE_LANGUAGES = new Set(['md', 'markdown', 'mdown', 'mkd'])

const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  link: false,
}

const headingLabels: Record<HeadingValue, string> = {
  normal: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  blockquote: 'Blockquote',
  codeblock: 'Code Block',
}

const toolbarIconPaths: Record<ToolbarIconName, string> = {
  blockquote: 'icons/Blockquote.svg',
  bold: 'icons/Bold.svg',
  bulletList: 'icons/BulletList.svg',
  code: 'icons/Code.svg',
  codeBlock: 'icons/Code%20Block.svg',
  italic: 'icons/Italic.svg',
  link: 'icons/Link.svg',
  noneList: 'icons/NoList.svg',
  numberedList: 'icons/NumberedList.svg',
  strikethrough: 'icons/Strikethrough.svg',
  taskList: 'icons/Tasklist.svg',
}

function getToolbarIconSrc(name: ToolbarIconName) {
  return `${import.meta.env.BASE_URL}${toolbarIconPaths[name]}`
}

const headingItems: ToolbarDropdownMenuEntry[] = [
  { value: 'normal', label: 'Normal', shortcut: 'CTRL+N' },
  { value: 'h1', label: 'Heading 1', shortcut: 'CTRL+1' },
  { value: 'h2', label: 'Heading 2', shortcut: 'CTRL+2' },
  { value: 'h3', label: 'Heading 3', shortcut: 'CTRL+3' },
  { id: 'heading-divider-h3', type: 'divider' },
  { value: 'h4', label: 'Heading 4', shortcut: 'CTRL+4' },
  { value: 'h5', label: 'Heading 5', shortcut: 'CTRL+5' },
  { value: 'h6', label: 'Heading 6', shortcut: 'CTRL+6' },
  { id: 'heading-divider-h6', type: 'divider' },
  {
    value: 'blockquote',
    label: 'Blockquote',
    icon: <ToolbarAssetIcon name="blockquote" />,
  },
  {
    value: 'codeblock',
    label: 'Code Block',
    icon: <ToolbarAssetIcon name="codeBlock" />,
  },
]

const listLabels: Record<ListValue, string> = {
  none: 'None',
  bullet: 'Bullet List',
  numbered: 'Numbered List',
  checklist: 'Checklist',
}

const listIcons: Record<ListValue, ToolbarIconName> = {
  none: 'noneList',
  bullet: 'bulletList',
  numbered: 'numberedList',
  checklist: 'taskList',
}

const headingShortcuts: Partial<Record<HeadingValue, string>> = {
  normal: 'CTRL + N',
  h1: 'CTRL + 1',
  h2: 'CTRL + 2',
  h3: 'CTRL + 3',
  h4: 'CTRL + 4',
  h5: 'CTRL + 5',
  h6: 'CTRL + 6',
}

const inlineTooltips: Record<InlineFormat, ToolbarTooltipContent> = {
  bold: { label: 'Bold', shortcut: 'CTRL + B' },
  italic: { label: 'Italic', shortcut: 'CTRL + I' },
  strikethrough: {
    label: 'Strikethrough',
    shortcut: 'CTRL + SHIFT + X',
  },
  code: { label: 'Inline Code', shortcut: 'CTRL + E' },
  link: { label: 'Link', shortcut: 'CTRL + K' },
}

const listItems: ToolbarDropdownMenuEntry[] = [
  { value: 'none', label: 'None', icon: <ToolbarAssetIcon name="noneList" /> },
  {
    value: 'bullet',
    label: 'Bullet List',
    icon: <ToolbarAssetIcon name="bulletList" />,
  },
  {
    value: 'numbered',
    label: 'Numbered List',
    icon: <ToolbarAssetIcon name="numberedList" />,
  },
  {
    value: 'checklist',
    label: 'Checklist',
    icon: <ToolbarAssetIcon name="taskList" />,
  },
]

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

function getPrimarySelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections = editor.getSelections(),
) {
  return selections?.find((selection) => !isEmptySelection(selection)) ?? null
}

function cloneSelection(selection: monaco.Selection) {
  return new monaco.Selection(
    selection.selectionStartLineNumber,
    selection.selectionStartColumn,
    selection.positionLineNumber,
    selection.positionColumn,
  )
}

function cloneSelections(selections: monaco.Selection[]) {
  return selections.map(cloneSelection)
}

function getNonEmptySelections(editor: monaco.editor.IStandaloneCodeEditor) {
  return editor.getSelections()?.filter((selection) => !isEmptySelection(selection)) ?? []
}

function getSelectionKey(selections: monaco.Selection[]) {
  return selections
    .map(
      (selection) =>
        `${selection.selectionStartLineNumber}:${selection.selectionStartColumn}:${selection.positionLineNumber}:${selection.positionColumn}`,
    )
    .join('|')
}

function createSelectionFromOffsets(
  model: monaco.editor.ITextModel,
  startOffset: number,
  endOffset: number,
) {
  const start = model.getPositionAt(Math.max(0, startOffset))
  const end = model.getPositionAt(Math.max(0, endOffset))

  return new monaco.Selection(
    start.lineNumber,
    start.column,
    end.lineNumber,
    end.column,
  )
}

function createRangeFromOffsets(
  model: monaco.editor.ITextModel,
  startOffset: number,
  endOffset: number,
) {
  const start = model.getPositionAt(Math.max(0, startOffset))
  const end = model.getPositionAt(Math.max(0, endOffset))

  return new monaco.Range(
    start.lineNumber,
    start.column,
    end.lineNumber,
    end.column,
  )
}

function getSelectionOffsets(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
) {
  return {
    endOffset: model.getOffsetAt(selection.getEndPosition()),
    startOffset: model.getOffsetAt(selection.getStartPosition()),
  }
}

function getSourceSpanOffset(
  element: HTMLElement,
  boundary: 'end' | 'start',
) {
  const value =
    boundary === 'start'
      ? Number(element.dataset.sourceStart)
      : Number(element.dataset.sourceEnd)

  return Number.isFinite(value) ? value : null
}

function isInsidePreviewCodeElement(
  node: Node,
  previewContentElement: HTMLDivElement,
) {
  const element =
    node instanceof Element ? node : node.parentElement
  const codeElement = element?.closest('pre')

  return !!codeElement && previewContentElement.contains(codeElement)
}

function findClosestSourceSpan(
  node: Node,
  previewContentElement: HTMLDivElement,
) {
  const element =
    node instanceof Element ? node : node.parentElement
  const sourceSpan = element?.closest<HTMLElement>(
    '[data-source-start][data-source-end]',
  )

  return sourceSpan && previewContentElement.contains(sourceSpan)
    ? sourceSpan
    : null
}

function findFirstSourceSpan(node: Node | null): HTMLElement | null {
  if (!node) {
    return null
  }

  if (
    node instanceof HTMLElement &&
    node.matches('[data-source-start][data-source-end]')
  ) {
    return node
  }

  if (node instanceof Element || node instanceof DocumentFragment) {
    return node.querySelector<HTMLElement>(
      '[data-source-start][data-source-end]',
    )
  }

  return findClosestSourceSpanFromTextNode(node)
}

function findLastSourceSpan(node: Node | null): HTMLElement | null {
  if (!node) {
    return null
  }

  if (
    node instanceof HTMLElement &&
    node.matches('[data-source-start][data-source-end]')
  ) {
    return node
  }

  if (node instanceof Element || node instanceof DocumentFragment) {
    const sourceSpans = node.querySelectorAll<HTMLElement>(
      '[data-source-start][data-source-end]',
    )

    return sourceSpans[sourceSpans.length - 1] ?? null
  }

  return findClosestSourceSpanFromTextNode(node)
}

function findClosestSourceSpanFromTextNode(node: Node) {
  return node.parentElement?.closest<HTMLElement>(
    '[data-source-start][data-source-end]',
  ) ?? null
}

function getPreviewBoundarySourceOffset(
  container: Node,
  offset: number,
  previewContentElement: HTMLDivElement,
  boundary: 'end' | 'start',
) {
  if (isInsidePreviewCodeElement(container, previewContentElement)) {
    return null
  }

  if (container.nodeType === Node.TEXT_NODE) {
    const sourceSpan = findClosestSourceSpan(container, previewContentElement)
    const sourceStart = sourceSpan
      ? getSourceSpanOffset(sourceSpan, 'start')
      : null
    const textLength = container.textContent?.length ?? 0

    return sourceStart === null
      ? null
      : sourceStart + clamp(offset, 0, textLength)
  }

  if (!(container instanceof Element || container instanceof DocumentFragment)) {
    return null
  }

  const childNodes = container.childNodes
  const previousNode = offset > 0 ? childNodes[offset - 1] : null
  const nextNode = childNodes[offset] ?? null
  const primarySpan =
    boundary === 'start'
      ? findFirstSourceSpan(nextNode)
      : findLastSourceSpan(previousNode)
  const primaryOffset = primarySpan
    ? getSourceSpanOffset(primarySpan, boundary)
    : null

  if (primaryOffset !== null) {
    return primaryOffset
  }

  const fallbackSpan =
    boundary === 'start'
      ? findLastSourceSpan(previousNode)
      : findFirstSourceSpan(nextNode)

  return fallbackSpan
    ? getSourceSpanOffset(fallbackSpan, boundary === 'start' ? 'end' : 'start')
    : null
}

function getPreviewSelectionRect(range: Range) {
  const rects = Array.from(range.getClientRects())
  const visibleRect = rects.find(
    (rect) => rect.width > 0 && rect.height > 0,
  )
  const rect = visibleRect ?? range.getBoundingClientRect()

  return rect.width > 0 && rect.height > 0 ? rect : null
}

function getPreviewSelectionSnapshot(
  model: monaco.editor.ITextModel,
  previewContentElement: HTMLDivElement,
  viewMode: ViewMode,
): PreviewSelectionSnapshot | null {
  if (viewMode === 'editor') {
    return null
  }

  const domSelection = window.getSelection()

  if (!domSelection || domSelection.rangeCount !== 1 || domSelection.isCollapsed) {
    return null
  }

  const range = domSelection.getRangeAt(0)

  if (
    !previewContentElement.contains(range.startContainer) ||
    !previewContentElement.contains(range.endContainer) ||
    isInsidePreviewCodeElement(range.commonAncestorContainer, previewContentElement)
  ) {
    return null
  }

  const startOffset = getPreviewBoundarySourceOffset(
    range.startContainer,
    range.startOffset,
    previewContentElement,
    'start',
  )
  const endOffset = getPreviewBoundarySourceOffset(
    range.endContainer,
    range.endOffset,
    previewContentElement,
    'end',
  )
  const anchorRect = getPreviewSelectionRect(range)

  if (
    startOffset === null ||
    endOffset === null ||
    startOffset >= endOffset ||
    !anchorRect
  ) {
    return null
  }

  const selection = createSelectionFromOffsets(model, startOffset, endOffset)

  if (!isSelectionAllowedForToolbar(model, selection)) {
    return null
  }

  return {
    anchorRect,
    endOffset,
    selection,
    sourceKey: `preview:${startOffset}:${endOffset}`,
    startOffset,
  }
}

function findPreviewSourceSpanForOffset(
  previewContentElement: HTMLDivElement,
  sourceOffset: number,
  boundary: 'end' | 'start',
) {
  const spans = previewContentElement.querySelectorAll<HTMLElement>(
    '[data-source-start][data-source-end]',
  )

  for (const span of spans) {
    const sourceStart = getSourceSpanOffset(span, 'start')
    const sourceEnd = getSourceSpanOffset(span, 'end')

    if (sourceStart === null || sourceEnd === null) {
      continue
    }

    const isMatch =
      boundary === 'start'
        ? sourceOffset >= sourceStart && sourceOffset < sourceEnd
        : sourceOffset > sourceStart && sourceOffset <= sourceEnd

    if (isMatch) {
      return span
    }
  }

  return null
}

function setPreviewDomSelectionFromOffsets(
  previewContentElement: HTMLDivElement,
  startOffset: number,
  endOffset: number,
) {
  const startSpan = findPreviewSourceSpanForOffset(
    previewContentElement,
    startOffset,
    'start',
  )
  const endSpan = findPreviewSourceSpanForOffset(
    previewContentElement,
    endOffset,
    'end',
  )
  const startNode = startSpan?.firstChild
  const endNode = endSpan?.firstChild

  if (
    !startSpan ||
    !endSpan ||
    !startNode ||
    !endNode ||
    startNode.nodeType !== Node.TEXT_NODE ||
    endNode.nodeType !== Node.TEXT_NODE
  ) {
    return false
  }

  const startSourceOffset = getSourceSpanOffset(startSpan, 'start')
  const endSourceOffset = getSourceSpanOffset(endSpan, 'start')

  if (startSourceOffset === null || endSourceOffset === null) {
    return false
  }

  const range = document.createRange()
  range.setStart(
    startNode,
    clamp(startOffset - startSourceOffset, 0, startNode.textContent?.length ?? 0),
  )
  range.setEnd(
    endNode,
    clamp(endOffset - endSourceOffset, 0, endNode.textContent?.length ?? 0),
  )

  const domSelection = window.getSelection()

  if (!domSelection) {
    return false
  }

  domSelection.removeAllRanges()
  domSelection.addRange(range)
  return true
}

function getFencedCodeBlockContext(
  model: monaco.editor.ITextModel,
  lineNumber: number,
): FencedCodeBlockContext {
  let insideCodeBlock = false
  let fenceCharacter = ''
  let fenceLength = 0
  let language = ''

  for (let index = 1; index <= lineNumber; index += 1) {
    const line = model.getLineContent(index)
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)?.*$/u)

    if (!fenceMatch) {
      continue
    }

    const fence = fenceMatch[1]
    const nextFenceCharacter = fence[0]

    if (!insideCodeBlock) {
      insideCodeBlock = true
      fenceCharacter = nextFenceCharacter
      fenceLength = fence.length
      language = (fenceMatch[2] ?? '').toLowerCase()
      continue
    }

    if (
      nextFenceCharacter === fenceCharacter &&
      fence.length >= fenceLength
    ) {
      insideCodeBlock = false
      fenceCharacter = ''
      fenceLength = 0
      language = ''
    }
  }

  if (!insideCodeBlock) {
    return { insideCodeBlock: false }
  }

  return {
    insideCodeBlock: true,
    isMarkdownCodeBlock: MARKDOWN_FENCE_LANGUAGES.has(language),
    language,
  }
}

function isSelectionAllowedForToolbar(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
) {
  const startLineNumber = selection.getStartPosition().lineNumber
  const endLineNumber = selection.getEndPosition().lineNumber

  for (
    let lineNumber = startLineNumber;
    lineNumber <= endLineNumber && lineNumber <= model.getLineCount();
    lineNumber += 1
  ) {
    const context = getFencedCodeBlockContext(model, lineNumber)

    if (context.insideCodeBlock && !context.isMarkdownCodeBlock) {
      return false
    }
  }

  return true
}

function isSelectionValidForModel(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
) {
  const start = selection.getStartPosition()
  const end = selection.getEndPosition()
  const lineCount = model.getLineCount()

  return (
    start.lineNumber >= 1 &&
    end.lineNumber >= 1 &&
    start.lineNumber <= lineCount &&
    end.lineNumber <= lineCount &&
    start.column >= 1 &&
    end.column >= 1 &&
    start.column <= model.getLineMaxColumn(start.lineNumber) &&
    end.column <= model.getLineMaxColumn(end.lineNumber)
  )
}

function getSelectedLineNumbers(
  model: monaco.editor.ITextModel,
  selections: monaco.Selection[],
) {
  const lineNumbers = new Set<number>()

  for (const selection of selections) {
    const start = selection.getStartPosition()
    const end = selection.getEndPosition()
    const lastLine =
      end.column === 1 && end.lineNumber > start.lineNumber
        ? end.lineNumber - 1
        : end.lineNumber

    for (
      let lineNumber = start.lineNumber;
      lineNumber <= lastLine && lineNumber <= model.getLineCount();
      lineNumber += 1
    ) {
      lineNumbers.add(lineNumber)
    }
  }

  return [...lineNumbers].sort((a, b) => a - b)
}

function executeEditorEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: monaco.editor.IIdentifiedSingleEditOperation[],
  nextSelectionOffsets?: SelectionOffsetRange[],
  options: MarkdownCommandOptions = {},
) {
  if (edits.length === 0) {
    return
  }

  editor.executeEdits('floating-markdown-toolbar', edits)
  if (nextSelectionOffsets && nextSelectionOffsets.length > 0) {
    const model = editor.getModel()

    if (model) {
      editor.setSelections(
        nextSelectionOffsets.map(({ endOffset, startOffset }) =>
          createSelectionFromOffsets(model, startOffset, endOffset),
        ),
      )
    }
  }
  if (options.focusEditor ?? true) {
    editor.focus()
  }
}

function replaceSelectedLines(
  editor: monaco.editor.IStandaloneCodeEditor,
  transformLine: (line: string, index: number) => string,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return
  }

  const lineNumbers = getSelectedLineNumbers(model, selections)
  const edits = lineNumbers.flatMap((lineNumber, index) => {
    const line = model.getLineContent(lineNumber)
    const nextLine = transformLine(line, index)

    if (nextLine === line) {
      return []
    }

    return [
      {
        range: new monaco.Range(
          lineNumber,
          1,
          lineNumber,
          model.getLineMaxColumn(lineNumber),
        ),
        text: nextLine,
        forceMoveMarkers: true,
      },
    ]
  })

  executeEditorEdits(editor, edits, undefined, options)
}

function removeHeadingPrefix(line: string) {
  return line.replace(/^(\s{0,3})#{1,6}\s*/u, '$1')
}

function removeBlockquotePrefix(line: string) {
  return line.replace(/^(\s{0,3})>\s?/u, '$1')
}

function removeListPrefix(line: string) {
  return line.replace(
    /^(\s*)(?:(?:[-+*])\s+\[[ xX]\]\s+|(?:[-+*])\s+|\d+[.)]\s+)/u,
    '$1',
  )
}

function addHeadingPrefix(line: string, level: number) {
  const normalizedLine = removeHeadingPrefix(line)
  const match = normalizedLine.match(/^(\s{0,3})(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}${'#'.repeat(level)} ${content}`
}

function addBlockquotePrefix(line: string) {
  const normalizedLine = removeBlockquotePrefix(line)
  const match = normalizedLine.match(/^(\s*)(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}> ${content}`
}

function addListPrefix(line: string, prefix: string) {
  const normalizedLine = removeListPrefix(line)
  const match = normalizedLine.match(/^(\s*)(.*)$/u)
  const indentation = match?.[1] ?? ''
  const content = match?.[2] ?? normalizedLine

  return `${indentation}${prefix}${content}`
}

function applyHeadingStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  value: HeadingValue,
  options?: MarkdownCommandOptions,
) {
  if (value === 'codeblock') {
    toggleCodeBlock(editor, options)
    return
  }

  if (value === 'blockquote') {
    replaceSelectedLines(editor, addBlockquotePrefix, options)
    return
  }

  if (value === 'normal') {
    replaceSelectedLines(editor, (line) =>
      removeBlockquotePrefix(removeHeadingPrefix(line)),
      options,
    )
    return
  }

  const level = Number(value.replace('h', ''))
  replaceSelectedLines(editor, (line) => addHeadingPrefix(line, level), options)
}

function applyListStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  value: ListValue,
  options?: MarkdownCommandOptions,
) {
  switch (value) {
    case 'bullet':
      replaceSelectedLines(editor, (line) => addListPrefix(line, '- '), options)
      return
    case 'numbered':
      replaceSelectedLines(editor, (line, index) =>
        addListPrefix(line, `${index + 1}. `),
        options,
      )
      return
    case 'checklist':
      replaceSelectedLines(
        editor,
        (line) => addListPrefix(line, '- [ ] '),
        options,
      )
      return
    case 'none':
    default:
      replaceSelectedLines(editor, removeListPrefix, options)
  }
}

function getInlineWrapperContext(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
  prefix: string,
  suffix = prefix,
): InlineWrapperContext | null {
  const value = model.getValue()
  let { endOffset, startOffset } = getSelectionOffsets(model, selection)
  const wrappers = [
    { prefix: '`', suffix: '`' },
    { prefix: '**', suffix: '**' },
    { prefix: '~~', suffix: '~~' },
    { prefix: '*', suffix: '*' },
  ]
  const seenFormats = new Set<string>()

  while (startOffset >= 0 && endOffset <= value.length) {
    let expanded = false

    for (const wrapper of wrappers) {
      const openStartOffset = startOffset - wrapper.prefix.length
      const closeEndOffset = endOffset + wrapper.suffix.length

      if (
        seenFormats.has(`${wrapper.prefix}:${wrapper.suffix}`) ||
        openStartOffset < 0 ||
        closeEndOffset > value.length
      ) {
        continue
      }

      const hasWrapper =
        value.slice(openStartOffset, startOffset) === wrapper.prefix &&
        value.slice(endOffset, closeEndOffset) === wrapper.suffix

      if (!hasWrapper) {
        continue
      }

      if (wrapper.prefix === prefix && wrapper.suffix === suffix) {
        return {
          closeEndOffset,
          closeStartOffset: endOffset,
          openEndOffset: startOffset,
          openStartOffset,
        }
      }

      seenFormats.add(`${wrapper.prefix}:${wrapper.suffix}`)
      startOffset = openStartOffset
      endOffset = closeEndOffset
      expanded = true
      break
    }

    if (!expanded) {
      return null
    }
  }

  return null
}

function isSelectedTextWrapped(
  selectedText: string,
  prefix: string,
  suffix = prefix,
) {
  if (
    !selectedText.startsWith(prefix) ||
    !selectedText.endsWith(suffix) ||
    selectedText.length <= prefix.length + suffix.length
  ) {
    return false
  }

  return (
    prefix !== '*' ||
    (!selectedText.startsWith('**') && !selectedText.endsWith('**'))
  )
}

function toggleWrappedSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  prefix: string,
  suffix = prefix,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections) {
    return
  }

  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  const nextSelectionOffsets: SelectionOffsetRange[] = []

  for (const selection of selections) {
    if (isEmptySelection(selection)) {
      continue
    }

    const { endOffset, startOffset } = getSelectionOffsets(model, selection)
    const selectedText = model.getValueInRange(selection)
    const hasSelectedWrapper = isSelectedTextWrapped(
      selectedText,
      prefix,
      suffix,
    )

    if (hasSelectedWrapper) {
      const text = selectedText.slice(
        prefix.length,
        selectedText.length - suffix.length,
      )

      edits.push({ range: selection, text, forceMoveMarkers: true })
      nextSelectionOffsets.push({
        endOffset: startOffset + text.length,
        startOffset,
      })
      continue
    }

    const wrapperContext = getInlineWrapperContext(
      model,
      selection,
      prefix,
      suffix,
    )

    if (wrapperContext) {
      edits.push(
        {
          range: createRangeFromOffsets(
            model,
            wrapperContext.closeStartOffset,
            wrapperContext.closeEndOffset,
          ),
          text: '',
          forceMoveMarkers: true,
        },
        {
          range: createRangeFromOffsets(
            model,
            wrapperContext.openStartOffset,
            wrapperContext.openEndOffset,
          ),
          text: '',
          forceMoveMarkers: true,
        },
      )
      nextSelectionOffsets.push({
        endOffset: endOffset - prefix.length,
        startOffset: startOffset - prefix.length,
      })
      continue
    }

    edits.push(
      {
        range: createRangeFromOffsets(model, endOffset, endOffset),
        text: suffix,
        forceMoveMarkers: true,
      },
      {
        range: createRangeFromOffsets(model, startOffset, startOffset),
        text: prefix,
        forceMoveMarkers: true,
      },
    )
    nextSelectionOffsets.push({
      endOffset: endOffset + prefix.length,
      startOffset: startOffset + prefix.length,
    })
  }

  executeEditorEdits(editor, edits, nextSelectionOffsets, options)
}

function toggleLinkSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections) {
    return
  }

  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  const nextSelectionOffsets: SelectionOffsetRange[] = []
  const value = model.getValue()

  for (const selection of selections) {
    if (isEmptySelection(selection)) {
      continue
    }

    const { endOffset, startOffset } = getSelectionOffsets(model, selection)
    const selectedText = model.getValueInRange(selection)
    const linkMatch = selectedText.match(/^\[([\s\S]+)\]\([^)]+\)$/u)

    if (linkMatch) {
      const text = linkMatch[1]

      edits.push({ range: selection, text, forceMoveMarkers: true })
      nextSelectionOffsets.push({
        endOffset: startOffset + text.length,
        startOffset,
      })
      continue
    }

    const linkCloseStartOffset = endOffset
    const linkClosePrefix = value.slice(endOffset, endOffset + 2)
    const linkEndOffset =
      linkClosePrefix === '](' ? value.indexOf(')', endOffset + 2) : -1
    const isSelectedLinkLabel =
      startOffset > 0 &&
      value[startOffset - 1] === '[' &&
      linkEndOffset !== -1

    if (isSelectedLinkLabel) {
      edits.push(
        {
          range: createRangeFromOffsets(
            model,
            linkCloseStartOffset,
            linkEndOffset + 1,
          ),
          text: '',
          forceMoveMarkers: true,
        },
        {
          range: createRangeFromOffsets(model, startOffset - 1, startOffset),
          text: '',
          forceMoveMarkers: true,
        },
      )
      nextSelectionOffsets.push({
        endOffset: endOffset - 1,
        startOffset: startOffset - 1,
      })
      continue
    }

    edits.push(
      {
        range: createRangeFromOffsets(model, endOffset, endOffset),
        text: ']()',
        forceMoveMarkers: true,
      },
      {
        range: createRangeFromOffsets(model, startOffset, startOffset),
        text: '[',
        forceMoveMarkers: true,
      },
    )
    nextSelectionOffsets.push({
      endOffset: endOffset + 3,
      startOffset: endOffset + 3,
    })
  }

  executeEditorEdits(editor, edits, nextSelectionOffsets, options)
}

function toggleCodeBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections) {
    return
  }

  const edits = selections.flatMap((selection) => {
    if (isEmptySelection(selection)) {
      return []
    }

    const selectedText = model.getValueInRange(selection)
    const trimmedText = selectedText.trim()
    const isCodeBlock =
      trimmedText.startsWith('```') && trimmedText.endsWith('```')
    const text = isCodeBlock
      ? trimmedText.replace(/^```\s*\n?/u, '').replace(/\n?```\s*$/u, '')
      : `\`\`\`\n${selectedText}\n\`\`\``

    return [{ range: selection, text, forceMoveMarkers: true }]
  })

  executeEditorEdits(editor, edits, undefined, options)
}

function detectInlineFormats(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
) {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return EMPTY_ACTIVE_FORMATS
  }

  const selectedText = model.getValueInRange(selection)
  const { endOffset, startOffset } = getSelectionOffsets(model, selection)
  const value = model.getValue()
  const linkClosePrefix = value.slice(endOffset, endOffset + 2)
  const linkEndOffset =
    linkClosePrefix === '](' ? value.indexOf(')', endOffset + 2) : -1
  const isSelectedLinkLabel =
    startOffset > 0 && value[startOffset - 1] === '[' && linkEndOffset !== -1

  return {
    bold:
      getInlineWrapperContext(model, selection, '**') !== null ||
      isSelectedTextWrapped(selectedText, '**'),
    italic:
      getInlineWrapperContext(model, selection, '*') !== null ||
      isSelectedTextWrapped(selectedText, '*'),
    strikethrough:
      getInlineWrapperContext(model, selection, '~~') !== null ||
      isSelectedTextWrapped(selectedText, '~~'),
    code:
      getInlineWrapperContext(model, selection, '`') !== null ||
      isSelectedTextWrapped(selectedText, '`'),
    link: /^\[[\s\S]+\]\([^)]+\)$/u.test(selectedText) || isSelectedLinkLabel,
  }
}

function detectHeadingValue(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): HeadingValue {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return 'normal'
  }

  const fencedCodeBlock = getFencedCodeBlockContext(
    model,
    selection.getStartPosition().lineNumber,
  )

  if (fencedCodeBlock.insideCodeBlock) {
    return 'codeblock'
  }

  const line = model.getLineContent(selection.getStartPosition().lineNumber)
  const headingMatch = line.match(/^\s{0,3}(#{1,6})\s/u)

  if (headingMatch) {
    return `h${headingMatch[1].length}` as HeadingValue
  }

  if (/^\s{0,3}>\s?/u.test(line)) {
    return 'blockquote'
  }

  if (/^\s{0,3}```/u.test(line)) {
    return 'codeblock'
  }

  return 'normal'
}

function detectListValue(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): ListValue {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return 'none'
  }

  const line = model.getLineContent(selection.getStartPosition().lineNumber)

  if (/^\s*[-+*]\s+\[[ xX]\]\s+/u.test(line)) {
    return 'checklist'
  }

  if (/^\s*[-+*]\s+/u.test(line)) {
    return 'bullet'
  }

  if (/^\s*\d+[.)]\s+/u.test(line)) {
    return 'numbered'
  }

  return 'none'
}

function canRunMarkdownToolbarCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  return (
    !!model &&
    !!selections &&
    selections.length > 0 &&
    selections.every((selection) => isSelectionAllowedForToolbar(model, selection))
  )
}

function getEditorToolbarPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  container: HTMLElement,
  editorBody: HTMLDivElement,
  toolbar: HTMLDivElement | null,
) {
  const selection = getPrimarySelection(editor)

  if (!selection) {
    return null
  }

  const startPosition = selection.getStartPosition()
  const endPosition = selection.getEndPosition()
  const startVisiblePosition = editor.getScrolledVisiblePosition(startPosition)
  const endVisiblePosition = editor.getScrolledVisiblePosition(endPosition)
  const visiblePositions = [startVisiblePosition, endVisiblePosition].filter(
    (position): position is VisibleSelectionPosition => position !== null,
  )

  if (visiblePositions.length === 0) {
    return null
  }

  const containerRect = container.getBoundingClientRect()
  const editorBodyRect = editorBody.getBoundingClientRect()
  const editorOffsetLeft = editorBodyRect.left - containerRect.left
  const editorOffsetTop = editorBodyRect.top - containerRect.top
  const toolbarWidth = toolbar?.offsetWidth ?? TOOLBAR_ESTIMATED_WIDTH
  const toolbarHeight = toolbar?.offsetHeight ?? TOOLBAR_ESTIMATED_HEIGHT
  const sameLine = startPosition.lineNumber === endPosition.lineNumber
  const primaryPosition = visiblePositions[0]
  const centerX =
    sameLine && startVisiblePosition && endVisiblePosition
      ? (startVisiblePosition.left + endVisiblePosition.left) / 2
      : primaryPosition.left
  const selectionTop = Math.min(
    ...visiblePositions.map((position) => position.top),
  )
  const selectionBottom = Math.max(
    ...visiblePositions.map((position) => position.top + position.height),
  )
  const maxLeft = container.clientWidth - toolbarWidth - TOOLBAR_EDGE_PADDING
  const maxTop = container.clientHeight - toolbarHeight - TOOLBAR_EDGE_PADDING
  const left = clamp(
    editorOffsetLeft + centerX - toolbarWidth / 2,
    TOOLBAR_EDGE_PADDING,
    maxLeft,
  )
  const preferredTop =
    editorOffsetTop + selectionTop - toolbarHeight - TOOLBAR_SELECTION_OFFSET
  const fallbackTop =
    editorOffsetTop + selectionBottom + TOOLBAR_SELECTION_OFFSET
  const top = clamp(
    preferredTop >= TOOLBAR_EDGE_PADDING ? preferredTop : fallbackTop,
    TOOLBAR_EDGE_PADDING,
    maxTop,
  )

  return { left, top }
}

function getPreviewToolbarPosition(
  container: HTMLElement,
  selectionRect: DOMRect,
  toolbar: HTMLDivElement | null,
) {
  const containerRect = container.getBoundingClientRect()
  const toolbarWidth = toolbar?.offsetWidth ?? TOOLBAR_ESTIMATED_WIDTH
  const toolbarHeight = toolbar?.offsetHeight ?? TOOLBAR_ESTIMATED_HEIGHT
  const centerX =
    selectionRect.left - containerRect.left + selectionRect.width / 2
  const selectionTop = selectionRect.top - containerRect.top
  const selectionBottom = selectionRect.bottom - containerRect.top
  const maxLeft = container.clientWidth - toolbarWidth - TOOLBAR_EDGE_PADDING
  const maxTop = container.clientHeight - toolbarHeight - TOOLBAR_EDGE_PADDING
  const preferredTop = selectionTop - toolbarHeight - TOOLBAR_SELECTION_OFFSET
  const fallbackTop = selectionBottom + TOOLBAR_SELECTION_OFFSET

  return {
    left: clamp(centerX - toolbarWidth / 2, TOOLBAR_EDGE_PADDING, maxLeft),
    top: clamp(
      preferredTop >= TOOLBAR_EDGE_PADDING ? preferredTop : fallbackTop,
      TOOLBAR_EDGE_PADDING,
      maxTop,
    ),
  }
}

function getToolbarTooltipPosition(
  toolbar: HTMLDivElement,
  container: HTMLElement,
  target: HTMLElement,
  tooltip: HTMLDivElement,
): ToolbarTooltipPosition {
  const toolbarRect = toolbar.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const tooltipWidth = tooltip.offsetWidth
  const tooltipHeight = tooltip.offsetHeight
  const targetCenterX = targetRect.left + targetRect.width / 2
  const minLeft =
    containerRect.left - toolbarRect.left + TOOLBAR_TOOLTIP_EDGE_PADDING
  const maxLeft =
    containerRect.right -
    toolbarRect.left -
    tooltipWidth -
    TOOLBAR_TOOLTIP_EDGE_PADDING
  const unclampedLeft = targetCenterX - toolbarRect.left - tooltipWidth / 2
  const left = clamp(unclampedLeft, minLeft, maxLeft)
  const belowTop = targetRect.bottom - toolbarRect.top + TOOLBAR_TOOLTIP_GAP
  const aboveTop =
    targetRect.top - toolbarRect.top - tooltipHeight - TOOLBAR_TOOLTIP_GAP
  const hasSpaceBelow =
    targetRect.bottom + TOOLBAR_TOOLTIP_GAP + tooltipHeight <=
    containerRect.bottom - TOOLBAR_TOOLTIP_EDGE_PADDING
  const placement: ToolbarTooltipPlacement =
    hasSpaceBelow || aboveTop < TOOLBAR_TOOLTIP_EDGE_PADDING ? 'bottom' : 'top'
  const top = placement === 'bottom' ? belowTop : aboveTop
  const arrowLeft = clamp(
    targetCenterX - toolbarRect.left - left,
    12,
    Math.max(12, tooltipWidth - 12),
  )

  return {
    arrowLeft,
    left,
    placement,
    top,
  }
}

function ToolbarAssetIcon({ name }: { name: ToolbarIconName }) {
  return (
    <img
      className="markdown-toolbar-asset-icon"
      src={getToolbarIconSrc(name)}
      alt=""
      aria-hidden="true"
    />
  )
}

function isFloatingToolbarEnabledInEditor(mode: FloatingMarkdownToolbarMode) {
  return mode === 'Editor' || mode === 'EditorAndPreview'
}

function isFloatingToolbarEnabledInPreview(mode: FloatingMarkdownToolbarMode) {
  return mode === 'Preview' || mode === 'EditorAndPreview'
}

function FloatingMarkdownToolbar({
  editor,
  editorBodyRef,
  onRequestEditorMode,
  previewContentRef,
  previewScrollElementRef,
  toolbarMode,
  viewMode,
  workspaceRef,
}: FloatingMarkdownToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipTargetRef = useRef<HTMLElement | null>(null)
  const tooltipHideTimeoutRef = useRef<number | null>(null)
  const tooltipFrameRef = useRef<number | null>(null)
  const openDropdownRef = useRef<DropdownId | null>(null)
  const savedModelRef = useRef<monaco.editor.ITextModel | null>(null)
  const savedPreviewSelectionRef = useRef<PreviewSelectionSnapshot | null>(null)
  const savedSelectionsRef = useRef<monaco.Selection[] | null>(null)
  const savedSelectionSourceRef = useRef<ToolbarSelectionSource | null>(null)
  const dismissedSelectionKeyRef = useRef<string | null>(null)
  const toolbarInteractionRef = useRef(false)
  const toolbarInteractionTimeoutRef = useRef<number | null>(null)
  const [position, setPosition] = useState<ToolbarPosition | null>(null)
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null)
  const [headingValue, setHeadingValue] = useState<HeadingValue>('normal')
  const [listValue, setListValue] = useState<ListValue>('none')
  const [activeFormats, setActiveFormats] =
    useState<ActiveFormats>(EMPTY_ACTIVE_FORMATS)
  const [activeTooltip, setActiveTooltip] =
    useState<ActiveToolbarTooltip | null>(null)
  const activeTooltipKey = activeTooltip
    ? `${activeTooltip.label}\u0000${activeTooltip.shortcut ?? ''}`
    : null

  useEffect(() => {
    openDropdownRef.current = openDropdown
  }, [openDropdown])

  const clearSavedSelection = useCallback(() => {
    savedModelRef.current = null
    savedPreviewSelectionRef.current = null
    savedSelectionsRef.current = null
    savedSelectionSourceRef.current = null
  }, [])

  const updateToolbarTooltipPosition = useCallback(() => {
    const toolbar = toolbarRef.current
    const tooltip = tooltipRef.current
    const target = tooltipTargetRef.current
    const container = workspaceRef.current

    if (!toolbar || !tooltip || !target || !container) {
      return
    }

    const nextPosition = getToolbarTooltipPosition(
      toolbar,
      container,
      target,
      tooltip,
    )

    setActiveTooltip((currentTooltip) =>
      currentTooltip
        ? {
            ...currentTooltip,
            ...nextPosition,
            visible: true,
          }
        : currentTooltip,
    )
  }, [workspaceRef])

  const scheduleToolbarTooltipPosition = useCallback(() => {
    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current)
    }

    tooltipFrameRef.current = window.requestAnimationFrame(() => {
      tooltipFrameRef.current = null
      updateToolbarTooltipPosition()
    })
  }, [updateToolbarTooltipPosition])

  const hideToolbarTooltip = useCallback(() => {
    tooltipTargetRef.current = null

    if (tooltipFrameRef.current !== null) {
      window.cancelAnimationFrame(tooltipFrameRef.current)
      tooltipFrameRef.current = null
    }

    if (tooltipHideTimeoutRef.current !== null) {
      window.clearTimeout(tooltipHideTimeoutRef.current)
      tooltipHideTimeoutRef.current = null
    }

    setActiveTooltip((currentTooltip) =>
      currentTooltip ? { ...currentTooltip, visible: false } : currentTooltip,
    )

    tooltipHideTimeoutRef.current = window.setTimeout(() => {
      tooltipHideTimeoutRef.current = null
      setActiveTooltip(null)
    }, 140)
  }, [])

  const showToolbarTooltip = useCallback(
    (target: HTMLElement, tooltip: ToolbarTooltipContent) => {
      if (tooltipHideTimeoutRef.current !== null) {
        window.clearTimeout(tooltipHideTimeoutRef.current)
        tooltipHideTimeoutRef.current = null
      }

      tooltipTargetRef.current = target
      setActiveTooltip((currentTooltip) => ({
        ...tooltip,
        arrowLeft: currentTooltip?.arrowLeft ?? 12,
        left: currentTooltip?.left ?? 0,
        placement: currentTooltip?.placement ?? 'bottom',
        top: currentTooltip?.top ?? 0,
        visible: false,
      }))
      scheduleToolbarTooltipPosition()
    },
    [scheduleToolbarTooltipPosition],
  )

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
      setActiveTooltip(null)
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (rawPreviewSelection && !previewAllowed && !preferEditorSelection) {
      clearSavedSelection()
      setActiveTooltip(null)
      setPosition(null)
      setOpenDropdown(null)
      return
    }

    if (!previewSelection && currentEditorSelections.length === 0) {
      if (toolbarInteractionRef.current && savedSelectionsRef.current) {
        return
      }

      clearSavedSelection()
      setActiveTooltip(null)
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
      setActiveTooltip(null)
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
      setActiveTooltip(null)
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
      setActiveTooltip(null)
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
    editor,
    editorBodyRef,
    previewContentRef,
    toolbarMode,
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
            setActiveTooltip(null)
            setOpenDropdown(null)
            setPosition(null)
            return
          }

          updateToolbar()
        })
      })
    },
    [clearSavedSelection, editor, previewContentRef, updateToolbar],
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

      if (tooltipHideTimeoutRef.current !== null) {
        window.clearTimeout(tooltipHideTimeoutRef.current)
      }

      if (tooltipFrameRef.current !== null) {
        window.cancelAnimationFrame(tooltipFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!activeTooltipKey) {
      return
    }

    const frameId = window.requestAnimationFrame(updateToolbarTooltipPosition)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    activeTooltipKey,
    position?.left,
    position?.top,
    updateToolbarTooltipPosition,
  ])

  useEffect(() => {
    const handleResize = () => {
      scheduleToolbarTooltipPosition()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [scheduleToolbarTooltipPosition])

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
      setActiveTooltip(null)
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
        setActiveTooltip(null)
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
  }, [clearSavedSelection, editor, previewContentRef])

  const toolbarStyle = useMemo(
    () =>
      position
        ? ({
            left: `${position.left}px`,
            top: `${position.top}px`,
          }) satisfies CSSProperties
        : undefined,
    [position],
  )

  const runEditorCommand = useCallback(
    (
      command: (
        activeEditor: monaco.editor.IStandaloneCodeEditor,
        commandOptions: MarkdownCommandOptions,
      ) => void,
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
      updateToolbar,
      updateToolbarSoon,
      viewMode,
    ],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    const runKeyboardCommand = (
      command: (
        activeEditor: monaco.editor.IStandaloneCodeEditor,
        commandOptions: MarkdownCommandOptions,
      ) => void,
    ) => {
      runEditorCommand(command, {
        focusEditor: true,
        restoreSavedSelection: false,
      })
    }

    const actions = [
      editor.addAction({
        id: 'draft.markdownToolbar.bold',
        label: 'Markdown: Toggle Bold',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.italic',
        label: 'Markdown: Toggle Italic',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.inlineCode',
        label: 'Markdown: Toggle Inline Code',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.strikethrough',
        label: 'Markdown: Toggle Strikethrough',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
        ],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.link',
        label: 'Markdown: Toggle Link',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
        run: () => {
          runKeyboardCommand(toggleLinkSelection)
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading1',
        label: 'Markdown: Heading 1',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit1],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h1', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading2',
        label: 'Markdown: Heading 2',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit2],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h2', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading3',
        label: 'Markdown: Heading 3',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit3],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h3', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading4',
        label: 'Markdown: Heading 4',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit4],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h4', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading5',
        label: 'Markdown: Heading 5',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit5],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h5', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.heading6',
        label: 'Markdown: Heading 6',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit6],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'h6', commandOptions)
          })
        },
      }),
      editor.addAction({
        id: 'draft.markdownToolbar.normal',
        label: 'Markdown: Normal Text',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
        run: () => {
          runKeyboardCommand((activeEditor, commandOptions) => {
            applyHeadingStyle(activeEditor, 'normal', commandOptions)
          })
        },
      }),
    ]

    return () => {
      for (const action of actions) {
        action.dispose()
      }
    }
  }, [editor, runEditorCommand])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handlePreviewKeyDown = (event: KeyboardEvent) => {
      if (
        savedSelectionSourceRef.current !== 'preview' ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const code = event.code
      let command:
        | ((
            activeEditor: monaco.editor.IStandaloneCodeEditor,
            commandOptions: MarkdownCommandOptions,
          ) => void)
        | null = null
      let options: {
        focusEditor?: boolean
        switchPreviewLinkToEditor?: boolean
      } = { focusEditor: false }

      if (!event.shiftKey && key === 'b') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
        }
      } else if (!event.shiftKey && key === 'i') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
        }
      } else if (!event.shiftKey && key === 'e') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
        }
      } else if (event.shiftKey && key === 'x') {
        command = (activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
        }
      } else if (!event.shiftKey && key === 'k') {
        command = toggleLinkSelection
        options = {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        }
      } else if (!event.shiftKey && key === 'n') {
        command = (activeEditor, commandOptions) => {
          applyHeadingStyle(activeEditor, 'normal', commandOptions)
        }
      } else if (!event.shiftKey && /^Digit[1-6]$/u.test(code)) {
        command = (activeEditor, commandOptions) => {
          applyHeadingStyle(
            activeEditor,
            `h${code.replace('Digit', '')}` as HeadingValue,
            commandOptions,
          )
        }
      }

      if (!command) {
        return
      }

      event.preventDefault()
      runEditorCommand(command, options)
    }

    document.addEventListener('keydown', handlePreviewKeyDown)

    return () => {
      document.removeEventListener('keydown', handlePreviewKeyDown)
    }
  }, [editor, runEditorCommand])

  const handleHeadingSelect = useCallback(
    (value: string) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyHeadingStyle(activeEditor, value as HeadingValue, commandOptions)
      })
    },
    [runEditorCommand],
  )

  const handleHeadingOpenChange = useCallback(
    (open: boolean) => {
      hideToolbarTooltip()
      setOpenDropdown(open ? 'heading' : null)
    },
    [hideToolbarTooltip],
  )

  const handleListOpenChange = useCallback(
    (open: boolean) => {
      hideToolbarTooltip()
      setOpenDropdown(open ? 'list' : null)
    },
    [hideToolbarTooltip],
  )

  const headingTooltip = useMemo(
    () => ({
      label: headingLabels[headingValue],
      shortcut: headingShortcuts[headingValue],
    }),
    [headingValue],
  )

  const listTooltip = useMemo(
    () => ({
      label: listLabels[listValue],
    }),
    [listValue],
  )

  const handleListSelect = useCallback(
    (value: string) => {
      runEditorCommand((activeEditor, commandOptions) => {
        applyListStyle(activeEditor, value as ListValue, commandOptions)
      })
    },
    [runEditorCommand],
  )

  if (!editor || !position) {
    return null
  }

  return (
    <div
      ref={toolbarRef}
      className="floating-markdown-toolbar"
      style={toolbarStyle}
      role="toolbar"
      aria-label="Markdown formatting"
      onPointerDownCapture={(event) => {
        markToolbarInteraction()
        hideToolbarTooltip()
        event.preventDefault()
      }}
      onMouseDownCapture={(event) => {
        markToolbarInteraction()
        hideToolbarTooltip()
        event.preventDefault()
      }}
    >
      <ToolbarDropdown
        className="heading-dropdown"
        ariaLabel="Select text style"
        menuLabel="Text styles"
        items={headingItems}
        open={openDropdown === 'heading'}
        onOpenChange={handleHeadingOpenChange}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        selectedValue={headingValue}
        triggerTooltip={headingTooltip}
        triggerLabel={headingLabels[headingValue]}
        onSelect={handleHeadingSelect}
      />

      <div className="markdown-toolbar-divider" aria-hidden="true" />

      <ToolbarButton
        ariaLabel="Bold"
        active={activeFormats.bold}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '**', '**', commandOptions)
        })}
        tooltip={inlineTooltips.bold}
      >
        <ToolbarAssetIcon name="bold" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Italic"
        active={activeFormats.italic}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '*', '*', commandOptions)
        })}
        tooltip={inlineTooltips.italic}
      >
        <ToolbarAssetIcon name="italic" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Strikethrough"
        active={activeFormats.strikethrough}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '~~', '~~', commandOptions)
        })}
        tooltip={inlineTooltips.strikethrough}
      >
        <ToolbarAssetIcon name="strikethrough" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Inline code"
        active={activeFormats.code}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand((activeEditor, commandOptions) => {
          toggleWrappedSelection(activeEditor, '`', '`', commandOptions)
        })}
        tooltip={inlineTooltips.code}
      >
        <ToolbarAssetIcon name="code" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Link"
        active={activeFormats.link}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        onClick={() => runEditorCommand(toggleLinkSelection, {
          focusEditor: true,
          switchPreviewLinkToEditor: true,
        })}
        tooltip={inlineTooltips.link}
      >
        <ToolbarAssetIcon name="link" />
      </ToolbarButton>

      <div className="markdown-toolbar-divider" aria-hidden="true" />

      <ToolbarDropdown
        align="right"
        className="list-dropdown"
        ariaLabel={`List style: ${listLabels[listValue]}`}
        menuLabel="List styles"
        items={listItems}
        open={openDropdown === 'list'}
        onOpenChange={handleListOpenChange}
        onTooltipHide={hideToolbarTooltip}
        onTooltipShow={showToolbarTooltip}
        selectedValue={listValue}
        triggerIcon={<ToolbarAssetIcon name={listIcons[listValue]} />}
        triggerLabel=""
        triggerTooltip={listTooltip}
        onSelect={handleListSelect}
      />
      {activeTooltip ? (
        <ToolbarTooltip
          ref={tooltipRef}
          arrowLeft={activeTooltip.arrowLeft}
          label={activeTooltip.label}
          left={activeTooltip.left}
          placement={activeTooltip.placement}
          shortcut={activeTooltip.shortcut}
          top={activeTooltip.top}
          visible={activeTooltip.visible}
        />
      ) : null}
    </div>
  )
}

export default FloatingMarkdownToolbar
