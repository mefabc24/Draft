import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  addBlockquotePrefix,
  addHeadingPrefix,
  addListPrefix,
  detectActiveHeadingValue,
  detectActiveInlineFormats,
  detectActiveListValue,
  EMPTY_ACTIVE_FORMATS,
  getToggleImageEdits,
  getToggleLinkEdits,
  getToggleWrappedEdits,
  isInlineFormatActive,
  removeBlockquotePrefix,
  removeHeadingPrefix,
  removeListPrefix,
  toggleFencedCodeBlockText,
  type ActiveFormats,
  type HeadingValue,
  type ListValue,
  type MarkdownCommandOptions,
  type MarkdownSelectionOffsetRange,
  type MarkdownTextEdit,
  type ToggleWrappedMode,
} from '../../markdown'
import {
  getCalloutMarker,
  normalizeCalloutType,
  type CalloutType,
} from '../../markdown/callouts'
import {
  createRangeFromOffsets,
  createSelectionFromOffsets,
  getFencedCodeBlockContext,
  getPrimarySelection,
  getSelectedLineNumbers,
  getSelectionOffsets,
  isEmptySelection,
  isSelectionAllowedForToolbar,
} from './markdownSelection'

export { EMPTY_ACTIVE_FORMATS }
export {
  cloneSelection,
  cloneSelections,
  createRangeFromOffsets,
  createSelectionFromOffsets,
  getFencedCodeBlockContext,
  getNonEmptySelections,
  getPrimarySelection,
  getSelectionKey,
  getSelectionOffsets,
  isEmptySelection,
  isSelectionAllowedForToolbar,
  isSelectionValidForModel,
} from './markdownSelection'

export type MarkdownEditorCommand = (
  activeEditor: monaco.editor.IStandaloneCodeEditor,
  commandOptions: MarkdownCommandOptions,
) => void

const BLOCKQUOTE_LINE_PATTERN = /^\s{0,3}>\s?(.*)$/u
const CALLOUT_MARKER_PATTERN = /^\[!([A-Za-z]+)\](?:\s|$)/u
const CALLOUT_MARKER_DETAIL_PATTERN = /^\s*\[!([A-Za-z]+)\]([ \t]*)(.*)$/u
const FENCED_CODE_BLOCK_PATTERN = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)?.*$/u

function createMonacoEditFromMarkdownEdit(
  model: monaco.editor.ITextModel,
  edit: MarkdownTextEdit,
) {
  return {
    range: createRangeFromOffsets(model, edit.startOffset, edit.endOffset),
    text: edit.text,
    forceMoveMarkers: true,
  } satisfies monaco.editor.IIdentifiedSingleEditOperation
}

function executeEditorEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: monaco.editor.IIdentifiedSingleEditOperation[],
  nextSelectionOffsets?: MarkdownSelectionOffsetRange[],
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

type MarkdownEditGroup = {
  anchorOffset: number
  edits: MarkdownTextEdit[]
  nextSelection: MarkdownSelectionOffsetRange
}

function getMarkdownEditDelta(edit: MarkdownTextEdit) {
  return edit.text.length - (edit.endOffset - edit.startOffset)
}

function getMarkdownEditGroupDelta(group: MarkdownEditGroup) {
  return group.edits.reduce(
    (delta, edit) => delta + getMarkdownEditDelta(edit),
    0,
  )
}

function getMarkdownEditGroupAnchor(
  selection: MarkdownSelectionOffsetRange,
  edits: MarkdownTextEdit[],
) {
  return edits.reduce(
    (anchorOffset, edit) => Math.min(anchorOffset, edit.startOffset),
    selection.startOffset,
  )
}

