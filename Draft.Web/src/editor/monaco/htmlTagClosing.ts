import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { getFencedCodeBlockContextFromLines } from '../../markdown'

const HTML_TAG_COMPLETION_EDIT_SOURCE = 'draft.htmlTagCompletion'
const HTML_TAG_MIRROR_EDIT_SOURCE = 'draft.htmlTagMirroring'

const mirroringEditors = new WeakSet<monaco.editor.IStandaloneCodeEditor>()

const voidHtmlTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

type CursorContext = {
  cursorOffset: number
  line: string
  lineAfterCursor: string
  lineBeforeCursor: string
  model: monaco.editor.ITextModel
  position: monaco.Position
  selection: monaco.Selection
}

type HtmlOpeningTag = {
  isSelfClosing: boolean
  tagEndOffset: number
  tagName: string
  tagNameEndOffset: number
  tagNameStartOffset: number
  tagStartOffset: number
}

type HtmlClosingTag = {
  tagEndOffset: number
  tagName: string
  tagNameEndOffset: number
  tagNameStartOffset: number
  tagStartOffset: number
}

function isEmptySelection(selection: monaco.Selection) {
  return (
    selection.selectionStartLineNumber === selection.positionLineNumber &&
    selection.selectionStartColumn === selection.positionColumn
  )
}

