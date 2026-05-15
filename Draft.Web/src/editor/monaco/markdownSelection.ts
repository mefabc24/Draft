import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'

export function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

export function getPrimarySelection(
  editor: monaco.editor.IStandaloneCodeEditor,
  selections = editor.getSelections(),
) {
  return selections?.find((selection) => !isEmptySelection(selection)) ?? null
}

export function cloneSelection(selection: monaco.Selection) {
  return new monaco.Selection(
    selection.selectionStartLineNumber,
    selection.selectionStartColumn,
    selection.positionLineNumber,
    selection.positionColumn,
  )
}

export function cloneSelections(selections: monaco.Selection[]) {
  return selections.map(cloneSelection)
}

export function getNonEmptySelections(editor: monaco.editor.IStandaloneCodeEditor) {
  return editor.getSelections()?.filter((selection) => !isEmptySelection(selection)) ?? []
}

export function getSelectionKey(selections: monaco.Selection[]) {
  return selections
    .map(
      (selection) =>
        `${selection.selectionStartLineNumber}:${selection.selectionStartColumn}:${selection.positionLineNumber}:${selection.positionColumn}`,
    )
    .join('|')
}

export function createSelectionFromOffsets(
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

export function createRangeFromOffsets(
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

export function getSelectionOffsets(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
) {
  return {
    endOffset: model.getOffsetAt(selection.getEndPosition()),
    startOffset: model.getOffsetAt(selection.getStartPosition()),
  }
}

export function getFencedCodeBlockContext(
  model: monaco.editor.ITextModel,
  lineNumber: number,
) {
  return getFencedCodeBlockContextFromLines(
    (line) => model.getLineContent(line),
    lineNumber,
  )
}

export function isSelectionAllowedForToolbar(
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

export function isSelectionValidForModel(
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

export function getSelectedLineNumbers(
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
