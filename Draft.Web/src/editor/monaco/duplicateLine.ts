import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'
import {
  createIncrementedOrderedListItem,
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
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []

  for (
    let followingLineNumber = lineNumber + 1;
    followingLineNumber <= model.getLineCount();
    followingLineNumber += 1
  ) {
    const followingItem = parseMarkdownOrderedListItem(
      model.getLineContent(followingLineNumber),
    )

    if (!followingItem) {
      break
    }

    if (followingItem.blockquotePrefix !== duplicatedItem.blockquotePrefix) {
      break
    }

    if (followingItem.indentation !== duplicatedItem.indentation) {
      if (followingItem.indentation.startsWith(duplicatedItem.indentation)) {
        continue
      }

      break
    }

    if (followingItem.delimiter !== duplicatedItem.delimiter) {
      break
    }

    edits.push({
      forceMoveMarkers: true,
      range: new monaco.Range(
        followingLineNumber,
        followingItem.numberStartOffset + 1,
        followingLineNumber,
        followingItem.numberEndOffset + 1,
      ),
      text: getNextOrderedListNumber(followingItem.numberText),
    })
  }

  return edits
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