function getSingleCursorContext(
  editor: monaco.editor.IStandaloneCodeEditor,
): CursorContext | null {
  const model = editor.getModel()
  const position = editor.getPosition()
  const selections = editor.getSelections()

  if (!model || !position || !selections || selections.length !== 1) {
    return null
  }

  const selection = selections[0]

  if (!selection || !isEmptySelection(selection)) {
    return null
  }

  const line = model.getLineContent(position.lineNumber)
  const cursorOffset = position.column - 1

  return {
    cursorOffset,
    line,
    lineAfterCursor: line.slice(cursorOffset),
    lineBeforeCursor: line.slice(0, cursorOffset),
    model,
    position,
    selection,
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

function isEscaped(value: string, offset: number) {
  let slashCount = 0

  for (
    let currentOffset = offset - 1;
    currentOffset >= 0 && value[currentOffset] === '\\';
    currentOffset -= 1
  ) {
    slashCount += 1
  }

  return slashCount % 2 === 1
}

function getBacktickRunLength(value: string, offset: number) {
  let length = 0

  while (value[offset + length] === '`') {
    length += 1
  }

  return length
}

function isInsideInlineCode(line: string, offset: number) {
  let codeMarkerLength = 0
  let currentOffset = 0

  while (currentOffset < offset) {
    if (line[currentOffset] !== '`' || isEscaped(line, currentOffset)) {
      currentOffset += 1
      continue
    }

    const markerLength = getBacktickRunLength(line, currentOffset)

    if (codeMarkerLength === 0) {
      codeMarkerLength = markerLength
    } else if (markerLength === codeMarkerLength) {
      codeMarkerLength = 0
    }

    currentOffset += markerLength
  }

  return codeMarkerLength > 0
}

function isInCodeContext(
  model: monaco.editor.ITextModel,
  lineNumber: number,
  line: string,
  offset: number,
) {
  return (
    isInsideFencedCodeBlock(model, lineNumber) ||
    isInsideInlineCode(line, offset)
  )
}

function isTagNameStart(character: string) {
  return /^[A-Za-z]$/u.test(character)
}

function isTagNameCharacter(character: string) {
  return /^[A-Za-z0-9:-]$/u.test(character)
}

function isVoidHtmlTag(tagName: string) {
  return voidHtmlTags.has(tagName.toLowerCase())
}

function hasValidAttributeText(attributeText: string) {
  let quote: '"' | "'" | null = null

  for (const character of attributeText) {
    if (quote) {
      if (character === quote) {
        quote = null
      }
      if (character === '<') {
        return false
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '<' || character === '>') {
      return false
    }
  }

  return quote === null
}

function findTagEndOffset(line: string, tagStartOffset: number) {
  let quote: '"' | "'" | null = null

  for (
    let offset = tagStartOffset + 1;
    offset < line.length;
    offset += 1
  ) {
    const character = line[offset]

    if (quote) {
      if (character === quote) {
        quote = null
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      continue
    }

    if (character === '>') {
      return offset
    }
  }

  return -1
}

function parseOpeningTagCandidate(
  line: string,
  tagStartOffset: number,
  tagEndOffset: number,
): HtmlOpeningTag | null {
  if (
    line[tagStartOffset] !== '<' ||
    line[tagStartOffset + 1] === '/' ||
    line[tagStartOffset + 1] === '!' ||
    line[tagStartOffset + 1] === '?'
  ) {
    return null
  }

  const firstTagNameCharacter = line[tagStartOffset + 1] ?? ''

  if (!isTagNameStart(firstTagNameCharacter)) {
    return null
  }

  let tagNameEndOffset = tagStartOffset + 2

  while (
    tagNameEndOffset < tagEndOffset &&
    isTagNameCharacter(line[tagNameEndOffset] ?? '')
  ) {
    tagNameEndOffset += 1
  }

  const tagName = line.slice(tagStartOffset + 1, tagNameEndOffset)
  const attributeText = line.slice(tagNameEndOffset, tagEndOffset)
  const firstAttributeCharacter = attributeText.trimStart()[0]

  if (
    firstAttributeCharacter &&
    firstAttributeCharacter !== '/' &&
    attributeText[0] &&
    !/\s/u.test(attributeText[0])
  ) {
    return null
  }

  if (!hasValidAttributeText(attributeText)) {
    return null
  }

  return {
    isSelfClosing: attributeText.trimEnd().endsWith('/'),
    tagEndOffset,
    tagName,
    tagNameEndOffset,
    tagNameStartOffset: tagStartOffset + 1,
    tagStartOffset,
  }
}

function getOpeningTagBeforeOffset(
  line: string,
  cursorOffset: number,
): HtmlOpeningTag | null {
  const tagStartOffset = line.lastIndexOf('<', cursorOffset - 1)

  if (tagStartOffset === -1 || isInsideInlineCode(line, tagStartOffset)) {
    return null
  }

  const characterBeforeTag = line[tagStartOffset - 1]

  if (characterBeforeTag === '\\') {
    return null
  }

  return parseOpeningTagCandidate(line, tagStartOffset, cursorOffset)
}

function parseOpeningTagAt(
  line: string,
  tagStartOffset: number,
): HtmlOpeningTag | null {
  const tagEndOffset = findTagEndOffset(line, tagStartOffset)

  if (tagEndOffset === -1) {
    return null
  }

  return parseOpeningTagCandidate(line, tagStartOffset, tagEndOffset)
}

function parseClosingTagAt(
  line: string,
  tagStartOffset: number,
): HtmlClosingTag | null {
  if (
    line[tagStartOffset] !== '<' ||
    line[tagStartOffset + 1] !== '/' ||
    !isTagNameStart(line[tagStartOffset + 2] ?? '')
  ) {
    return null
  }

  const tagEndOffset = findTagEndOffset(line, tagStartOffset)

  if (tagEndOffset === -1) {
    return null
  }

  let tagNameEndOffset = tagStartOffset + 3

  while (
    tagNameEndOffset < tagEndOffset &&
    isTagNameCharacter(line[tagNameEndOffset] ?? '')
  ) {
    tagNameEndOffset += 1
  }

  if (line.slice(tagNameEndOffset, tagEndOffset).trim().length > 0) {
    return null
  }

  return {
    tagEndOffset,
    tagName: line.slice(tagStartOffset + 2, tagNameEndOffset),
    tagNameEndOffset,
    tagNameStartOffset: tagStartOffset + 2,
    tagStartOffset,
  }
}

function getClosingTagAtStart(value: string): HtmlClosingTag | null {
  return parseClosingTagAt(value, 0)
}

function shouldInsertClosingTag(
  openingTag: HtmlOpeningTag,
  lineAfterOpeningGreaterThan: string,
) {
  return (
    !openingTag.isSelfClosing &&
    !isVoidHtmlTag(openingTag.tagName) &&
    !getClosingTagAtStart(lineAfterOpeningGreaterThan)
  )
}

function setCursor(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  column: number,
) {
  editor.setSelection(
    new monaco.Selection(lineNumber, column, lineNumber, column),
  )
  editor.focus()
}

export function completeMarkdownHtmlOpeningBracket(
  editor: monaco.editor.IStandaloneCodeEditor,
  beforeEdit?: () => void,
) {
  const context = getSingleCursorContext(editor)

  if (!context) {
    return false
  }

  if (
    isInCodeContext(
      context.model,
      context.position.lineNumber,
      context.line,
      context.cursorOffset,
    )
  ) {
    return false
  }

  beforeEdit?.()

  editor.pushUndoStop()
  editor.executeEdits(HTML_TAG_COMPLETION_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        context.position.lineNumber,
        context.position.column,
        context.position.lineNumber,
        context.position.column,
      ),
      text: '<>',
      forceMoveMarkers: true,
    },
  ])
  setCursor(editor, context.position.lineNumber, context.position.column + 1)
  editor.pushUndoStop()

  return true
}

export function closeMarkdownHtmlTagOnGreaterThan(
  editor: monaco.editor.IStandaloneCodeEditor,
  beforeEdit?: () => void,
) {
  const context = getSingleCursorContext(editor)

  if (!context) {
    return false
  }

  if (
    isInCodeContext(
      context.model,
      context.position.lineNumber,
      context.line,
      context.cursorOffset,
    )
  ) {
    return false
  }

  const openingTag = getOpeningTagBeforeOffset(
    context.line,
    context.cursorOffset,
  )

  if (!openingTag) {
    return false
  }

  const hasExistingGreaterThan = context.lineAfterCursor.startsWith('>')
  const lineAfterGreaterThan = hasExistingGreaterThan
    ? context.lineAfterCursor.slice(1)
    : context.lineAfterCursor
  const shouldAddClosingTag = shouldInsertClosingTag(
    openingTag,
    lineAfterGreaterThan,
  )
  const insertedText = `${hasExistingGreaterThan ? '' : '>'}${
    shouldAddClosingTag ? `</${openingTag.tagName}>` : ''
  }`
  const insertionColumn = hasExistingGreaterThan
    ? context.position.column + 1
    : context.position.column

  beforeEdit?.()

  if (insertedText.length > 0) {
    editor.pushUndoStop()
    editor.executeEdits(HTML_TAG_COMPLETION_EDIT_SOURCE, [
      {
        range: new monaco.Range(
          context.position.lineNumber,
          insertionColumn,
          context.position.lineNumber,
          insertionColumn,
        ),
        text: insertedText,
        forceMoveMarkers: true,
      },
    ])
    editor.pushUndoStop()
  }

  setCursor(
    editor,
    context.position.lineNumber,
    context.position.column + 1,
  )

  return true
}

export function completeMarkdownHtmlSelfClosingSlash(
  editor: monaco.editor.IStandaloneCodeEditor,
  beforeEdit?: () => void,
) {
  const context = getSingleCursorContext(editor)

  if (!context || !context.lineAfterCursor.startsWith('>')) {
    return false
  }

  if (
    isInCodeContext(
      context.model,
      context.position.lineNumber,
      context.line,
      context.cursorOffset,
    )
  ) {
    return false
  }

  const openingTag = getOpeningTagBeforeOffset(
    context.line,
    context.cursorOffset,
  )

  if (!openingTag || openingTag.isSelfClosing) {
    return false
  }

  const closingTagAfterGreaterThan = getClosingTagAtStart(
    context.lineAfterCursor.slice(1),
  )
  const slashText = /\s$/u.test(context.lineBeforeCursor) ? '/>' : ' />'
  const closingTagLength = closingTagAfterGreaterThan
    ? closingTagAfterGreaterThan.tagEndOffset + 1
    : 0
  const replaceEndColumn = context.position.column + 1 + closingTagLength

  beforeEdit?.()

  editor.pushUndoStop()
  editor.executeEdits(HTML_TAG_COMPLETION_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        context.position.lineNumber,
        context.position.column,
        context.position.lineNumber,
        replaceEndColumn,
      ),
      text: slashText,
      forceMoveMarkers: true,
    },
  ])
  setCursor(
    editor,
    context.position.lineNumber,
    context.position.column + slashText.length,
  )
  editor.pushUndoStop()

  return true
}

