import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export type EditorQuickInsertCommand =
  | 'bullet-list'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'image'
  | 'numbered-list'
  | 'table'
  | 'task-list-checked'
  | 'task-list-unchecked'

type EditorQuickInsertSnippet = {
  selection?: monaco.Selection
  text: string
}

const lineMarkers: Partial<Record<EditorQuickInsertCommand, string>> = {
  'bullet-list': '- ',
  'heading-1': '# ',
  'heading-2': '## ',
  'heading-3': '### ',
  'heading-4': '#### ',
  'numbered-list': '1. ',
  'task-list-checked': '- [x] ',
  'task-list-unchecked': '- [ ] ',
}

function getQuickInsertSnippet(
  command: EditorQuickInsertCommand,
  lineNumber: number,
): EditorQuickInsertSnippet {
  const lineMarker = lineMarkers[command]

  if (lineMarker) {
    return {
      selection: new monaco.Selection(
        lineNumber,
        lineMarker.length + 1,
        lineNumber,
        lineMarker.length + 1,
      ),
      text: lineMarker,
    }
  }

  if (command === 'image') {
    return {
      selection: new monaco.Selection(lineNumber, 3, lineNumber, 11),
      text: '![alt text](image-url)',
    }
  }

  return {
    selection: new monaco.Selection(lineNumber, 3, lineNumber, 11),
    text: [
      '| Column 1 | Column 2 |',
      '|---|---|',
      '| Value 1 | Value 2 |',
    ].join('\n'),
  }
}

export function isEditorQuickInsertTargetLine(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
) {
  const model = editor.getModel()

  if (!model || lineNumber < 1 || lineNumber > model.getLineCount()) {
    return false
  }

  return model.getLineContent(lineNumber).trim().length === 0
}

export function runEditorQuickInsertCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  command: EditorQuickInsertCommand,
) {
  const model = editor.getModel()

  if (!model || !isEditorQuickInsertTargetLine(editor, lineNumber)) {
    return false
  }

  const snippet = getQuickInsertSnippet(command, lineNumber)
  const range = new monaco.Range(
    lineNumber,
    1,
    lineNumber,
    model.getLineMaxColumn(lineNumber),
  )

  editor.pushUndoStop()
  editor.executeEdits('editor-quick-insert-menu', [
    {
      forceMoveMarkers: true,
      range,
      text: snippet.text,
    },
  ])

  if (snippet.selection) {
    editor.setSelection(snippet.selection)
  }

  editor.revealLineInCenterIfOutsideViewport(lineNumber)
  editor.focus()
  editor.pushUndoStop()

  return true
}
