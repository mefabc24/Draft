export const shortcutActionIds = {
  appOpen: 'app.open',
  appSave: 'app.save',
  editorContinueMarkdownBlock: 'editor.continueMarkdownBlock',
  editorDuplicateLine: 'editor.duplicateLine',
  editorLowercaseSelection: 'editor.lowercaseSelection',
  editorExtendSelectionWordLeft: 'editor.extendSelectionWordLeft',
  editorExtendSelectionWordRight: 'editor.extendSelectionWordRight',
  editorAddSelectionRange: 'editor.addSelectionRange',
  editorIndentListItem: 'editor.indentListItem',
  editorMoveCursorWordLeft: 'editor.moveCursorWordLeft',
  editorMoveCursorWordRight: 'editor.moveCursorWordRight',
  editorMoveLineDown: 'editor.moveLineDown',
  editorMoveLineUp: 'editor.moveLineUp',
  editorRedo: 'editor.redo',
  editorToggleLineCapitalization: 'editor.toggleLineCapitalization',
  editorUndo: 'editor.undo',
  editorUppercaseSelection: 'editor.uppercaseSelection',
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

export type ShortcutFixedMouseGesture =
  | 'left-click'
  | 'left-drag-or-double-click'

export const fixedMouseGestureByShortcutActionId: Partial<
  Record<ShortcutActionId, ShortcutFixedMouseGesture>
> = {
  [shortcutActionIds.editorAddSelectionRange]: 'left-drag-or-double-click',
  [shortcutActionIds.quickInsertKeepOpen]: 'left-click',
}

export const fixedMouseGestureShortcutActionIds = Object.keys(
  fixedMouseGestureByShortcutActionId,
) as ShortcutActionId[]

export const defaultShortcutBindings: ShortcutBindings = {
  [shortcutActionIds.appSave]: 'Ctrl + S',
  [shortcutActionIds.appOpen]: 'Ctrl + O',
  [shortcutActionIds.editorUndo]: 'Ctrl + Z',
  [shortcutActionIds.editorRedo]: 'Ctrl + Shift + Z',
  [shortcutActionIds.editorDuplicateLine]: 'Ctrl + D',
  [shortcutActionIds.editorToggleLineCapitalization]: 'Ctrl + Alt + U',
  [shortcutActionIds.editorUppercaseSelection]: 'Ctrl + Shift + U',
  [shortcutActionIds.editorLowercaseSelection]: 'Ctrl + Shift + L',
  [shortcutActionIds.editorMoveLineUp]: 'Ctrl + Shift + Up',
  [shortcutActionIds.editorMoveLineDown]: 'Ctrl + Shift + Down',
  [shortcutActionIds.editorMoveCursorWordLeft]: 'Ctrl + Left',
  [shortcutActionIds.editorMoveCursorWordRight]: 'Ctrl + Right',
  [shortcutActionIds.editorExtendSelectionWordLeft]: 'Ctrl + Shift + Left',
  [shortcutActionIds.editorExtendSelectionWordRight]: 'Ctrl + Shift + Right',
  [shortcutActionIds.editorAddSelectionRange]: 'Ctrl + Shift + Alt',
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
  [shortcutActionIds.quickInsertKeepOpen]: 'Shift',
}

export const configurableShortcutActionIds = Object.keys(
  defaultShortcutBindings,
) as ShortcutActionId[]

type ShortcutModifierName = 'Alt' | 'Ctrl' | 'Shift' | 'Win'

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
    (part) => normalizeModifierName(part) === null,
  )
}

function normalizeModifierName(part: string): ShortcutModifierName | null {
  switch (part.trim().toLowerCase()) {
    case 'cmd':
    case 'command':
    case 'control':
    case 'ctrl':
      return 'Ctrl'
    case 'shift':
      return 'Shift'
    case 'alt':
    case 'option':
      return 'Alt'
    case 'win':
    case 'windows':
      return 'Win'
    default:
      return null
  }
}

function isLegacyMouseGesturePart(part: string) {
  const normalizedPart = part.toLowerCase().replace(/[^a-z0-9]/gu, '')

  return [
    'click',
    'doubleclick',
    'leftclick',
    'mouseclick',
    'mousedrag',
  ].includes(normalizedPart)
}

function normalizeFixedGestureKeyboardBinding(shortcut: string) {
  const modifiers = new Set<ShortcutModifierName>()
  const keys: string[] = []

  for (const part of splitShortcutParts(shortcut)) {
    if (isLegacyMouseGesturePart(part)) {
      continue
    }

    const modifier = normalizeModifierName(part)

    if (modifier !== null) {
      modifiers.add(modifier)
      continue
    }

    keys.push(part.trim())
  }

  const modifierOrder: ShortcutModifierName[] = ['Ctrl', 'Shift', 'Alt', 'Win']
  const orderedModifiers = modifierOrder.filter((modifier) =>
    modifiers.has(modifier),
  )
  const keyboardParts = [...orderedModifiers, ...keys]

  return keyboardParts.length > 0
    ? keyboardParts.join(' + ')
    : null
}

function normalizeShortcutBinding(
  actionId: ShortcutActionId,
  shortcut: string,
) {
  if (actionId in fixedMouseGestureByShortcutActionId) {
    return normalizeFixedGestureKeyboardBinding(shortcut)
  }

  return isValidShortcutBinding(shortcut) ? shortcut.trim() : null
}

export function normalizeShortcutBindings(value: unknown): ShortcutBindings {
  const normalized = { ...defaultShortcutBindings }

  if (!value || typeof value !== 'object') {
    return normalized
  }

  for (const [actionId, shortcut] of Object.entries(value)) {
    if (
      actionId in defaultShortcutBindings &&
      typeof shortcut === 'string'
    ) {
      const normalizedShortcut = normalizeShortcutBinding(
        actionId as ShortcutActionId,
        shortcut,
      )

      if (normalizedShortcut) {
        normalized[actionId] = normalizedShortcut
      }
    }
  }

  return normalized
}

export function getShortcutBinding(
  bindings: ShortcutBindings,
  actionId: ShortcutActionId,
) {
  const shortcut = bindings[actionId]
  const normalizedShortcut = shortcut
    ? normalizeShortcutBinding(actionId, shortcut)
    : null

  return normalizedShortcut ?? defaultShortcutBindings[actionId] ?? ''
}

export function formatShortcutForDisplay(shortcut: string) {
  return shortcut.trim().toUpperCase()
}
