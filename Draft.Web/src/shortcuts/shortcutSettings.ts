export const shortcutActionIds = {
  appOpen: 'app.open',
  appSave: 'app.save',
  editorContinueMarkdownBlock: 'editor.continueMarkdownBlock',
  editorDuplicateLine: 'editor.duplicateLine',
  editorExtendSelectionWordLeft: 'editor.extendSelectionWordLeft',
  editorExtendSelectionWordRight: 'editor.extendSelectionWordRight',
  editorAddSelectionRange: 'editor.addSelectionRange',
  editorIndentListItem: 'editor.indentListItem',
  editorMoveCursorWordLeft: 'editor.moveCursorWordLeft',
  editorMoveCursorWordRight: 'editor.moveCursorWordRight',
  editorMoveLineDown: 'editor.moveLineDown',
  editorMoveLineUp: 'editor.moveLineUp',
  editorRedo: 'editor.redo',
  editorUndo: 'editor.undo',
  quickInsertKeepOpen: 'quickInsert.keepOpen',
  quickInsertOpenMenu: 'quickInsert.openMenu',
  toolbarBold: 'toolbar.bold',
  toolbarClose: 'toolbar.close',
  toolbarComment: 'toolbar.comment',
  toolbarConfirmEdit: 'toolbar.confirmEdit',
  toolbarEditPreviewSelection: 'toolbar.editPreviewSelection',
  toolbarHeading1: 'toolbar.heading1',
  toolbarHeading2: 'toolbar.heading2',
  toolbarHeading3: 'toolbar.heading3',
  toolbarHeading4: 'toolbar.heading4',
  toolbarHeading5: 'toolbar.heading5',
  toolbarHeading6: 'toolbar.heading6',
  toolbarHighlight: 'toolbar.highlight',
  toolbarImage: 'toolbar.image',
  toolbarInlineCode: 'toolbar.inlineCode',
  toolbarItalic: 'toolbar.italic',
  toolbarLink: 'toolbar.link',
  toolbarNormalText: 'toolbar.normalText',
  toolbarSpoiler: 'toolbar.spoiler',
  toolbarStrikethrough: 'toolbar.strikethrough',
  toolbarUnderline: 'toolbar.underline',
} as const

export type ShortcutActionId =
  (typeof shortcutActionIds)[keyof typeof shortcutActionIds]

export type ShortcutBindings = Record<string, string>

export const defaultShortcutBindings: ShortcutBindings = {
  [shortcutActionIds.appSave]: 'Ctrl + S',
  [shortcutActionIds.appOpen]: 'Ctrl + O',
  [shortcutActionIds.editorUndo]: 'Ctrl + Z',
  [shortcutActionIds.editorRedo]: 'Ctrl + Shift + Z',
  [shortcutActionIds.editorDuplicateLine]: 'Ctrl + D',
  [shortcutActionIds.editorMoveLineUp]: 'Ctrl + Shift + Up',
  [shortcutActionIds.editorMoveLineDown]: 'Ctrl + Shift + Down',
  [shortcutActionIds.editorMoveCursorWordLeft]: 'Ctrl + Left',
  [shortcutActionIds.editorMoveCursorWordRight]: 'Ctrl + Right',
  [shortcutActionIds.editorExtendSelectionWordLeft]: 'Ctrl + Shift + Left',
  [shortcutActionIds.editorExtendSelectionWordRight]: 'Ctrl + Shift + Right',
  [shortcutActionIds.editorAddSelectionRange]: 'Ctrl + Shift + Alt + Mouse Drag',
  [shortcutActionIds.editorContinueMarkdownBlock]: 'Enter',
  [shortcutActionIds.editorIndentListItem]: 'Tab',
  [shortcutActionIds.toolbarBold]: 'Ctrl + B',
  [shortcutActionIds.toolbarItalic]: 'Ctrl + I',
  [shortcutActionIds.toolbarUnderline]: 'Ctrl + U',
  [shortcutActionIds.toolbarInlineCode]: 'Ctrl + E',
  [shortcutActionIds.toolbarSpoiler]: 'Ctrl + Shift + S',
  [shortcutActionIds.toolbarHighlight]: 'Ctrl + Shift + H',
  [shortcutActionIds.toolbarComment]: 'Ctrl + /',
  [shortcutActionIds.toolbarStrikethrough]: 'Ctrl + Shift + X',
  [shortcutActionIds.toolbarLink]: 'Ctrl + K',
  [shortcutActionIds.toolbarImage]: 'Ctrl + Alt + I',
  [shortcutActionIds.toolbarNormalText]: 'Ctrl + N',
  [shortcutActionIds.toolbarHeading1]: 'Ctrl + 1',
  [shortcutActionIds.toolbarHeading2]: 'Ctrl + 2',
  [shortcutActionIds.toolbarHeading3]: 'Ctrl + 3',
  [shortcutActionIds.toolbarHeading4]: 'Ctrl + 4',
  [shortcutActionIds.toolbarHeading5]: 'Ctrl + 5',
  [shortcutActionIds.toolbarHeading6]: 'Ctrl + 6',
  [shortcutActionIds.toolbarEditPreviewSelection]: 'Ctrl + Shift + E',
  [shortcutActionIds.toolbarConfirmEdit]: 'Enter',
  [shortcutActionIds.toolbarClose]: 'Esc',
  [shortcutActionIds.quickInsertOpenMenu]: 'Ctrl + Space',
  [shortcutActionIds.quickInsertKeepOpen]: 'Shift + Left Click',
}

export const configurableShortcutActionIds = Object.keys(
  defaultShortcutBindings,
) as ShortcutActionId[]

const shortcutModifierNames = new Set([
  'alt',
  'cmd',
  'command',
  'control',
  'ctrl',
  'option',
  'shift',
  'win',
  'windows',
])

function splitShortcutParts(shortcut: string) {
  const trimmedShortcut = shortcut.trim()

  if (trimmedShortcut.includes(' + ')) {
    return trimmedShortcut
      .split(' + ')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return trimmedShortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function isValidShortcutBinding(shortcut: string) {
  return splitShortcutParts(shortcut).some(
    (part) => !shortcutModifierNames.has(part.toLowerCase()),
  )
}

export function normalizeShortcutBindings(value: unknown): ShortcutBindings {
  const normalized = { ...defaultShortcutBindings }

  if (!value || typeof value !== 'object') {
    return normalized
  }

  for (const [actionId, shortcut] of Object.entries(value)) {
    if (
      actionId in defaultShortcutBindings &&
      typeof shortcut === 'string' &&
      isValidShortcutBinding(shortcut)
    ) {
      normalized[actionId] = shortcut.trim()
    }
  }

  return normalized
}

export function getShortcutBinding(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  return bindings[actionId] ?? defaultShortcutBindings[actionId] ?? ''
}

export function formatShortcutForDisplay(shortcut: string) {
  return shortcut.trim().toUpperCase()
}
