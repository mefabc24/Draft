import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'
import {
  createIncrementedOrderedListItem,
  getFollowingOrderedListRenumberings,
  getNextOrderedListNumber,
  parseMarkdownOrderedListItem,
  type MarkdownOrderedListItem,
} from './markdownOrderedList'

const DUPLICATE_LINE_EDIT_SOURCE = 'draft.duplicateLine'

function isInsideFencedCodeBlock(
  model: monaco.editor.ITextModel,
  lineNumber: number,
) {
  return getFencedCodeBlockContextFromLines(
    (currentLineNumber) => model.getLineContent(currentLineNumber),
    lineNumber,
  ).insideCodeBlock
}

function getFollowingOrderedListRenumberEdits(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  duplicatedItem: MarkdownOrderedListItem,
) {
  return getFollowingOrderedListRenumberings(
    (followingLineNumber) => model.getLineContent(followingLineNumber),
    model.getLineCount(),
    lineNumber,
    duplicatedItem,
    getNextOrderedListNumber(duplicatedItem.numberText),
  ).map(({ item, lineNumber: followingLineNumber, numberText }) => ({
      forceMoveMarkers: true,
      range: new monaco.Range(
        followingLineNumber,
        item.numberStartOffset + 1,
        followingLineNumber,
        item.numberEndOffset + 1,
      ),
      text: numberText,
    }))
}

export function duplicateCurrentLine(editor: monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel()
  const position = editor.getPosition()

  if (!model || !position) {
    return
  }

  const lineNumber = Math.min(position.lineNumber, model.getLineCount())
  const lineText = model.getLineContent(lineNumber)
  const orderedListItem = isInsideFencedCodeBlock(model, lineNumber)
    ? null
    : parseMarkdownOrderedListItem(lineText)
  const duplicatedLineText = orderedListItem
    ? createIncrementedOrderedListItem(orderedListItem)
    : lineText
  const insertColumn = model.getLineMaxColumn(lineNumber)
  const nextLineNumber = lineNumber + 1
  const nextColumn = duplicatedLineText.length + 1
  const followingRenumberEdits = orderedListItem
    ? getFollowingOrderedListRenumberEdits(model, lineNumber, orderedListItem)
    : []

  editor.pushUndoStop()
  editor.executeEdits(DUPLICATE_LINE_EDIT_SOURCE, [
    {
      range: new monaco.Range(lineNumber, insertColumn, lineNumber, insertColumn),
      text: `${model.getEOL()}${duplicatedLineText}`,
      forceMoveMarkers: true,
    },
    ...followingRenumberEdits,
  ])
  editor.setSelection(
    new monaco.Selection(nextLineNumber, nextColumn, nextLineNumber, nextColumn),
  )
  editor.revealPositionInCenterIfOutsideViewport({
    lineNumber: nextLineNumber,
    column: nextColumn,
  })
  editor.pushUndoStop()
  editor.focus()
}
