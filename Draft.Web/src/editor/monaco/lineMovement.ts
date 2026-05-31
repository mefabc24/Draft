import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

const LINE_MOVEMENT_EDIT_SOURCE = 'draft.moveLines'

export type LineMovementDirection = 'up' | 'down'

type SelectedLineBlock = {
  endLineNumber: number
  startLineNumber: number
}

function getSelectedLineBlock(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
): SelectedLineBlock {
  const start = selection.getStartPosition()
  const end = selection.getEndPosition()
  const lineCount = model.getLineCount()
  const endLineNumber =
    end.column === 1 && end.lineNumber > start.lineNumber
      ? end.lineNumber - 1
      : end.lineNumber

  return {
    endLineNumber: Math.min(Math.max(endLineNumber, 1), lineCount),
    startLineNumber: Math.min(Math.max(start.lineNumber, 1), lineCount),
  }
}

function getLastMovableLineNumber(model: monaco.editor.ITextModel) {
  const lineCount = model.getLineCount()

  if (lineCount > 1 && model.getValue().endsWith(model.getEOL())) {
    return lineCount - 1
  }

  return lineCount
}

function getLineContents(
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number,
) {
  const lineContents: string[] = []

  for (
    let lineNumber = startLineNumber;
    lineNumber <= endLineNumber;
    lineNumber += 1
  ) {
    lineContents.push(model.getLineContent(lineNumber))
  }

  return lineContents
}

function getLineRangeReplacement(
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number,
  lineContents: string[],
) {
  const eol = model.getEOL()
  const lineCount = model.getLineCount()

  if (startLineNumber === 1 && endLineNumber === lineCount) {
    return {
      range: model.getFullModelRange(),
      text: lineContents.join(eol),
    }
  }

  if (endLineNumber < lineCount) {
    return {
      range: new monaco.Range(startLineNumber, 1, endLineNumber + 1, 1),
      text: `${lineContents.join(eol)}${eol}`,
    }
  }

  const previousLineNumber = startLineNumber - 1

  return {
    range: new monaco.Range(
      previousLineNumber,
      model.getLineMaxColumn(previousLineNumber),
      endLineNumber,
      model.getLineMaxColumn(endLineNumber),
    ),
    text: `${eol}${lineContents.join(eol)}`,
  }
}

function clampPosition(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  column: number,
) {
  const nextLineNumber = Math.min(Math.max(lineNumber, 1), model.getLineCount())
  const nextColumn = Math.min(Math.max(column, 1), model.getLineMaxColumn(nextLineNumber))

  return {
    column: nextColumn,
    lineNumber: nextLineNumber,
  }
}

function shiftSelection(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
  deltaLineNumber: number,
) {
  const anchor = clampPosition(
    model,
    selection.selectionStartLineNumber + deltaLineNumber,
    selection.selectionStartColumn,
  )
  const active = clampPosition(
    model,
    selection.positionLineNumber + deltaLineNumber,
    selection.positionColumn,
  )

  return new monaco.Selection(
    anchor.lineNumber,
    anchor.column,
    active.lineNumber,
    active.column,
  )
}

function isWholeLineSelection(selection: monaco.Selection) {
  const start = selection.getStartPosition()
  const end = selection.getEndPosition()

  return start.column === 1 && end.column === 1 && end.lineNumber > start.lineNumber
}

function createMovedBlockSelection(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
  startLineNumber: number,
  endLineNumber: number,
) {
  if (!isWholeLineSelection(selection)) {
    const deltaLineNumber = startLineNumber - getSelectedLineBlock(model, selection).startLineNumber

    return shiftSelection(model, selection, deltaLineNumber)
  }

  if (endLineNumber < model.getLineCount()) {
    return new monaco.Selection(
      startLineNumber,
      1,
      endLineNumber + 1,
      1,
    )
  }

  return new monaco.Selection(
    startLineNumber,
    1,
    endLineNumber,
    model.getLineMaxColumn(endLineNumber),
  )
}

export function moveEditorLines(
  editor: monaco.editor.IStandaloneCodeEditor,
  direction: LineMovementDirection,
) {
  const model = editor.getModel()
  const selection = editor.getSelection()

  if (!model || !selection) {
    return false
  }

  const { endLineNumber, startLineNumber } = getSelectedLineBlock(model, selection)
  const lastMovableLineNumber = getLastMovableLineNumber(model)
  const isMovingUp = direction === 'up'
  const isMovingDown = direction === 'down'

  if (
    startLineNumber > lastMovableLineNumber ||
    endLineNumber > lastMovableLineNumber ||
    (isMovingUp && startLineNumber === 1) ||
    (isMovingDown && endLineNumber === lastMovableLineNumber)
  ) {
    return false
  }

  const selectedLineContents = getLineContents(model, startLineNumber, endLineNumber)
  const adjacentLineNumber = isMovingUp ? startLineNumber - 1 : endLineNumber + 1
  const adjacentLineContent = model.getLineContent(adjacentLineNumber)
  const replacementStartLineNumber = isMovingUp ? adjacentLineNumber : startLineNumber
  const replacementEndLineNumber = isMovingUp ? endLineNumber : adjacentLineNumber
  const replacementLineContents = isMovingUp
    ? [...selectedLineContents, adjacentLineContent]
    : [adjacentLineContent, ...selectedLineContents]
  const replacement = getLineRangeReplacement(
    model,
    replacementStartLineNumber,
    replacementEndLineNumber,
    replacementLineContents,
  )
  const nextStartLineNumber = isMovingUp ? startLineNumber - 1 : startLineNumber + 1
  const nextEndLineNumber = isMovingUp ? endLineNumber - 1 : endLineNumber + 1

  editor.pushUndoStop()
  editor.executeEdits(LINE_MOVEMENT_EDIT_SOURCE, [
    {
      forceMoveMarkers: true,
      range: replacement.range,
      text: replacement.text,
    },
  ])
  editor.setSelection(
    createMovedBlockSelection(
      model,
      selection,
      nextStartLineNumber,
      nextEndLineNumber,
    ),
  )
  editor.revealLineInCenterIfOutsideViewport(nextStartLineNumber)
  editor.pushUndoStop()
  editor.focus()

  return true
}