function getMappedEditGroupSelections(groups: MarkdownEditGroup[]) {
  let accumulatedDelta = 0

  return [...groups]
    .sort((a, b) => a.anchorOffset - b.anchorOffset)
    .map((group) => {
      const nextSelection = {
        endOffset: group.nextSelection.endOffset + accumulatedDelta,
        startOffset: group.nextSelection.startOffset + accumulatedDelta,
      }

      accumulatedDelta += getMarkdownEditGroupDelta(group)

      return nextSelection
    })
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

function getBlockquoteLineContent(line: string) {
  return BLOCKQUOTE_LINE_PATTERN.exec(line)?.[1] ?? null
}

function getCalloutTypeFromBlockquoteLine(line: string) {
  const content = getBlockquoteLineContent(line)

  if (content === null) {
    return null
  }

  const markerMatch = CALLOUT_MARKER_PATTERN.exec(content.trimStart())

  return markerMatch ? normalizeCalloutType(markerMatch[1] ?? '') : null
}

type BlockquoteBlockRange = {
  endLineNumber: number
  startLineNumber: number
}

type FencedCodeBlockRange = {
  endLineNumber: number
  hasClosingFence: boolean
  startLineNumber: number
}

type CalloutMarkerLine = {
  lineNumber: number
  remainder: string
}

type BlockStyleLineRange = {
  endLineNumber: number
  kind: 'blockquote' | 'codeblock' | 'plain'
  startLineNumber: number
}

type ExclusiveBlockStyle =
  | {
      type: 'blockquote'
      calloutType: CalloutType
    }
  | {
      type: 'codeblock'
    }
  | {
      type: 'heading'
      level: number
    }
  | {
      type: 'normal'
    }

function getBlockquoteBlockRange(
  model: monaco.editor.ITextModel,
  lineNumber: number,
): BlockquoteBlockRange | null {
  if (getBlockquoteLineContent(model.getLineContent(lineNumber)) === null) {
    return null
  }

  let startLineNumber = lineNumber
  let endLineNumber = lineNumber

  while (
    startLineNumber > 1 &&
    getBlockquoteLineContent(model.getLineContent(startLineNumber - 1)) !== null
  ) {
    startLineNumber -= 1
  }

  while (
    endLineNumber < model.getLineCount() &&
    getBlockquoteLineContent(model.getLineContent(endLineNumber + 1)) !== null
  ) {
    endLineNumber += 1
  }

  return { endLineNumber, startLineNumber }
}

function getFencedCodeBlockRange(
  model: monaco.editor.ITextModel,
  lineNumber: number,
): FencedCodeBlockRange | null {
  let openingFence:
    | {
        character: string
        length: number
        lineNumber: number
      }
    | null = null

  for (
    let currentLineNumber = 1;
    currentLineNumber <= model.getLineCount();
    currentLineNumber += 1
  ) {
    const line = model.getLineContent(currentLineNumber)
    const fenceMatch = FENCED_CODE_BLOCK_PATTERN.exec(line)

    if (!fenceMatch) {
      continue
    }

    const fence = fenceMatch[1] ?? ''
    const fenceCharacter = fence[0] ?? ''

    if (!openingFence) {
      openingFence = {
        character: fenceCharacter,
        length: fence.length,
        lineNumber: currentLineNumber,
      }
      continue
    }

    if (
      fenceCharacter !== openingFence.character ||
      fence.length < openingFence.length
    ) {
      continue
    }

    if (
      lineNumber >= openingFence.lineNumber &&
      lineNumber <= currentLineNumber
    ) {
      return {
        endLineNumber: currentLineNumber,
        hasClosingFence: true,
        startLineNumber: openingFence.lineNumber,
      }
    }

    openingFence = null
  }

  if (openingFence && lineNumber >= openingFence.lineNumber) {
    return {
      endLineNumber: model.getLineCount(),
      hasClosingFence: false,
      startLineNumber: openingFence.lineNumber,
    }
  }

  return null
}

function getCalloutMarkerLineInfo(line: string) {
  const content = getBlockquoteLineContent(line)

  if (content === null) {
    return null
  }

  const markerMatch = CALLOUT_MARKER_DETAIL_PATTERN.exec(content)

  if (!markerMatch) {
    return null
  }

  const spacingAfterMarker = markerMatch[2] ?? ''
  const remainder = markerMatch[3] ?? ''

  if (remainder.length > 0 && spacingAfterMarker.length === 0) {
    return null
  }

  return {
    remainder,
  }
}

function getCalloutMarkerLineInBlock(
  model: monaco.editor.ITextModel,
  range: BlockquoteBlockRange,
): CalloutMarkerLine | null {
  for (
    let lineNumber = range.startLineNumber;
    lineNumber <= range.endLineNumber;
    lineNumber += 1
  ) {
    const markerLineInfo = getCalloutMarkerLineInfo(
      model.getLineContent(lineNumber),
    )

    if (markerLineInfo) {
      return {
        lineNumber,
        remainder: markerLineInfo.remainder,
      }
    }
  }

  return null
}

function getLineReplaceEdit(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  text: string,
) {
  return {
    range: new monaco.Range(
      lineNumber,
      1,
      lineNumber,
      model.getLineMaxColumn(lineNumber),
    ),
    text,
    forceMoveMarkers: true,
  } satisfies monaco.editor.IIdentifiedSingleEditOperation
}

function getLineDeleteEdit(model: monaco.editor.ITextModel, lineNumber: number) {
  if (lineNumber < model.getLineCount()) {
    return {
      range: new monaco.Range(lineNumber, 1, lineNumber + 1, 1),
      text: '',
      forceMoveMarkers: true,
    } satisfies monaco.editor.IIdentifiedSingleEditOperation
  }

  if (lineNumber > 1) {
    return {
      range: new monaco.Range(
        lineNumber - 1,
        model.getLineMaxColumn(lineNumber - 1),
        lineNumber,
        model.getLineMaxColumn(lineNumber),
      ),
      text: '',
      forceMoveMarkers: true,
    } satisfies monaco.editor.IIdentifiedSingleEditOperation
  }

  return getLineReplaceEdit(model, lineNumber, '')
}

function getLineRangeReplaceEdit(
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number,
  text: string,
) {
  return {
    range: new monaco.Range(
      startLineNumber,
      1,
      endLineNumber,
      model.getLineMaxColumn(endLineNumber),
    ),
    text,
    forceMoveMarkers: true,
  } satisfies monaco.editor.IIdentifiedSingleEditOperation
}

function isLineNumberInRange(
  lineNumber: number,
  range: BlockquoteBlockRange,
) {
  return (
    lineNumber >= range.startLineNumber && lineNumber <= range.endLineNumber
  )
}

function isLineNumberInAnyRange(
  lineNumber: number,
  ranges: Pick<BlockStyleLineRange, 'endLineNumber' | 'startLineNumber'>[],
) {
  return ranges.some((range) => isLineNumberInRange(lineNumber, range))
}

function getSelectedBlockStyleLineRanges(
  model: monaco.editor.ITextModel,
  lineNumbers: number[],
) {
  const ranges: BlockStyleLineRange[] = []

  for (const lineNumber of lineNumbers) {
    if (isLineNumberInAnyRange(lineNumber, ranges)) {
      continue
    }

    const blockquoteRange = getBlockquoteBlockRange(model, lineNumber)

    if (blockquoteRange) {
      ranges.push({
        ...blockquoteRange,
        kind: 'blockquote',
      })
      continue
    }

    const codeBlockRange = getFencedCodeBlockRange(model, lineNumber)

    if (codeBlockRange) {
      ranges.push({
        ...codeBlockRange,
        kind: 'codeblock',
      })
      continue
    }

    ranges.push({
      endLineNumber: lineNumber,
      kind: 'plain',
      startLineNumber: lineNumber,
    })
  }

  return ranges.sort((a, b) => a.startLineNumber - b.startLineNumber)
}

function normalizePlainBlockStyleLine(line: string) {
  return removeHeadingPrefix(removeBlockquotePrefix(line))
}

function getNormalizedBlockquoteLines(
  model: monaco.editor.ITextModel,
  range: BlockStyleLineRange,
) {
  const markerLine = getCalloutMarkerLineInBlock(model, range)
  const lines: string[] = []

  for (
    let lineNumber = range.startLineNumber;
    lineNumber <= range.endLineNumber;
    lineNumber += 1
  ) {
    const line = model.getLineContent(lineNumber)

    if (markerLine?.lineNumber === lineNumber) {
      const markerContent = markerLine.remainder.trimStart()

      if (markerContent.length > 0) {
        const normalizedLine = removeBlockquotePrefix(line)
        const indentation = normalizedLine.match(/^(\s*)/u)?.[1] ?? ''

        lines.push(normalizePlainBlockStyleLine(`${indentation}${markerContent}`))
      }

      continue
    }

    lines.push(normalizePlainBlockStyleLine(line))
  }

  return lines
}

function getNormalizedCodeBlockLines(
  model: monaco.editor.ITextModel,
  range: BlockStyleLineRange,
) {
  const codeBlockRange = getFencedCodeBlockRange(model, range.startLineNumber)
  const endLineNumber =
    codeBlockRange?.hasClosingFence && range.endLineNumber > range.startLineNumber
      ? range.endLineNumber - 1
      : range.endLineNumber
  const lines: string[] = []

  for (
    let lineNumber = range.startLineNumber + 1;
    lineNumber <= endLineNumber;
    lineNumber += 1
  ) {
    lines.push(model.getLineContent(lineNumber))
  }

  return lines
}

function getNormalizedBlockStyleLines(
  model: monaco.editor.ITextModel,
  range: BlockStyleLineRange,
) {
  if (range.kind === 'blockquote') {
    return getNormalizedBlockquoteLines(model, range)
  }

  if (range.kind === 'codeblock') {
    return getNormalizedCodeBlockLines(model, range)
  }

  return [normalizePlainBlockStyleLine(model.getLineContent(range.startLineNumber))]
}

function getBlockquoteLineText(
  line: string,
  calloutType: CalloutType,
  lineIndex: number,
) {
  if (calloutType === 'default') {
    return [addBlockquotePrefix(line)]
  }

  const quotedLine = addBlockquotePrefix(line)

  if (lineIndex !== 0) {
    return [quotedLine]
  }

  const indentation = line.match(/^(\s*)/u)?.[1] ?? ''

  return [`${indentation}> ${getCalloutMarker(calloutType)}`, quotedLine]
}

function getTransformedBlockStyleText(
  lines: string[],
  style: ExclusiveBlockStyle,
  firstLineIndex: number,
) {
  const contentLines = lines.length > 0 ? lines : ['']

  if (style.type === 'normal') {
    return lines.join('\n')
  }

  if (style.type === 'heading') {
    return contentLines
      .map((line) => addHeadingPrefix(line, style.level))
      .join('\n')
  }

  if (style.type === 'blockquote') {
    return contentLines
      .flatMap((line, index) =>
        getBlockquoteLineText(line, style.calloutType, firstLineIndex + index),
      )
      .join('\n')
  }

  return `\`\`\`\n${contentLines.join('\n')}\n\`\`\``
}

function getBlockStyleRangeEdit(
  model: monaco.editor.ITextModel,
  range: BlockStyleLineRange,
  style: ExclusiveBlockStyle,
  firstLineIndex: number,
) {
  const lines = getNormalizedBlockStyleLines(model, range)
  const text = getTransformedBlockStyleText(lines, style, firstLineIndex)

  if (text.length === 0) {
    return getLineDeleteEdit(model, range.startLineNumber)
  }

  return getLineRangeReplaceEdit(
    model,
    range.startLineNumber,
    range.endLineNumber,
    text,
  )
}

function mergeAdjacentBlockStyleRanges(ranges: BlockStyleLineRange[]) {
  const mergedRanges: BlockStyleLineRange[][] = []

  for (const range of ranges) {
    const previousRangeGroup = mergedRanges[mergedRanges.length - 1]
    const previousRange = previousRangeGroup?.[previousRangeGroup.length - 1]

    if (previousRange && range.startLineNumber <= previousRange.endLineNumber + 1) {
      previousRangeGroup.push(range)
      continue
    }

    mergedRanges.push([range])
  }

  return mergedRanges
}

function getCodeBlockRangeEdit(
  model: monaco.editor.ITextModel,
  ranges: BlockStyleLineRange[],
) {
  const startLineNumber = ranges[0]?.startLineNumber ?? 1
  const endLineNumber = ranges[ranges.length - 1]?.endLineNumber ?? startLineNumber
  const contentLines = ranges.flatMap((range) =>
    getNormalizedBlockStyleLines(model, range),
  )
  const text = getTransformedBlockStyleText(contentLines, { type: 'codeblock' }, 0)

  return getLineRangeReplaceEdit(model, startLineNumber, endLineNumber, text)
}

function applyExclusiveBlockStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  style: ExclusiveBlockStyle,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return
  }

  const lineNumbers = getSelectedLineNumbers(model, selections)
  const ranges = getSelectedBlockStyleLineRanges(model, lineNumbers)

  if (style.type === 'codeblock') {
    const edits = mergeAdjacentBlockStyleRanges(ranges)
      .filter(
        (rangeGroup) =>
          rangeGroup.length !== 1 || rangeGroup[0]?.kind !== 'codeblock',
      )
      .map((rangeGroup) => getCodeBlockRangeEdit(model, rangeGroup))

    executeEditorEdits(editor, edits, undefined, options)
    return
  }

  let lineIndex = 0
  let previousRange: BlockStyleLineRange | null = null
  const edits = ranges.map((range) => {
    if (
      style.type === 'blockquote' &&
      style.calloutType !== 'default' &&
      previousRange &&
      range.startLineNumber > previousRange.endLineNumber + 1
    ) {
      lineIndex = 0
    }

    const lines = getNormalizedBlockStyleLines(model, range)
    const edit = getBlockStyleRangeEdit(model, range, style, lineIndex)

    lineIndex += Math.max(1, lines.length)
    previousRange = range

    return edit
  })

  executeEditorEdits(editor, edits, undefined, options)
}

