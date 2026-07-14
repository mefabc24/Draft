import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

function isWordNavigationCharacter(value: string) {
  return /[\p{L}\p{M}\p{N}_]/u.test(value)
}

function getNextWordOffset(text: string, offset: number) {
  if (offset >= text.length) {
    return text.length
  }

  let nextOffset = offset

  while (
    nextOffset < text.length &&
    !isWordNavigationCharacter(text[nextOffset])
  ) {
    nextOffset += 1
  }

  while (
    nextOffset < text.length &&
    isWordNavigationCharacter(text[nextOffset])
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

  while (
    previousOffset > 0 &&
    !isWordNavigationCharacter(text[previousOffset - 1])
  ) {
    previousOffset -= 1
  }

  while (
    previousOffset > 0 &&
    isWordNavigationCharacter(text[previousOffset - 1])
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
