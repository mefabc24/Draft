import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js'

const MONACO_WORD_NAVIGATION_SOURCE = 'draft.editor.wordNavigation'

export function moveSelectionsByWord(
  editor: monaco.editor.IStandaloneCodeEditor,
  direction: 'left' | 'right',
  select: boolean,
) {
  const commandId =
    direction === 'left'
      ? select
        ? 'cursorWordLeftSelect'
        : 'cursorWordLeft'
      : select
        ? 'cursorWordEndRightSelect'
        : 'cursorWordEndRight'

  editor.trigger(MONACO_WORD_NAVIGATION_SOURCE, commandId, null)
}
