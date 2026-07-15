import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'
import {
  createOrderedListItemWithNumber,
  parseMarkdownOrderedListItem,
  type MarkdownOrderedListItem,
} from './markdownOrderedList'

const LINE_MOVEMENT_EDIT_SOURCE = 'draft.moveLines'

export type LineMovementDirection = 'up' | 'down'

type SelectedLineBlock = {
  endLineNumber: number
  startLineNumber: number
}

type OrderedListItemCache = Map<number, MarkdownOrderedListItem | null>

type MovedLineNumberAdjustment = {
  nextNumberLength: number
  numberEndOffset: number
  numberStartOffset: number
}

function getOrderedListItem(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  cache: OrderedListItemCache,
) {
  if (cache.has(lineNumber)) {
    return cache.get(lineNumber) ?? null
  }

  const insideCodeBlock = getFencedCodeBlockContextFromLines(
    (currentLineNumber) => model.getLineContent(currentLineNumber),
    lineNumber,
  ).insideCodeBlock
  const item = insideCodeBlock
    ? null
    : parseMarkdownOrderedListItem(model.getLineContent(lineNumber))

  cache.set(lineNumber, item)
  return item
}

function isSameOrderedListLevel(
  left: MarkdownOrderedListItem,
  right: MarkdownOrderedListItem,
) {
  return (
    left.blockquotePrefix === right.blockquotePrefix &&
    left.indentation === right.indentation &&
    left.delimiter === right.delimiter
  )
}

function isSameContiguousOrderedListBlock(
  model: monaco.editor.ITextModel,
  firstLineNumber: number,
  secondLineNumber: number,
  listLevel: MarkdownOrderedListItem,
  cache: OrderedListItemCache,
) {
  const startLineNumber = Math.min(firstLineNumber, secondLineNumber)
  const endLineNumber = Math.max(firstLineNumber, secondLineNumber)

  for (
    let lineNumber = startLineNumber;
    lineNumber <= endLineNumber;
    lineNumber += 1
  ) {
    const item = getOrderedListItem(model, lineNumber, cache)

    if (!item || item.blockquotePrefix !== listLevel.blockquotePrefix) {
      return false
    }

    if (item.indentation === listLevel.indentation) {
      if (item.delimiter !== listLevel.delimiter) {
        return false
      }

      continue
    }

    if (!item.indentation.startsWith(listLevel.indentation)) {
      return false
    }
  }

  return true
}

