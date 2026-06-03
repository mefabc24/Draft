import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import {
  explicitCalloutTypes,
  getCalloutMarker,
  type ExplicitCalloutType,
} from '../../markdown/callouts'
import {
  createCodeBlockMarkdown,
  type CreateCodeBlockMarkdownData,
} from './createCodeBlockMarkdown'
import {
  createInlineImageMarkdown,
  createInlineLinkMarkdown,
  createInlineTagMarkdown,
  type CreateInlineImageMarkdownData,
  type CreateInlineLinkMarkdownData,
  type CreateInlineTagMarkdownData,
} from './createInlineLinkMarkdown'
import {
  createTableMarkdown,
  type CreateTableMarkdownData,
} from './createTableMarkdown'

export type EditorQuickInsertCommand =
  | 'blockquote'
  | 'bullet-list'
  | EditorQuickInsertCalloutCommand
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'horizontal-rule'
  | 'image'
  | 'link'
  | 'numbered-list'
  | 'task-list-checked'
  | 'task-list-unchecked'

export type EditorQuickInsertCalloutCommand =
  `callout-${ExplicitCalloutType}`

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

export type EditorQuickInsertTargetMode = 'insert-at-cursor' | 'replace-line'

export type EditorQuickInsertTarget = {
  column: number
  lineNumber: number
  mode: EditorQuickInsertTargetMode
}

const lineMarkers: Partial<Record<EditorQuickInsertCommand, string>> = {
  blockquote: '> ',
  ...Object.fromEntries(
    explicitCalloutTypes.map((calloutType) => [
      `callout-${calloutType}`,
      `> ${getCalloutMarker(calloutType)}\n> `,
    ]),
  ),
  'bullet-list': '- ',
  'heading-1': '# ',
  'heading-2': '## ',
  'heading-3': '### ',
  'heading-4': '#### ',
  'horizontal-rule': '---',
  'numbered-list': '1. ',
  'task-list-checked': '- [x] ',
  'task-list-unchecked': '- [ ] ',
}

function getLineMarkerSelection(
  target: EditorQuickInsertTarget,
  lineMarker: string,
) {
  const endPosition = getInsertedTextEndPosition(
    {
      column: getQuickInsertStartColumn(target),
      lineNumber: target.lineNumber,
    },
    lineMarker,
  )

  return new monaco.Selection(
    endPosition.lineNumber,
    endPosition.column,
    endPosition.lineNumber,
    endPosition.column,
  )
}

function getQuickInsertSnippet(
  command: EditorQuickInsertCommand,
  target: EditorQuickInsertTarget,
): EditorQuickInsertSnippet | null {
  const lineMarker = lineMarkers[command]
  const insertColumn = getQuickInsertStartColumn(target)

  if (lineMarker) {
    return {
      selection: getLineMarkerSelection(target, lineMarker),
      text: lineMarker,
    }
  }

  if (command === 'image') {
    return {
      selection: new monaco.Selection(
        target.lineNumber,
        insertColumn + 2,
        target.lineNumber,
        insertColumn + 10,
      ),
      text: '![alt text](image-url)',
    }
  }

  if (command === 'link') {
    return {
      selection: new monaco.Selection(
        target.lineNumber,
        insertColumn + 1,
        target.lineNumber,
        insertColumn + 10,
      ),
      text: '[link text](url)',
    }
  }

  return null
}

function getQuickInsertStartColumn(target: EditorQuickInsertTarget) {
  return target.mode === 'replace-line' ? 1 : target.column
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

export function getEditorQuickInsertTargetFromPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.IPosition | null,
): EditorQuickInsertTarget | null {
  const model = editor.getModel()

  if (
    !model ||
    !position ||
    position.lineNumber < 1 ||
    position.lineNumber > model.getLineCount()
  ) {
    return null
  }

  const maxColumn = model.getLineMaxColumn(position.lineNumber)
  const column = Math.min(Math.max(position.column, 1), maxColumn)
  const lineContent = model.getLineContent(position.lineNumber)

  return {
    column,
    lineNumber: position.lineNumber,
    mode:
      lineContent.trim().length === 0 ? 'replace-line' : 'insert-at-cursor',
  }
}