export function applyHeadingStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  value: HeadingValue,
  options?: MarkdownCommandOptions,
) {
  if (value === 'codeblock') {
    applyExclusiveBlockStyle(editor, { type: 'codeblock' }, options)
    return
  }

  if (value === 'blockquote') {
    applyExclusiveBlockStyle(
      editor,
      { calloutType: 'default', type: 'blockquote' },
      options,
    )
    return
  }

  if (value === 'normal') {
    applyExclusiveBlockStyle(editor, { type: 'normal' }, options)
    return
  }

  const level = Number(value.replace('h', ''))
  applyExclusiveBlockStyle(editor, { level, type: 'heading' }, options)
}

export function applyCalloutBlockquoteStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  calloutType: CalloutType,
  options?: MarkdownCommandOptions,
) {
  applyExclusiveBlockStyle(
    editor,
    { calloutType, type: 'blockquote' },
    options,
  )
}

export function applyListStyle(
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

export function toggleWrappedSelection(
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

  const value = model.getValue()
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  const selectionEntries = selections
    .filter((selection) => !isEmptySelection(selection))
    .map((selection) => {
      const selectionOffsets = getSelectionOffsets(model, selection)

      return {
        selectedText: model.getValueInRange(selection),
        selectionOffsets,
      }
    })
  const mode: ToggleWrappedMode =
    selectionEntries.length > 0 &&
    selectionEntries.every(({ selectedText, selectionOffsets }) =>
      isInlineFormatActive(value, selectionOffsets, selectedText, prefix, suffix),
    )
      ? 'unwrap'
      : 'wrap'
  const editGroups: MarkdownEditGroup[] = []

  for (const { selectedText, selectionOffsets } of selectionEntries) {
    const result = getToggleWrappedEdits(
      value,
      selectionOffsets,
      selectedText,
      prefix,
      suffix,
      mode,
    )

    edits.push(
      ...result.edits.map((edit) =>
        createMonacoEditFromMarkdownEdit(model, edit),
      ),
    )
    editGroups.push({
      anchorOffset: getMarkdownEditGroupAnchor(selectionOffsets, result.edits),
      edits: result.edits,
      nextSelection: result.nextSelection,
    })
  }

  executeEditorEdits(
    editor,
    edits,
    getMappedEditGroupSelections(editGroups),
    options,
  )
}

export function toggleLinkSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections) {
    return
  }

  const value = model.getValue()
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  const nextSelectionOffsets: MarkdownSelectionOffsetRange[] = []

  for (const selection of selections) {
    if (isEmptySelection(selection)) {
      continue
    }

    const selectionOffsets = getSelectionOffsets(model, selection)
    const selectedText = model.getValueInRange(selection)
    const result = getToggleLinkEdits(value, selectionOffsets, selectedText)

    edits.push(
      ...result.edits.map((edit) =>
        createMonacoEditFromMarkdownEdit(model, edit),
      ),
    )
    nextSelectionOffsets.push(result.nextSelection)
  }

  executeEditorEdits(editor, edits, nextSelectionOffsets, options)
}

