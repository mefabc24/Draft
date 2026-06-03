import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  addBlockquotePrefix,
  addCalloutBlockquotePrefix,
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

type CalloutMarkerLine = {
  lineNumber: number
  remainder: string
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

function getCalloutMarkerEdit(
  model: monaco.editor.ITextModel,
  range: BlockquoteBlockRange,
  markerLine: CalloutMarkerLine,
  calloutType: CalloutType,
) {
  const line = model.getLineContent(markerLine.lineNumber)
  const normalizedLine = removeBlockquotePrefix(line)
  const indentation = normalizedLine.match(/^(\s*)/u)?.[1] ?? ''

  if (calloutType !== 'default') {
    return getLineReplaceEdit(
      model,
      markerLine.lineNumber,
      `${indentation}> ${getCalloutMarker(calloutType)}`,
    )
  }

  const defaultContent = markerLine.remainder.trimStart()

  if (defaultContent.length > 0) {
    return getLineReplaceEdit(
      model,
      markerLine.lineNumber,
      `${indentation}> ${defaultContent}`,
    )
  }

  if (
    range.startLineNumber === markerLine.lineNumber &&
    range.endLineNumber === markerLine.lineNumber
  ) {
    return getLineReplaceEdit(model, markerLine.lineNumber, `${indentation}> `)
  }

  return getLineDeleteEdit(model, markerLine.lineNumber)
}

function isLineNumberInRange(
  lineNumber: number,
  range: BlockquoteBlockRange,
) {
  return (
    lineNumber >= range.startLineNumber && lineNumber <= range.endLineNumber
  )
}

export function applyHeadingStyle(
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

export function applyCalloutBlockquoteStyle(
  editor: monaco.editor.IStandaloneCodeEditor,
  calloutType: CalloutType,
  options?: MarkdownCommandOptions,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return
  }

  const lineNumbers = getSelectedLineNumbers(model, selections)
  const handledBlockquoteRanges: BlockquoteBlockRange[] = []
  const handledMarkerLines = new Set<number>()
  const markerEdits: monaco.editor.IIdentifiedSingleEditOperation[] = []

  for (const lineNumber of lineNumbers) {
    const blockquoteRange = getBlockquoteBlockRange(model, lineNumber)

    if (!blockquoteRange) {
      continue
    }

    const markerLine = getCalloutMarkerLineInBlock(model, blockquoteRange)

    if (!markerLine || handledMarkerLines.has(markerLine.lineNumber)) {
      continue
    }

    handledBlockquoteRanges.push(blockquoteRange)
    handledMarkerLines.add(markerLine.lineNumber)
    markerEdits.push(
      getCalloutMarkerEdit(model, blockquoteRange, markerLine, calloutType),
    )
  }

  if (markerEdits.length === 0) {
    replaceSelectedLines(
      editor,
      (line, index) => addCalloutBlockquotePrefix(line, index, calloutType),
      options,
    )
    return
  }

  const unhandledLineNumbers = lineNumbers.filter(
    (lineNumber) =>
      !handledBlockquoteRanges.some((range) =>
        isLineNumberInRange(lineNumber, range),
      ),
  )
  const lineEdits = unhandledLineNumbers.flatMap((lineNumber, index) => {
    const line = model.getLineContent(lineNumber)
    const nextLine = addCalloutBlockquotePrefix(line, index, calloutType)

    if (nextLine === line) {
      return []
    }

    return [getLineReplaceEdit(model, lineNumber, nextLine)]
  })

  executeEditorEdits(editor, [...markerEdits, ...lineEdits], undefined, options)
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
