import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { DRAFT_CURRENT_LINE_DECORATION_CLASS } from '../../themes/editor/editorThemeTypes'

function getCurrentLineDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.editor.IModelDeltaDecoration[] {
  const selections = editor.getSelections()

  if (!selections || selections.length === 0) {
    return []
  }

  const lineNumbers = new Set<number>()
  const decorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const selection of selections) {
    const lineNumber = selection.positionLineNumber

    if (lineNumbers.has(lineNumber)) {
      continue
    }

    lineNumbers.add(lineNumber)
    decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        className: DRAFT_CURRENT_LINE_DECORATION_CLASS,
        isWholeLine: true,
      },
    })
  }

  return decorations
}

export function syncCurrentLineDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
  decorations: monaco.editor.IEditorDecorationsCollection,
  enabled: boolean,
) {
  if (!enabled) {
    decorations.set([])
    return
  }

  decorations.set(getCurrentLineDecorations(editor))
}