function findOpeningTagAtCursorInName(
  line: string,
  cursorOffset: number,
): HtmlOpeningTag | null {
  const tagStartOffset = line.lastIndexOf('<', cursorOffset - 1)

  if (tagStartOffset === -1 || line[tagStartOffset + 1] === '/') {
    return null
  }

  const openingTag = parseOpeningTagAt(line, tagStartOffset)

  if (
    !openingTag ||
    cursorOffset <= openingTag.tagNameStartOffset ||
    cursorOffset > openingTag.tagNameEndOffset
  ) {
    return null
  }

  return openingTag
}

function findClosingTagAtCursorInName(
  line: string,
  cursorOffset: number,
): HtmlClosingTag | null {
  const tagStartOffset = line.lastIndexOf('</', cursorOffset - 1)

  if (tagStartOffset === -1) {
    return null
  }

  const closingTag = parseClosingTagAt(line, tagStartOffset)

  if (
    !closingTag ||
    cursorOffset <= closingTag.tagNameStartOffset ||
    cursorOffset > closingTag.tagNameEndOffset
  ) {
    return null
  }

  return closingTag
}

function findStructurallyPairedClosingTagAfterOpening(
  line: string,
  openingTag: HtmlOpeningTag,
) {
  let searchOffset = openingTag.tagEndOffset + 1
  let nestedOpeningDepth = 0

  while (searchOffset < line.length) {
    const tagStartOffset = line.indexOf('<', searchOffset)

    if (tagStartOffset === -1) {
      return null
    }

    const closingTag = parseClosingTagAt(line, tagStartOffset)

    if (closingTag) {
      if (nestedOpeningDepth === 0) {
        return closingTag
      }

      nestedOpeningDepth -= 1
      searchOffset = closingTag.tagEndOffset + 1
      continue
    }

    const nestedOpeningTag = parseOpeningTagAt(line, tagStartOffset)

    if (nestedOpeningTag) {
      if (
        !nestedOpeningTag.isSelfClosing &&
        !isVoidHtmlTag(nestedOpeningTag.tagName)
      ) {
        nestedOpeningDepth += 1
      }

      searchOffset = nestedOpeningTag.tagEndOffset + 1
      continue
    }

    const tagEndOffset = findTagEndOffset(line, tagStartOffset)
    searchOffset = tagEndOffset === -1 ? tagStartOffset + 1 : tagEndOffset + 1
  }

  return null
}