export function toggleImageSelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections) {
    return
  }

  const value = model.getValue()
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []
  const nextSelectionOffsets: MarkdownSelectionOffsetRange[] = []

  for (const selection of selections) {
    if (isEmptySelection(selection)) {
      continue
    }

    const selectionOffsets = getSelectionOffsets(model, selection)
    const selectedText = model.getValueInRange(selection)
    const result = getToggleImageEdits(value, selectionOffsets, selectedText)

    edits.push(
      ...result.edits.map((edit) =>
        createMonacoEditFromMarkdownEdit(model, edit),
      ),
    )
    nextSelectionOffsets.push(result.nextSelection)
  }

  executeEditorEdits(editor, edits, nextSelectionOffsets, options)
}

export function toggleCodeBlock(
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

    return [
      {
        range: selection,
        text: toggleFencedCodeBlockText(model.getValueInRange(selection)),
        forceMoveMarkers: true,
      },
    ]
  })

  executeEditorEdits(editor, edits, undefined, options)
}

export function replaceMarkdownSourceRange(
  editor: monaco.editor.IStandaloneCodeEditor,
  selection: MarkdownSelectionOffsetRange,
  text: string,
  options: MarkdownCommandOptions & { selectReplacement?: boolean } = {},
) {
  const model = editor.getModel()

  if (!model) {
    return null
  }

  const edit = createMonacoEditFromMarkdownEdit(model, {
    ...selection,
    text,
  })

  executeEditorEdits(editor, [edit], undefined, options)

  const replacementEndOffset = selection.startOffset + text.length
  const nextSelection =
    options.selectReplacement === false
      ? createSelectionFromOffsets(model, replacementEndOffset, replacementEndOffset)
      : createSelectionFromOffsets(
          model,
          selection.startOffset,
          replacementEndOffset,
        )

  editor.setSelection(nextSelection)
  return nextSelection
}

