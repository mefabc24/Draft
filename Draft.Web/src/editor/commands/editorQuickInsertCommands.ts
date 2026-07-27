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
  createExpanderMarkdown,
  createInlineImageMarkdown,
  createInlineLinkMarkdown,
  createInlineTagMarkdown,
  type CreateExpanderMarkdownData,
  type CreateInlineImageMarkdownData,
  type CreateInlineLinkMarkdownData,
  type CreateInlineTagMarkdownData,
} from './createInlineLinkMarkdown'
import {
  createTableMarkdown,
  type CreateTableMarkdownData,
} from './createTableMarkdown'
import {
  createKeyboardMarkdown,
  type CreateKeyboardMarkdownData,
} from './createKeyboardMarkdown'

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
  insertAsBlock?: boolean
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
  startPosition: monaco.IPosition,
  lineMarker: string,
) {
  const endPosition = getInsertedTextEndPosition(startPosition, lineMarker)

  return new monaco.Selection(
    endPosition.lineNumber,
    endPosition.column,
    endPosition.lineNumber,
    endPosition.column,
  )
}

function getQuickInsertSnippet(
  command: EditorQuickInsertCommand,
  startPosition: monaco.IPosition,
): EditorQuickInsertSnippet | null {
  const lineMarker = lineMarkers[command]

  if (lineMarker) {
    return {
      selection:
        command === 'horizontal-rule'
          ? undefined
          : getLineMarkerSelection(startPosition, lineMarker),
      text: lineMarker,
    }
  }

  if (command === 'image') {
    return {
      selection: new monaco.Selection(
        startPosition.lineNumber,
        startPosition.column + 2,
        startPosition.lineNumber,
        startPosition.column + 10,
      ),
      text: '![alt text](image-url)',
    }
  }

  if (command === 'link') {
    return {
      selection: new monaco.Selection(
        startPosition.lineNumber,
        startPosition.column + 1,
        startPosition.lineNumber,
        startPosition.column + 10,
      ),
      text: '[link text](url)',
    }
  }

  return null
}

function getQuickInsertStartColumn(target: EditorQuickInsertTarget) {
  return target.mode === 'replace-line' ? 1 : target.column
}

function getQuickInsertContentStartPosition(
  target: EditorQuickInsertTarget,
  insertAsBlock: boolean,
) {
  if (insertAsBlock && target.mode === 'insert-at-cursor') {
    return {
      column: 1,
      lineNumber: target.lineNumber + 2,
    }
  }

  return {
    column: getQuickInsertStartColumn(target),
    lineNumber: target.lineNumber,
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

  const startPosition = getQuickInsertContentStartPosition(
    target,
    options.insertAsBlock === true,
  )
  const snippet = getQuickInsertSnippet(command, startPosition)

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

  const editStartPosition = {
    column: getQuickInsertStartColumn(target),
    lineNumber: target.lineNumber,
  }
  const insertAsSeparateBlock =
    options.insertAsBlock === true && target.mode === 'insert-at-cursor'
  const shouldAdvanceToNextEmptyLine =
    options.advanceToNextEmptyLine === true
  let insertText: string
  let nextEmptyLineNumber: number

  if (insertAsSeparateBlock) {
    const nextLineIsEmpty =
      target.lineNumber < model.getLineCount() &&
      model.getLineContent(target.lineNumber + 1).trim().length === 0
    const trailingLineBreak = nextLineIsEmpty ? '' : '\n'

    editStartPosition.column = model.getLineMaxColumn(target.lineNumber)
    insertText = `\n\n${text}${trailingLineBreak}`
    nextEmptyLineNumber =
      target.lineNumber + 2 + text.split('\n').length
  } else {
    insertText =
      shouldAdvanceToNextEmptyLine && !text.endsWith('\n')
        ? `${text}\n`
        : text
    nextEmptyLineNumber = getInsertedTextEndPosition(
      editStartPosition,
      insertText,
    ).lineNumber
  }

  const range =
    target.mode === 'replace-line'
      ? new monaco.Range(
          target.lineNumber,
          1,
          target.lineNumber,
          model.getLineMaxColumn(target.lineNumber),
        )
      : new monaco.Range(
          editStartPosition.lineNumber,
          editStartPosition.column,
          editStartPosition.lineNumber,
          editStartPosition.column,
        )

  editor.pushUndoStop()
  editor.executeEdits('editor-quick-insert-menu', [
    {
      forceMoveMarkers: true,
      range,
      text: insertText,
    },
  ])

  if (shouldAdvanceToNextEmptyLine || (insertAsSeparateBlock && !selection)) {
    editor.setPosition({
      column: 1,
      lineNumber: nextEmptyLineNumber,
    })
  } else if (selection) {
    editor.setSelection(selection)
  } else {
    editor.setPosition(
      getInsertedTextEndPosition(editStartPosition, insertText),
    )
  }

  editor.revealLineInCenterIfOutsideViewport(
    shouldAdvanceToNextEmptyLine || insertAsSeparateBlock
      ? nextEmptyLineNumber
      : target.lineNumber,
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
    {
      ...options,
      insertAsBlock: true,
    },
  )
}

export function insertEditorQuickInsertCodeBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  codeBlockData: CreateCodeBlockMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  const startPosition = getQuickInsertContentStartPosition(
    target,
    true,
  )

  return insertQuickInsertText(
    editor,
    target,
    createCodeBlockMarkdown(codeBlockData),
    new monaco.Selection(
      startPosition.lineNumber + 1,
      1,
      startPosition.lineNumber + 1,
      1,
    ),
    {
      ...options,
      insertAsBlock: true,
    },
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

export function insertEditorQuickInsertExpander(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  expanderData: CreateExpanderMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createExpanderMarkdown(expanderData),
    undefined,
    {
      ...options,
      insertAsBlock: true,
    },
  )
}

export function insertEditorQuickInsertKeyboard(
  editor: monaco.editor.IStandaloneCodeEditor,
  target: EditorQuickInsertTarget,
  keyboardData: CreateKeyboardMarkdownData,
  options: EditorQuickInsertInsertOptions = {},
) {
  return insertQuickInsertText(
    editor,
    target,
    createKeyboardMarkdown(keyboardData),
    undefined,
    options,
  )
}
