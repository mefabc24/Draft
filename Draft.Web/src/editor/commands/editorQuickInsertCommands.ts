import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  createCodeBlockMarkdown,
  type CreateCodeBlockMarkdownData,
} from './createCodeBlockMarkdown'
import {
  createTableMarkdown,
  type CreateTableMarkdownData,
} from './createTableMarkdown'

export type EditorQuickInsertCommand =
  | 'bullet-list'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'image'
  | 'numbered-list'
  | 'task-list-checked'
  | 'task-list-unchecked'

type EditorQuickInsertSnippet = {
  selection?: monaco.Selection
  text: string
}

export type EditorQuickInsertInsertOptions = {
  advanceToNextEmptyLine?: boolean
}

export type EditorQuickInsertInsertResult = {
  nextLineNumber: number
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
): EditorQuickInsertSnippet | null {
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

  return null
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
  options: EditorQuickInsertInsertOptions = {},
) {
  const model = editor.getModel()

  if (!model || !isEditorQuickInsertTargetLine(editor, lineNumber)) {
    return false
  }

  const snippet = getQuickInsertSnippet(command, lineNumber)

  if (!snippet) {
    return false
  }

  return replaceQuickInsertLine(
    editor,
    lineNumber,
    snippet.text,
    snippet.selection,
    options,
  )
}

function getInsertedTextEndPosition(lineNumber: number, text: string) {
  const lines = text.split('\n')
  const lastLine = lines[lines.length - 1] ?? ''

  return {
    column: lastLine.length + 1,
    lineNumber: lineNumber + lines.length - 1,
  }
}

function replaceQuickInsertLine(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  text: string,
  selection?: monaco.Selection,
  options: EditorQuickInsertInsertOptions = {},
): EditorQuickInsertInsertResult | false {
  const model = editor.getModel()

  if (!model || !isEditorQuickInsertTargetLine(editor, lineNumber)) {
    return false
  }

  const insertText =
    options.advanceToNextEmptyLine && !text.endsWith('\n') ? `${text}\n` : text
  const nextEmptyLineNumber = getInsertedTextEndPosition(
    lineNumber,
    insertText,
  ).lineNumber

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
      text: insertText,
    },
  ])

  if (options.advanceToNextEmptyLine) {
    editor.setPosition({
      column: 1,
      lineNumber: nextEmptyLineNumber,
    })
  } else if (selection) {
    editor.setSelection(selection)
  } else {
    editor.setPosition(getInsertedTextEndPosition(lineNumber, insertText))
  }

  editor.revealLineInCenterIfOutsideViewport(
    options.advanceToNextEmptyLine ? nextEmptyLineNumber : lineNumber,
  )
  editor.focus()
  editor.pushUndoStop()

  return {
    nextLineNumber: nextEmptyLineNumber,
  }
}

export function insertEditorQuickInsertTable(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  tableData: CreateTableMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return replaceQuickInsertLine(
    editor,
    lineNumber,
    createTableMarkdown(tableData),
    undefined,
    options,
  )
}

export function insertEditorQuickInsertCodeBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  codeBlockData: CreateCodeBlockMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return replaceQuickInsertLine(
    editor,
    lineNumber,
    createCodeBlockMarkdown(codeBlockData),
    new monaco.Selection(lineNumber + 1, 1, lineNumber + 1, 1),
    options,
  )
}
