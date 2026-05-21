import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'

const MARKDOWN_CONTINUATION_EDIT_SOURCE = 'draft.markdownContinuation'
const LIST_PREFIX_PATTERN = /^(\s*)([-*+]|\d+[.)])\s+/u
const NUMBERED_LIST_MARKER_PATTERN = /^(\d+)([.)])$/u
const CHECKBOX_PREFIX_PATTERN = /^(\[[ xX]\]\s+)/u

type MarkdownContinuation = {
  currentPrefixLength: number
  isEmptyBlock: boolean
  nextPrefix: string
}

function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

function normalizeBlockquotePrefix(prefix: string) {
  return `${prefix.trimEnd()} `
}

function getBlockquotePrefix(line: string) {
  const match = line.match(/^(\s*(?:>\s*)+)/u)
  const currentPrefix = match?.[1] ?? ''

  return {
    currentPrefix,
    currentPrefixLength: currentPrefix.length,
    nextPrefix: currentPrefix ? normalizeBlockquotePrefix(currentPrefix) : '',
  }
}

function getNextListMarker(marker: string) {
  const numberedMatch = marker.match(NUMBERED_LIST_MARKER_PATTERN)

  if (!numberedMatch) {
    return marker
  }

  const number = Number.parseInt(numberedMatch[1] ?? '', 10)
  const delimiter = numberedMatch[2] ?? '.'

  return `${Number.isFinite(number) ? number + 1 : 1}${delimiter}`
}

function getMarkdownContinuation(lineBeforeCursor: string): MarkdownContinuation | null {
  const blockquote = getBlockquotePrefix(lineBeforeCursor)
  const lineAfterBlockquote = lineBeforeCursor.slice(blockquote.currentPrefixLength)
  const listMatch = lineAfterBlockquote.match(LIST_PREFIX_PATTERN)

  if (listMatch) {
    const indent = listMatch[1] ?? ''
    const marker = listMatch[2] ?? '-'
    const listPrefixLength = listMatch[0].length
    let currentPrefixLength = blockquote.currentPrefixLength + listPrefixLength
    let nextPrefix = `${blockquote.nextPrefix}${indent}${getNextListMarker(marker)} `
    let contentAfterPrefix = lineBeforeCursor.slice(currentPrefixLength)
    const checkboxMatch = contentAfterPrefix.match(CHECKBOX_PREFIX_PATTERN)

    if (checkboxMatch) {
      currentPrefixLength += checkboxMatch[1]?.length ?? 0
      nextPrefix = `${nextPrefix}[ ] `
      contentAfterPrefix = lineBeforeCursor.slice(currentPrefixLength)
    }

    return {
      currentPrefixLength,
      isEmptyBlock: contentAfterPrefix.trim().length === 0,
      nextPrefix,
    }
  }

  if (blockquote.currentPrefixLength > 0) {
    const contentAfterPrefix = lineBeforeCursor.slice(blockquote.currentPrefixLength)

    return {
      currentPrefixLength: blockquote.currentPrefixLength,
      isEmptyBlock: contentAfterPrefix.trim().length === 0,
      nextPrefix: blockquote.nextPrefix,
    }
  }

  return null
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

function removeCurrentPrefix(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.Position,
  prefixLength: number,
) {
  editor.pushUndoStop()
  editor.executeEdits(MARKDOWN_CONTINUATION_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        position.lineNumber,
        1,
        position.lineNumber,
        prefixLength + 1,
      ),
      text: '',
      forceMoveMarkers: true,
    },
  ])
  editor.setSelection(
    new monaco.Selection(position.lineNumber, 1, position.lineNumber, 1),
  )
  editor.pushUndoStop()
  editor.focus()
}

function insertContinuationPrefix(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  nextPrefix: string,
) {
  const nextLineNumber = position.lineNumber + 1
  const nextColumn = nextPrefix.length + 1

  editor.pushUndoStop()
  editor.executeEdits(MARKDOWN_CONTINUATION_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      ),
      text: `${model.getEOL()}${nextPrefix}`,
      forceMoveMarkers: true,
    },
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

export function continueMarkdownBlockOnEnter(
  editor: monaco.editor.IStandaloneCodeEditor,
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
  const lineBeforeCursor = line.slice(0, position.column - 1)
  const lineAfterCursor = line.slice(position.column - 1)
  const continuation = getMarkdownContinuation(lineBeforeCursor)

  if (!continuation) {
    return false
  }

  if (continuation.isEmptyBlock && lineAfterCursor.trim().length === 0) {
    removeCurrentPrefix(editor, position, continuation.currentPrefixLength)
    return true
  }

  insertContinuationPrefix(editor, model, position, continuation.nextPrefix)
  return true
}
