import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'

const MARKDOWN_LIST_INDENTATION_EDIT_SOURCE = 'draft.markdownListIndentation'
const LIST_INDENTATION = '  '
const LIST_PREFIX_PATTERN =
  /^(\s*)((?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+))\s*$/u

type EmptyMarkdownListItem = {
  blockquotePrefixLength: number
  indentationLength: number
  listPrefixLength: number
}

function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

function getBlockquotePrefixLength(line: string) {
  return line.match(/^(\s*(?:>\s*)+)/u)?.[1]?.length ?? 0
}

function getEmptyMarkdownListItem(
  line: string,
  column: number,
): EmptyMarkdownListItem | null {
  const blockquotePrefixLength = getBlockquotePrefixLength(line)
  const lineAfterBlockquote = line.slice(blockquotePrefixLength)
  const listMatch = lineAfterBlockquote.match(LIST_PREFIX_PATTERN)

  if (!listMatch) {
    return null
  }

  const indentationLength = listMatch[1]?.length ?? 0
  const listPrefixLength = listMatch[2]?.length ?? 0
  const cursorOffset = column - 1
  const listPrefixEndOffset =
    blockquotePrefixLength + indentationLength + listPrefixLength

  if (cursorOffset < listPrefixEndOffset) {
    return null
  }

  return {
    blockquotePrefixLength,
    indentationLength,
    listPrefixLength,
  }
}

function isInsideFencedCodeBlock(
  model: monaco.editor.ITextModel,
  lineNumber: number,
) {
  return getFencedCodeBlockContextFromLines(
    (currentLineNumber) => model.getLineContent(currentLineNumber),
    lineNumber,
  ).insideCodeBlock
}

export function indentEmptyMarkdownListItemOnTab(
  editor: monaco.editor.IStandaloneCodeEditor,
  beforeEdit?: () => void,
) {
  const model = editor.getModel()
  const position = editor.getPosition()
  const selections = editor.getSelections()

  if (!model || !position || !selections || selections.length !== 1) {
    return false
  }

  const selection = selections[0]

  if (!selection || !isEmptySelection(selection)) {
    return false
  }

  if (isInsideFencedCodeBlock(model, position.lineNumber)) {
    return false
  }

  const line = model.getLineContent(position.lineNumber)
  const listItem = getEmptyMarkdownListItem(line, position.column)

  if (!listItem) {
    return false
  }

  beforeEdit?.()

  const indentationColumn = listItem.blockquotePrefixLength + 1
  const nextColumn =
    listItem.blockquotePrefixLength +
    LIST_INDENTATION.length +
    listItem.indentationLength +
    listItem.listPrefixLength +
    1

  editor.pushUndoStop()
  editor.executeEdits(MARKDOWN_LIST_INDENTATION_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        position.lineNumber,
        indentationColumn,
        position.lineNumber,
        indentationColumn,
      ),
      text: LIST_INDENTATION,
      forceMoveMarkers: true,
    },
  ])
  editor.setSelection(
    new monaco.Selection(
      position.lineNumber,
      nextColumn,
      position.lineNumber,
      nextColumn,
    ),
  )
  editor.revealPositionInCenterIfOutsideViewport({
    lineNumber: position.lineNumber,
    column: nextColumn,
  })
  editor.pushUndoStop()
  editor.focus()

  return true
}