export function detectInlineFormats(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): ActiveFormats {
  const model = editor.getModel()
  const activeSelections = (selections ?? editor.getSelections())?.filter(
    (selection) => !isEmptySelection(selection),
  )

  if (!model || !activeSelections || activeSelections.length === 0) {
    return EMPTY_ACTIVE_FORMATS
  }

  const formats = activeSelections.map((selection) =>
    detectActiveInlineFormats(
      model.getValue(),
      getSelectionOffsets(model, selection),
      model.getValueInRange(selection),
    ),
  )
  const formatKeys = Object.keys(EMPTY_ACTIVE_FORMATS) as Array<
    keyof ActiveFormats
  >

  return formatKeys.reduce(
    (activeFormats, format) => ({
      ...activeFormats,
      [format]: formats.every((selectionFormats) => selectionFormats[format]),
    }),
    { ...EMPTY_ACTIVE_FORMATS },
  )
}

export function detectHeadingValue(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): HeadingValue {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return 'normal'
  }

  const lineNumber = selection.getStartPosition().lineNumber

  return detectActiveHeadingValue(
    model.getLineContent(lineNumber),
    getFencedCodeBlockContext(model, lineNumber),
  )
}

export function detectCalloutType(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): CalloutType | null {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return null
  }

  const lineNumber = selection.getStartPosition().lineNumber

  if (getBlockquoteLineContent(model.getLineContent(lineNumber)) === null) {
    return null
  }

  for (
    let currentLineNumber = lineNumber;
    currentLineNumber >= 1;
    currentLineNumber -= 1
  ) {
    const line = model.getLineContent(currentLineNumber)

    if (getBlockquoteLineContent(line) === null) {
      break
    }

    const calloutType = getCalloutTypeFromBlockquoteLine(line)

    if (calloutType) {
      return calloutType
    }
  }

  return 'default'
}

export function detectListValue(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections?: monaco.Selection[],
): ListValue {
  const model = editor.getModel()
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return 'none'
  }

  return detectActiveListValue(
    model.getLineContent(selection.getStartPosition().lineNumber),
  )
}

export function canRunMarkdownToolbarCommand(
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
