import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

const TEXT_CASING_EDIT_SOURCE = 'draft.textCasing'

type TextCase = 'lowercase' | 'uppercase'

type OffsetTextEdit = {
  endOffset: number
  mapOffsetWithin: (relativeOffset: number) => number
  range: monaco.Range
  startOffset: number
  text: string
}

type OffsetRange = {
  endOffset: number
  startOffset: number
}

function consumeWhitespace(text: string, offset: number) {
  let nextOffset = offset

  while (nextOffset < text.length && /\s/u.test(text[nextOffset])) {
    nextOffset += 1
  }

  return nextOffset
}

function getMarkdownContentStartOffset(lineText: string) {
  let offset = consumeWhitespace(lineText, 0)

  while (lineText[offset] === '>') {
    offset = consumeWhitespace(lineText, offset + 1)
  }

  const heading = lineText.slice(offset).match(/^#{1,6}(?=\s)/u)

  if (heading) {
    offset = consumeWhitespace(lineText, offset + heading[0].length)
  }

  const listMarker = lineText
    .slice(offset)
    .match(/^(?:[-+*]|\d+[.)])(?=\s)/u)

  if (listMarker) {
    offset = consumeWhitespace(lineText, offset + listMarker[0].length)

    const taskMarker = lineText.slice(offset).match(/^\[[ xX]\](?=\s|$)/u)

    if (taskMarker) {
      offset = consumeWhitespace(lineText, offset + taskMarker[0].length)
    }
  }

  const calloutMarker = lineText
    .slice(offset)
    .match(/^\[![\p{L}\p{N}_-]+\][+-]?(?=\s|$)/u)

  if (calloutMarker) {
    offset = consumeWhitespace(lineText, offset + calloutMarker[0].length)
  }

  return offset
}

function findFirstAlphabeticalCharacter(lineText: string) {
  const contentStartOffset = getMarkdownContentStartOffset(lineText)
  const match = lineText.slice(contentStartOffset).match(/\p{L}/u)

  if (!match || match.index === undefined) {
    return null
  }

  return {
    character: match[0],
    offset: contentStartOffset + match.index,
  }
}

function toggleCharacterCase(character: string) {
  const lowercase = character.toLowerCase()
  const uppercase = character.toUpperCase()

  if (lowercase === uppercase) {
    return character
  }

  return character === uppercase ? lowercase : uppercase
}

function transformCase(text: string, textCase: TextCase) {
  return textCase === 'uppercase' ? text.toUpperCase() : text.toLowerCase()
}

function mergeOffsetRanges(ranges: OffsetRange[]) {
  const sortedRanges = [...ranges].sort(
    (left, right) =>
      left.startOffset - right.startOffset || left.endOffset - right.endOffset,
  )
  const mergedRanges: OffsetRange[] = []

  for (const range of sortedRanges) {
    const previousRange = mergedRanges.at(-1)

    if (!previousRange || range.startOffset > previousRange.endOffset) {
      mergedRanges.push({ ...range })
      continue
    }

    previousRange.endOffset = Math.max(previousRange.endOffset, range.endOffset)
  }

  return mergedRanges
}

function mapOffsetThroughEdits(originalOffset: number, edits: OffsetTextEdit[]) {
  let delta = 0

  for (const edit of edits) {
    if (originalOffset <= edit.startOffset) {
      return originalOffset + delta
    }

    if (originalOffset < edit.endOffset) {
      return (
        edit.startOffset +
        delta +
        edit.mapOffsetWithin(originalOffset - edit.startOffset)
      )
    }

    delta += edit.text.length - (edit.endOffset - edit.startOffset)
  }

  return originalOffset + delta
}

function applyTextEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: OffsetTextEdit[],
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || edits.length === 0) {
    return false
  }

  const sortedEdits = [...edits].sort(
    (left, right) =>
      left.startOffset - right.startOffset || left.endOffset - right.endOffset,
  )
  const selectionOffsets = selections.map((selection) => ({
    anchorOffset: model.getOffsetAt({
      column: selection.selectionStartColumn,
      lineNumber: selection.selectionStartLineNumber,
    }),
    activeOffset: model.getOffsetAt({
      column: selection.positionColumn,
      lineNumber: selection.positionLineNumber,
    }),
  }))

  editor.pushUndoStop()
  const editsApplied = editor.executeEdits(
    TEXT_CASING_EDIT_SOURCE,
    [...sortedEdits].reverse().map((edit) => ({
      forceMoveMarkers: true,
      range: edit.range,
      text: edit.text,
    })),
  )

  if (!editsApplied) {
    return false
  }

  editor.setSelections(
    selectionOffsets.map(({ activeOffset, anchorOffset }) => {
      const nextAnchor = model.getPositionAt(
        mapOffsetThroughEdits(anchorOffset, sortedEdits),
      )
      const nextActive = model.getPositionAt(
        mapOffsetThroughEdits(activeOffset, sortedEdits),
      )

      return new monaco.Selection(
        nextAnchor.lineNumber,
        nextAnchor.column,
        nextActive.lineNumber,
        nextActive.column,
      )
    }),
  )
  editor.pushUndoStop()
  editor.focus()

  return true
}

export function toggleCurrentLineCapitalization(
  editor: monaco.editor.IStandaloneCodeEditor,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return false
  }

  const lineNumbers = [
    ...new Set(selections.map((selection) => selection.positionLineNumber)),
  ]
  const edits: OffsetTextEdit[] = []

  for (const lineNumber of lineNumbers) {
    const lineText = model.getLineContent(lineNumber)
    const match = findFirstAlphabeticalCharacter(lineText)

    if (!match) {
      continue
    }

    const toggledCharacter = toggleCharacterCase(match.character)

    if (toggledCharacter === match.character) {
      continue
    }

    const startColumn = match.offset + 1
    const endColumn = startColumn + match.character.length
    const startOffset = model.getOffsetAt({ lineNumber, column: startColumn })
    const endOffset = model.getOffsetAt({ lineNumber, column: endColumn })

    edits.push({
      endOffset,
      mapOffsetWithin: (relativeOffset) =>
        relativeOffset === 0 ? 0 : toggledCharacter.length,
      range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
      startOffset,
      text: toggledCharacter,
    })
  }

  return applyTextEdits(editor, edits)
}

export function transformSelectedTextCase(
  editor: monaco.editor.IStandaloneCodeEditor,
  textCase: TextCase,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return false
  }

  const selectedRanges = selections
    .filter((selection) => !selection.isEmpty())
    .map((selection) => ({
      endOffset: model.getOffsetAt(selection.getEndPosition()),
      startOffset: model.getOffsetAt(selection.getStartPosition()),
    }))
  const edits = mergeOffsetRanges(selectedRanges).flatMap((range) => {
    const originalText = model.getValue().slice(range.startOffset, range.endOffset)
    const transformedText = transformCase(originalText, textCase)

    if (originalText === transformedText) {
      return []
    }

    const startPosition = model.getPositionAt(range.startOffset)
    const endPosition = model.getPositionAt(range.endOffset)

    return [{
      ...range,
      mapOffsetWithin: (relativeOffset: number) =>
        transformCase(originalText.slice(0, relativeOffset), textCase).length,
      range: new monaco.Range(
        startPosition.lineNumber,
        startPosition.column,
        endPosition.lineNumber,
        endPosition.column,
      ),
      text: transformedText,
    }]
  })

  return applyTextEdits(editor, edits)
}
