import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  addBlockquotePrefix,
  addHeadingPrefix,
  addListPrefix,
  detectActiveHeadingValue,
  detectActiveInlineFormats,
  detectActiveListValue,
  EMPTY_ACTIVE_FORMATS,
  getToggleLinkEdits,
  getToggleWrappedEdits,
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
} from '../../markdown'
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
  const nextSelectionOffsets: MarkdownSelectionOffsetRange[] = []

  for (const selection of selections) {
    if (isEmptySelection(selection)) {
      continue
    }

    const selectionOffsets = getSelectionOffsets(model, selection)
    const selectedText = model.getValueInRange(selection)
    const result = getToggleWrappedEdits(
      value,
      selectionOffsets,
      selectedText,
      prefix,
      suffix,
    )

    edits.push(
      ...result.edits.map((edit) =>
        createMonacoEditFromMarkdownEdit(model, edit),
      ),
    )
    nextSelectionOffsets.push(result.nextSelection)
  }

  executeEditorEdits(editor, edits, nextSelectionOffsets, options)
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
  const selection = getPrimarySelection(editor, selections)

  if (!model || !selection) {
    return EMPTY_ACTIVE_FORMATS
  }

  return detectActiveInlineFormats(
    model.getValue(),
    getSelectionOffsets(model, selection),
    model.getValueInRange(selection),
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