function findStructurallyPairedOpeningTagBeforeClosing(
  line: string,
  closingTag: HtmlClosingTag,
) {
  const openingStack: HtmlOpeningTag[] = []
  let searchOffset = 0

  while (searchOffset < closingTag.tagStartOffset) {
    const tagStartOffset = line.indexOf('<', searchOffset)

    if (tagStartOffset === -1 || tagStartOffset >= closingTag.tagStartOffset) {
      break
    }

    const nestedClosingTag = parseClosingTagAt(line, tagStartOffset)

    if (nestedClosingTag) {
      openingStack.pop()
      searchOffset = nestedClosingTag.tagEndOffset + 1
      continue
    }

    const openingTag = parseOpeningTagAt(line, tagStartOffset)

    if (openingTag) {
      if (!openingTag.isSelfClosing && !isVoidHtmlTag(openingTag.tagName)) {
        openingStack.push(openingTag)
      }

      searchOffset = openingTag.tagEndOffset + 1
      continue
    }

    const tagEndOffset = findTagEndOffset(line, tagStartOffset)
    searchOffset = tagEndOffset === -1 ? tagStartOffset + 1 : tagEndOffset + 1
  }

  return openingStack.at(-1) ?? null
}

function replaceTagName(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  tag: Pick<HtmlOpeningTag | HtmlClosingTag, 'tagNameEndOffset' | 'tagNameStartOffset'>,
  tagName: string,
) {
  editor.executeEdits(HTML_TAG_MIRROR_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        lineNumber,
        tag.tagNameStartOffset + 1,
        lineNumber,
        tag.tagNameEndOffset + 1,
      ),
      text: tagName,
      forceMoveMarkers: true,
    },
  ])
}

