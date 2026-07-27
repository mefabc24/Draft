import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type {
  ShortcutActionId,
  ShortcutBindings,
} from './shortcutSettings'
import {
  eventMatchesShortcutAction,
  getMonacoShortcutKeybinding,
} from './shortcutMatching'

export type NativeMonacoShortcutCommand = {
  actionId: ShortcutActionId
  commandId: string
}

export function registerNativeMonacoShortcutFallback(
  editor: monaco.editor.IStandaloneCodeEditor,
  shortcutBindings: ShortcutBindings,
  commands: readonly NativeMonacoShortcutCommand[],
) {
  const nativeCommands = commands.filter(
    ({ actionId }) =>
      getMonacoShortcutKeybinding(shortcutBindings, actionId) === null,
  )

  return editor.onKeyDown((event) => {
    const command = nativeCommands.find(({ actionId }) =>
      eventMatchesShortcutAction(
        event.browserEvent,
        shortcutBindings,
        actionId,
      ),
    )

    if (!command) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    editor.trigger('draft.nativeShortcut', command.commandId, null)
  })
}
