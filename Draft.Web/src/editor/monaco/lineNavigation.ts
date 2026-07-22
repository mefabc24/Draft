import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

export function moveCursorToNextLineStart(
  editor: monaco.editor.IStandaloneCodeEditor,
) {
  editor.trigger('draft.shortcut', 'cursorDown', null)
  editor.trigger('draft.shortcut', 'cursorHome', null)
}
