import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

const DUPLICATE_LINE_EDIT_SOURCE = 'draft.duplicateLine'

export function duplicateCurrentLine(editor: monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel()
  const position = editor.getPosition()

  if (!model || !position) {
    return
  }

  const lineNumber = Math.min(position.lineNumber, model.getLineCount())
  const lineText = model.getLineContent(lineNumber)
  const insertColumn = model.getLineMaxColumn(lineNumber)
  const nextLineNumber = lineNumber + 1
  const nextColumn = lineText.length + 1

  editor.pushUndoStop()
  editor.executeEdits(DUPLICATE_LINE_EDIT_SOURCE, [
    {
      range: new monaco.Range(lineNumber, insertColumn, lineNumber, insertColumn),
      text: `${model.getEOL()}${lineText}`,
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