function preserveMovedOrderedListNumbers(
  model: monaco.editor.ITextModel,
  replacementStartLineNumber: number,
  replacementLineContents: string[],
  sourceLineNumbers: number[],
) {
  const cache: OrderedListItemCache = new Map()
  const numberAdjustments = new Map<number, MovedLineNumberAdjustment>()

  const lineContents = replacementLineContents.map((lineContent, index) => {
    const targetLineNumber = replacementStartLineNumber + index
    const sourceLineNumber = sourceLineNumbers[index]

    if (sourceLineNumber === undefined) {
      return lineContent
    }

    const targetItem = getOrderedListItem(model, targetLineNumber, cache)
    const sourceItem = getOrderedListItem(model, sourceLineNumber, cache)

    if (
      !targetItem ||
      !sourceItem ||
      !isSameOrderedListLevel(targetItem, sourceItem) ||
      !isSameContiguousOrderedListBlock(
        model,
        targetLineNumber,
        sourceLineNumber,
        targetItem,
        cache,
      )
    ) {
      return lineContent
    }

    numberAdjustments.set(sourceLineNumber, {
      nextNumberLength: targetItem.numberText.length,
      numberEndOffset: sourceItem.numberEndOffset,
      numberStartOffset: sourceItem.numberStartOffset,
    })

    return createOrderedListItemWithNumber(sourceItem, targetItem.numberText)
  })

  return {
    lineContents,
    numberAdjustments,
  }
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

function getMinimalLineContentEdit(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  nextLineContent: string,
) {
  const currentLineContent = model.getLineContent(lineNumber)

  if (currentLineContent === nextLineContent) {
    return null
  }

  let commonPrefixLength = 0
  const maximumPrefixLength = Math.min(
    currentLineContent.length,
    nextLineContent.length,
  )

  while (
    commonPrefixLength < maximumPrefixLength &&
    currentLineContent[commonPrefixLength] ===
      nextLineContent[commonPrefixLength]
  ) {
    commonPrefixLength += 1
  }

  let commonSuffixLength = 0
  const maximumSuffixLength = Math.min(
    currentLineContent.length - commonPrefixLength,
    nextLineContent.length - commonPrefixLength,
  )

  while (
    commonSuffixLength < maximumSuffixLength &&
    currentLineContent[currentLineContent.length - commonSuffixLength - 1] ===
      nextLineContent[nextLineContent.length - commonSuffixLength - 1]
  ) {
    commonSuffixLength += 1
  }

  return {
    range: new monaco.Range(
      lineNumber,
      commonPrefixLength + 1,
      lineNumber,
      currentLineContent.length - commonSuffixLength + 1,
    ),
    text: nextLineContent.slice(
      commonPrefixLength,
      nextLineContent.length - commonSuffixLength,
    ),
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
  numberAdjustments: ReadonlyMap<number, MovedLineNumberAdjustment>,
) {
  const adjustColumn = (lineNumber: number, column: number) => {
    const adjustment = numberAdjustments.get(lineNumber)

    if (!adjustment) {
      return column
    }

    const offset = column - 1

    if (offset <= adjustment.numberStartOffset) {
      return column
    }

    if (offset >= adjustment.numberEndOffset) {
      return (
        column +
        adjustment.nextNumberLength -
        (adjustment.numberEndOffset - adjustment.numberStartOffset)
      )
    }

    return (
      adjustment.numberStartOffset +
      Math.min(
        offset - adjustment.numberStartOffset,
        adjustment.nextNumberLength,
      ) +
      1
    )
  }

  const anchor = clampPosition(
    model,
    selection.selectionStartLineNumber + deltaLineNumber,
    adjustColumn(
      selection.selectionStartLineNumber,
      selection.selectionStartColumn,
    ),
  )
  const active = clampPosition(
    model,
    selection.positionLineNumber + deltaLineNumber,
    adjustColumn(selection.positionLineNumber, selection.positionColumn),
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
  numberAdjustments: ReadonlyMap<number, MovedLineNumberAdjustment>,
) {
  if (!isWholeLineSelection(selection)) {
    const deltaLineNumber = startLineNumber - getSelectedLineBlock(model, selection).startLineNumber

    return shiftSelection(model, selection, deltaLineNumber, numberAdjustments)
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
  const replacementLineContents = isMovingUp
    ? [...selectedLineContents, adjacentLineContent]
    : [adjacentLineContent, ...selectedLineContents]
  const selectedLineNumbers = Array.from(
    { length: endLineNumber - startLineNumber + 1 },
    (_, index) => startLineNumber + index,
  )
  const replacementSourceLineNumbers = isMovingUp
    ? [...selectedLineNumbers, adjacentLineNumber]
    : [adjacentLineNumber, ...selectedLineNumbers]
  const normalizedReplacement = preserveMovedOrderedListNumbers(
    model,
    replacementStartLineNumber,
    replacementLineContents,
    replacementSourceLineNumbers,
  )
  const edits = normalizedReplacement.lineContents.flatMap(
    (lineContent, index) => {
      const edit = getMinimalLineContentEdit(
        model,
        replacementStartLineNumber + index,
        lineContent,
      )

      return edit ? [{ ...edit, forceMoveMarkers: true }] : []
    },
  )
  const nextStartLineNumber = isMovingUp ? startLineNumber - 1 : startLineNumber + 1
  const nextEndLineNumber = isMovingUp ? endLineNumber - 1 : endLineNumber + 1

  editor.pushUndoStop()
  editor.executeEdits(LINE_MOVEMENT_EDIT_SOURCE, edits)
  editor.setSelection(
    createMovedBlockSelection(
      model,
      selection,
      nextStartLineNumber,
      nextEndLineNumber,
      normalizedReplacement.numberAdjustments,
    ),
  )
  editor.revealLineInCenterIfOutsideViewport(nextStartLineNumber)
  editor.pushUndoStop()
  editor.focus()

  return true
}