export function isEditorQuickInsertTarget(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
) {
  const model = editor.getModel()

  if (
    !model ||
    target.lineNumber < 1 ||
    target.lineNumber > model.getLineCount()
  ) {
    return false
  }

  if (target.mode === 'replace-line') {
    return isEditorQuickInsertTargetLine(editor, target.lineNumber)
  }

  const maxColumn = model.getLineMaxColumn(target.lineNumber)

  return target.column >= 1 && target.column <= maxColumn
}

export function runEditorQuickInsertCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  command: EditorQuickInsertCommand,
  options: EditorQuickInsertInsertOptions = {},
) {
  const model = editor.getModel()

  if (!model || !isEditorQuickInsertTarget(editor, target)) {
    return false
  }

  const snippet = getQuickInsertSnippet(command, target)

  if (!snippet) {
    return false
  }

  return insertQuickInsertText(
    editor,
    target,
    snippet.text,
    snippet.selection,
    options,
  )
}

function getInsertedTextEndPosition(
  startPosition: monaco.IPosition,
  text: string,
) {
  const lines = text.split('\n')
  const lastLine = lines[lines.length - 1] ?? ''

  if (lines.length === 1) {
    return {
      column: startPosition.column + text.length,
      lineNumber: startPosition.lineNumber,
    }
  }

  return {
    column: lastLine.length + 1,
    lineNumber: startPosition.lineNumber + lines.length - 1,
  }
}

function insertQuickInsertText(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  text: string,
  selection?: monaco.Selection,
  options: EditorQuickInsertInsertOptions = {},
): EditorQuickInsertInsertResult | false {
  const model = editor.getModel()

  if (!model || !isEditorQuickInsertTarget(editor, target)) {
    return false
  }

  const startPosition = {
    column: getQuickInsertStartColumn(target),
    lineNumber: target.lineNumber,
  }
  const shouldAdvanceToNextEmptyLine =
    options.advanceToNextEmptyLine && target.mode === 'replace-line'
  const insertText =
    shouldAdvanceToNextEmptyLine && !text.endsWith('\n') ? `${text}\n` : text
  const nextEmptyLineNumber = getInsertedTextEndPosition(
    startPosition,
    insertText,
  ).lineNumber

  const range =
    target.mode === 'replace-line'
      ? new monaco.Range(
          target.lineNumber,
          1,
          target.lineNumber,
          model.getLineMaxColumn(target.lineNumber),
        )
      : new monaco.Range(
          target.lineNumber,
          target.column,
          target.lineNumber,
          target.column,
        )

  editor.pushUndoStop()
  editor.executeEdits('editor-quick-insert-menu', [
    {
      forceMoveMarkers: true,
      range,
      text: insertText,
    },
  ])

  if (shouldAdvanceToNextEmptyLine) {
    editor.setPosition({
      column: 1,
      lineNumber: nextEmptyLineNumber,
    })
  } else if (selection) {
    editor.setSelection(selection)
  } else {
    editor.setPosition(getInsertedTextEndPosition(startPosition, insertText))
  }

  editor.revealLineInCenterIfOutsideViewport(
    shouldAdvanceToNextEmptyLine ? nextEmptyLineNumber : target.lineNumber,
  )
  editor.focus()
  editor.pushUndoStop()

  return {
    nextLineNumber: nextEmptyLineNumber,
  }
}

export function insertEditorQuickInsertTable(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  tableData: CreateTableMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createTableMarkdown(tableData),
    undefined,
    options,
  )
}

export function insertEditorQuickInsertCodeBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  codeBlockData: CreateCodeBlockMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createCodeBlockMarkdown(codeBlockData),
    new monaco.Selection(
      target.lineNumber + 1,
      1,
      target.lineNumber + 1,
      1,
    ),
    options,
  )
}

export function insertEditorQuickInsertImage(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  imageData: CreateInlineImageMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createInlineImageMarkdown(imageData),
    undefined,
    options,
  )
}

export function insertEditorQuickInsertLink(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  linkData: CreateInlineLinkMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createInlineLinkMarkdown(linkData),
    undefined,
    options,
  )
}

export function insertEditorQuickInsertTag(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  tagData: CreateInlineTagMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createInlineTagMarkdown(tagData),
    undefined,
    options,
  )
}
