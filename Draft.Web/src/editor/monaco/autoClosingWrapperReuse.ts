import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  draftAutoClosingBracketPairs,
  draftAutoClosingQuotePairs,
  draftHtmlAnglePair,
  type AutoClosingWrapperPair,
} from './autoClosingWrapperPairs'

const AUTO_CLOSING_WRAPPER_REUSE_EDIT_SOURCE = 'draft.autoClosingWrapperReuse'

type ReusableClosingWrapperContext = {
  offset: number
  position: monaco.Position
  selectionIndex: number
}

function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

function findPairForTypedCharacter(
  pairs: AutoClosingWrapperPair[],
  typedCharacter: string,
) {
  return pairs.find((pair) => pair.open === typedCharacter) ?? null
}

function getReusableClosingWrapperContext(
  model: monaco.editor.ITextModel,
  selection: monaco.Selection,
  pair: AutoClosingWrapperPair,
  selectionIndex: number,
): ReusableClosingWrapperContext | null {
  if (!isEmptySelection(selection)) {
    return null
  }

  const position = new monaco.Position(
    selection.positionLineNumber,
    selection.positionColumn,
  )
  const line = model.getLineContent(position.lineNumber)
  const cursorOffset = position.column - 1

  if (line.slice(cursorOffset, cursorOffset + pair.close.length) !== pair.close) {
    return null
  }

  return {
    offset: model.getOffsetAt(position),
    position,
    selectionIndex,
  }
}

function getUniqueEditContexts(
  contexts: ReusableClosingWrapperContext[],
) {
  const usedOffsets = new Set<number>()
  const uniqueContexts: ReusableClosingWrapperContext[] = []

  for (const context of contexts) {
    if (usedOffsets.has(context.offset)) {
      continue
    }

    usedOffsets.add(context.offset)
    uniqueContexts.push(context)
  }

  return uniqueContexts
}

function getInsertedTextLengthBeforeOrAtOffset(
  editContexts: ReusableClosingWrapperContext[],
  offset: number,
  insertedTextLength: number,
) {
  return (
    editContexts.filter((context) => context.offset <= offset).length *
    insertedTextLength
  )
}

function getNextSelections(
  model: monaco.editor.ITextModel,
  contexts: ReusableClosingWrapperContext[],
  editContexts: ReusableClosingWrapperContext[],
  insertedTextLength: number,
) {
  return [...contexts]
    .sort((left, right) => left.selectionIndex - right.selectionIndex)
    .map((context) => {
      const position = model.getPositionAt(
        context.offset +
          getInsertedTextLengthBeforeOrAtOffset(
            editContexts,
            context.offset,
            insertedTextLength,
          ),
      )

      return new monaco.Selection(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      )
    })
}

export function reuseExistingClosingWrapper(
  editor: monaco.editor.IStandaloneCodeEditor,
  pair: AutoClosingWrapperPair,
  beforeEdit?: () => void,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return false
  }

  const contexts = selections.map((selection, selectionIndex) =>
    getReusableClosingWrapperContext(model, selection, pair, selectionIndex),
  )

  if (
    contexts.some((context) => context === null)
  ) {
    return false
  }

  const reusableContexts = contexts.filter(
    (context): context is ReusableClosingWrapperContext => context !== null,
  )
  const editContexts = getUniqueEditContexts(reusableContexts)

  beforeEdit?.()

  editor.pushUndoStop()
  editor.executeEdits(
    AUTO_CLOSING_WRAPPER_REUSE_EDIT_SOURCE,
    editContexts.map((context) => ({
      range: new monaco.Range(
        context.position.lineNumber,
        context.position.column,
        context.position.lineNumber,
        context.position.column,
      ),
      text: pair.open,
      forceMoveMarkers: true,
    })),
  )
  editor.setSelections(
    getNextSelections(
      model,
      reusableContexts,
      editContexts,
      pair.open.length,
    ),
  )
  editor.pushUndoStop()
  editor.focus()

  return true
}

export function reuseExistingClosingBracketPair(
  editor: monaco.editor.IStandaloneCodeEditor,
  typedCharacter: string,
  beforeEdit?: () => void,
) {
  const pair = findPairForTypedCharacter(
    draftAutoClosingBracketPairs,
    typedCharacter,
  )

  return pair ? reuseExistingClosingWrapper(editor, pair, beforeEdit) : false
}

export function reuseExistingClosingQuotePair(
  editor: monaco.editor.IStandaloneCodeEditor,
  typedCharacter: string,
  beforeEdit?: () => void,
) {
  const pair = findPairForTypedCharacter(
    draftAutoClosingQuotePairs,
    typedCharacter,
  )

  return pair ? reuseExistingClosingWrapper(editor, pair, beforeEdit) : false
}

export function reuseExistingClosingHtmlAnglePair(
  editor: monaco.editor.IStandaloneCodeEditor,
  beforeEdit?: () => void,
) {
  return reuseExistingClosingWrapper(editor, draftHtmlAnglePair, beforeEdit)
}