function removeClosingTag(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  closingTag: HtmlClosingTag,
) {
  editor.executeEdits(HTML_TAG_MIRROR_EDIT_SOURCE, [
    {
      range: new monaco.Range(
        lineNumber,
        closingTag.tagStartOffset + 1,
        lineNumber,
        closingTag.tagEndOffset + 2,
      ),
      text: '',
      forceMoveMarkers: true,
    },
  ])
}

function mirrorOpeningTagName(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  line: string,
  openingTag: HtmlOpeningTag,
) {
  const pairedClosingTag = findStructurallyPairedClosingTagAfterOpening(
    line,
    openingTag,
  )

  if (!pairedClosingTag) {
    return false
  }

  if (openingTag.isSelfClosing || isVoidHtmlTag(openingTag.tagName)) {
    removeClosingTag(editor, lineNumber, pairedClosingTag)
    return true
  }

  if (pairedClosingTag.tagName === openingTag.tagName) {
    return false
  }

  replaceTagName(editor, lineNumber, pairedClosingTag, openingTag.tagName)
  return true
}

function mirrorClosingTagName(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  line: string,
  closingTag: HtmlClosingTag,
) {
  if (isVoidHtmlTag(closingTag.tagName)) {
    return false
  }

  const pairedOpeningTag = findStructurallyPairedOpeningTagBeforeClosing(
    line,
    closingTag,
  )

  if (!pairedOpeningTag || pairedOpeningTag.tagName === closingTag.tagName) {
    return false
  }

  replaceTagName(editor, lineNumber, pairedOpeningTag, closingTag.tagName)
  return true
}

export function mirrorMarkdownHtmlTagNameOnContentChange(
  editor: monaco.editor.IStandaloneCodeEditor,
  event: monaco.editor.IModelContentChangedEvent,
) {
  if (
    mirroringEditors.has(editor) ||
    event.isFlush ||
    event.isUndoing ||
    event.isRedoing ||
    event.changes.length !== 1
  ) {
    return false
  }

  const context = getSingleCursorContext(editor)

  if (!context) {
    return false
  }

  if (
    isInCodeContext(
      context.model,
      context.position.lineNumber,
      context.line,
      context.cursorOffset,
    )
  ) {
    return false
  }

  const openingTag = findOpeningTagAtCursorInName(
    context.line,
    context.cursorOffset,
  )
  const closingTag = openingTag
    ? null
    : findClosingTagAtCursorInName(context.line, context.cursorOffset)

  if (!openingTag && !closingTag) {
    return false
  }

  mirroringEditors.add(editor)

  try {
    if (openingTag) {
      return mirrorOpeningTagName(
        editor,
        context.position.lineNumber,
        context.line,
        openingTag,
      )
    }

    if (!closingTag) {
      return false
    }

    return mirrorClosingTagName(
      editor,
      context.position.lineNumber,
      context.line,
      closingTag,
    )
  } finally {
    mirroringEditors.delete(editor)
  }
}
