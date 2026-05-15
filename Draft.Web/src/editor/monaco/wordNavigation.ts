import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

type WordNavigationCharacterKind = 'whitespace' | 'word' | 'symbol'

function getWordNavigationCharacterKind(value: string): WordNavigationCharacterKind {
  if (/\s/u.test(value)) {
    return 'whitespace'
  }

  if (/[\p{L}\p{N}_]/u.test(value)) {
    return 'word'
  }

  return 'symbol'
}

function getNextWordOffset(text: string, offset: number) {
  if (offset >= text.length) {
    return text.length
  }

  let nextOffset = offset
  const currentKind = getWordNavigationCharacterKind(text[nextOffset])

  if (currentKind === 'whitespace') {
    while (
      nextOffset < text.length &&
      getWordNavigationCharacterKind(text[nextOffset]) === 'whitespace'
    ) {
      nextOffset += 1
    }

    return nextOffset
  }

  while (
    nextOffset < text.length &&
    getWordNavigationCharacterKind(text[nextOffset]) === currentKind
  ) {
    nextOffset += 1
  }

  return nextOffset
}

function getPreviousWordOffset(text: string, offset: number) {
  if (offset <= 0) {
    return 0
  }

  let previousOffset = offset
  const previousKind = getWordNavigationCharacterKind(text[previousOffset - 1])

  if (previousKind === 'whitespace') {
    while (
      previousOffset > 0 &&
      getWordNavigationCharacterKind(text[previousOffset - 1]) === 'whitespace'
    ) {
      previousOffset -= 1
    }

    return previousOffset
  }

  while (
    previousOffset > 0 &&
    getWordNavigationCharacterKind(text[previousOffset - 1]) === previousKind
  ) {
    previousOffset -= 1
  }

  return previousOffset
}

export function moveSelectionsByWord(
  editor: monaco.editor.IStandaloneCodeEditor,
  direction: 'left' | 'right',
  select: boolean,
) {
  const model = editor.getModel()
  const selections = editor.getSelections()

  if (!model || !selections || selections.length === 0) {
    return
  }

  const text = model.getValue()
  const nextSelections = selections.map((selection) => {
    const activePosition = {
      lineNumber: selection.positionLineNumber,
      column: selection.positionColumn,
    }
    const activeOffset = model.getOffsetAt(activePosition)
    const nextOffset =
      direction === 'left'
        ? getPreviousWordOffset(text, activeOffset)
        : getNextWordOffset(text, activeOffset)
    const nextPosition = model.getPositionAt(nextOffset)

    if (!select) {
      return new monaco.Selection(
        nextPosition.lineNumber,
        nextPosition.column,
        nextPosition.lineNumber,
        nextPosition.column,
      )
    }

    return new monaco.Selection(
      selection.selectionStartLineNumber,
      selection.selectionStartColumn,
      nextPosition.lineNumber,
      nextPosition.column,
    )
  })

  editor.setSelections(nextSelections)
  editor.revealPositionInCenterIfOutsideViewport(nextSelections[0].getPosition())
}
